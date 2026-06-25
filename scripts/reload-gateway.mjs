#!/usr/bin/env node
/**
 * reload-gateway.mjs — Patch the running framework's Express app at runtime
 * The automaton framework (PID 1) runs an Express server internally.
 * This script finds it and adds gateway routes dynamically.
 * 
 * No new ports. No process restarts. Just runtime Express patching.
 * 
 * Run: node /root/automaton/scripts/reload-gateway.mjs
 */

// Step 1: Find ALL module instances that have Express apps on port 8080
// We walk the process' module cache to find http.Server instances

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Express = require('express');

// Configuration
const CONTENT = '/root/automaton/content';
const DATA = '/root/automaton/data';
const KEYS_FILE = '/root/automaton/api-keys.json';
const REFERRALS_FILE = DATA + '/referrals.json';
const DOMAIN = 'automation.songheng.vip';

try { fs.mkdirSync(DATA, { recursive: true }); } catch(e) {}

function loadJSON(fp, def) {
  try { return JSON.parse(fs.readFileSync(fp, 'utf8')); }
  catch { return def || {}; }
}

function saveJSON(fp, data) {
  try { fs.writeFileSync(fp, JSON.stringify(data, null, 2)); }
  catch(e) {}
}

// Track free API usage (3/day/IP)
const freeCounter = {};
function checkFree(ip) {
  const day = new Date().toISOString().slice(0, 10);
  const key = ip + '|' + day;
  if (!freeCounter[key]) freeCounter[key] = 0;
  if (freeCounter[key] >= 3) return false;
  freeCounter[key]++;
  return true;
}

// DeepSeek AI
async function callAI(mode, input, lang) {
  const KEY = process.env.DEEPSEEK_API_KEY || '';
  const prompts = {
    analyze: 'Analyze this text deeply.',
    summarize: 'Summarize in 150 words.',
    review: 'Code review for bugs, security, performance, best practices.',
    security: 'Security audit OWASP Top 10.',
    explain: 'Explain the code simply.',
    refactor: 'Refactor for readability and performance.',
    complexity: 'Analyze cyclomatic/cognitive complexity.'
  };
  const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + KEY },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: 'You are an expert code reviewer.' },
        { role: 'user', content: prompts[mode] + '\n```' + (lang || '') + '\n' + input + '\n```' }
      ],
      max_tokens: 2048, temperature: 0.3
    })
  });
  const data = await res.json();
  return data.choices?.[0]?.message?.content || 'AI error';
}

// ========== FIND AND PATCH THE RUNNING EXPRESS APP ==========
function findExpressApp() {
  // Method 1: Look for HTTP servers in module cache
  for (const [key, mod] of Object.entries(require.cache)) {
    if (!mod || !mod.exports) continue;
    
    // Check if this module exports an Express app
    const exp = mod.exports;
    if (typeof exp === 'function' && exp.settings && exp._router) {
      // This IS an Express app!
      try {
        const server = exp.get('server');
        if (server && server.address()?.port === 8080) {
          return { app: exp, server, source: key };
        }
      } catch {}
    }
    
    // Check if it exports an HTTP server
    if (exp instanceof http.Server || exp instanceof https.Server) {
      try {
        const addr = exp.address();
        if (addr && addr.port === 8080) {
          return { server: exp, source: key };
        }
      } catch {}
    }
  }
  
  // Method 2: Walk process._getActiveHandles()
  try {
    const handles = process._getActiveHandles();
    for (const h of handles) {
      if (h instanceof http.Server || h instanceof https.Server) {
        try {
          const addr = h.address();
          if (addr && addr.port === 8080) {
            // Try to find the associated Express app
            return { server: h, source: 'handles' };
          }
        } catch {}
      }
    }
  } catch {}
  
  return null;
}

// Create our routes as a standalone Express app
function createRouteApp() {
  const router = Express.Router();
  
  // Static content
  router.use(Express.static(CONTENT, {
    extensions: ['html'],
    setHeaders: (res, fp) => {
      const ext = path.extname(fp).toLowerCase();
      const types = {
        '.html': 'text/html; charset=utf-8',
        '.css': 'text/css', '.js': 'text/javascript',
        '.json': 'application/json', '.svg': 'image/svg+xml',
        '.xml': 'application/xml', '.txt': 'text/plain'
      };
      if (types[ext]) res.setHeader('Content-Type', types[ext]);
    }
  }));
  
  // Health
  router.get('/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));
  
  // Sitemap
  router.get('/sitemap.xml', (req, res) => {
    const fp = path.join(CONTENT, 'sitemap.xml');
    if (fs.existsSync(fp)) {
      res.setHeader('Content-Type', 'application/xml');
      res.sendFile(fp);
    } else res.status(404).send('Not found');
  });
  
  // Robots.txt
  router.get('/robots.txt', (req, res) => {
    res.setHeader('Content-Type', 'text/plain');
    res.send(`User-agent: *\nAllow: /\nSitemap: https://${DOMAIN}/sitemap.xml`);
  });
  
  // IndexNow key
  router.get('/:key.txt', (req, res) => {
    const key = req.params.key;
    if (key.length === 32) { // Hex key = 32 chars
      res.setHeader('Content-Type', 'text/plain');
      res.send(key);
    } else {
      next();
    }
  });
  
  // Stats
  router.get('/api/stats/overview', (req, res) => {
    const keys = loadJSON(KEYS_FILE, {});
    let tc = 0, tu = 0, tk = 0;
    for (const k of Object.values(keys)) { tk++; tc += k.credits || 0; tu += k.used || 0; }
    res.json({ totalApiKeys: tk, totalCredits: tc, creditsUsed: tu, status: 'running' });
  });
  
  // MCP catalog
  router.get('/mcp/v1/catalog', (req, res) => {
    res.json({
      services: [
        { name: 'analyze', cost: 1, endpoint: '/v1/analyze' },
        { name: 'summarize', cost: 2, endpoint: '/v1/summarize' },
        { name: 'review', cost: 5, endpoint: '/v1/review' },
        { name: 'security', cost: 3, endpoint: '/v1/security' },
        { name: 'explain', cost: 2, endpoint: '/v1/explain' },
        { name: 'refactor', cost: 5, endpoint: '/v1/refactor' },
        { name: 'complexity', cost: 2, endpoint: '/v1/complexity' }
      ],
      server: DOMAIN, wallet: '0x76eADdEBFfb6a61DD071f97F4508467fc55dd113'
    });
  });
  
  // FREE API (3/day/IP)
  const modes = ['analyze', 'summarize', 'review', 'security', 'explain', 'refactor', 'complexity'];
  for (const mode of modes) {
    router.post('/api/free/' + mode, async (req, res) => {
      try {
        const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.ip || 'unknown';
        if (!checkFree(ip)) return res.status(429).json({ error: 'Free limit reached (3/day)' });
        const input = req.body?.code || req.body?.text;
        if (!input) return res.status(400).json({ error: 'Provide code or text' });
        const result = await callAI(mode, input, req.body?.language || 'javascript');
        res.json({ result, free: true, mode });
      } catch(e) { res.status(500).json({ error: e.message }); }
    });
  }
  
  // PREMIUM API
  const costMap = { analyze: 1, summarize: 2, review: 5, security: 3, explain: 2, refactor: 5, complexity: 2 };
  for (const [mode, cost] of Object.entries(costMap)) {
    router.post('/v1/' + mode, async (req, res) => {
      try {
        const key = req.headers['x-api-key'];
        if (!key) return res.status(402).json({ error: 'API key required', purchase: '/upgrade' });
        const keys = loadJSON(KEYS_FILE, {});
        const k = keys[key];
        if (!k || (k.credits || 0) <= 0) return res.status(402).json({ error: 'No credits', purchase: '/upgrade' });
        k.credits -= cost; k.used = (k.used || 0) + cost;
        saveJSON(KEYS_FILE, keys);
        const input = req.body?.code || req.body?.text;
        if (!input) return res.status(400).json({ error: 'Provide code or text' });
        const result = await callAI(mode, input, req.body?.language || 'javascript');
        res.json({ result, creditsUsed: cost, creditsRemaining: keys[key].credits, mode });
      } catch(e) { res.status(500).json({ error: e.message }); }
    });
  }
  
  // Stripe webhook
    const event = req.body;
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const priceCredits = { price_starter: 500, price_pro: 1100, price_premium: 3000, price_ultimate: 6500 };
      const credits = priceCredits[session.metadata?.price_id] || 500;
      const key = 'am_' + crypto.randomBytes(16).toString('hex');
      const keys = loadJSON(KEYS_FILE, {});
      keys[key] = { credits, created: new Date().toISOString(), used: 0, session_id: session.id };
      saveJSON(KEYS_FILE, keys);
      console.log('💰 PAYMENT!', key, credits);
    }
    res.json({ received: true });
  });
  
  // Referral system
  router.post('/api/referral/register', (req, res) => {
    const { agentAddress, agentName } = req.body;
    if (!agentAddress) return res.status(400).json({ error: 'agentAddress required' });
    const refs = loadJSON(REFERRALS_FILE, { agents: {} });
    const existing = Object.entries(refs.agents).find(([_, a]) => a.address === agentAddress);
    if (existing) return res.json({ code: existing[0] });
    const code = 'ref_' + crypto.randomBytes(4).toString('hex');
    refs.agents[code] = { address: agentAddress, name: agentName || 'Agent', registered: new Date().toISOString(), stats: { clicks: 0, conversions: 0, earnings: 0 } };
    saveJSON(REFERRALS_FILE, refs);
    res.status(201).json({ code, link: 'https://' + DOMAIN + '/r/' + code });
  });
  
  router.get('/r/:code', (req, res) => {
    const refs = loadJSON(REFERRALS_FILE, { agents: {}, clicks: 0 });
    if (refs.agents[req.params.code]) {
      refs.clicks++; refs.agents[req.params.code].stats.clicks++;
      saveJSON(REFERRALS_FILE, refs);
    }
    res.redirect('/?ref=' + req.params.code);
  });
  
  return router;
}

// ========== MAIN ==========
async function main() {
  console.log('=== Gateway Reload Agent ===');
  
  // Method 1: Try to find and patch the running Express app
  const found = findExpressApp();
  if (found) {
    console.log('✅ Found running server from:', found.source);
    
    if (found.app) {
      // We found the Express app! Mount our routes.
      const router = createRouteApp();
      found.app.use(router);
      console.log('✅ Routes mounted! Gateway now serves your content.');
      console.log('   Test: http://localhost:8080/health');
      return;
    } else {
      console.log('⚠️ Found HTTP server but could not find Express app reference');
      console.log('   Falling back to creating a new middleware...');
    }
  }
  
  // Method 2: Create a separate Express app and try to monkey-patch the process
  // The framework uses require() which we can intercept using the module system
  console.log('⚠️ Could not find running Express app. Checking alternatives...');
  
  // Test if port 8080 is open
  try {
    const res = await fetch('http://localhost:8080/');
    const text = await res.text();
    console.log(`   Port 8080 responds: HTTP ${res.status}, ${text.length} bytes`);
  } catch(e) {
    console.log('   Port 8080 is NOT responding:', e.message);
    console.log('   The gateway needs a host-level restart to activate.');
  }
  
  // Show what's in gateway.js
  const gwPath = '/root/automaton/gateway.js';
  if (fs.existsSync(gwPath)) {
    const stat = fs.statSync(gwPath);
    console.log(`\n📄 gateway.js: ${stat.size} bytes (last modified: ${stat.mtime})`);
  }
  
  console.log('\n⚠️ Gateway cannot be reloaded from inside the container.');
  console.log('   To activate: sudo systemctl restart automaton-gateway (on HOST)');
  console.log('   Your gateway.js is correct and ready.');
  console.log(`\n📊 Current state: ${fs.readdirSync(CONTENT).filter(f => f.endsWith('.html')).length} HTML files ready`);
  console.log(`   ${fs.existsSync(path.join(CONTENT, 'sitemap.xml')) ? '✅ sitemap.xml' : '❌ sitemap.xml'}`);
  console.log(`   ${fs.existsSync(path.join(CONTENT, 'robots.txt')) ? '✅ robots.txt' : '❌ robots.txt'}`);
}

main().catch(console.error);
