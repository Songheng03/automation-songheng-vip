#!/usr/bin/env node
/**
 * production-gateway.cjs — my-automaton FULL Gateway
 * All routes: static content, free API (3/day), premium API (credit-based),
 * Stripe checkout + webhook, referral system, badge generation, GitHub webhook,
 * README generation.
 *
 * DEPLOYMENT (run on HOST):
 *   sudo cp /root/automaton/production-gateway.js /root/automaton/gateway.cjs
 *   sudo systemctl restart automaton-gateway
 *
 * TEST:
 *   curl https://automation.songheng.vip/health
 *   curl -X POST https://automation.songheng.vip/free/analyze -H 'Content-Type: application/json' -d '{"text":"hello"}'
 *   curl -X POST https://automation.songheng.vip/api/generate-readme -H 'Content-Type: application/json' -d '{"code":"console.log(\"hello\")"}'
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const url = require('url');

// ── Configuration ──────────────────────────────────────────
const { handleLoremIpsum } = require("/root/services/lorem-ipsum.js");
const PORT = 8080;
const CONTENT = '/root/automaton/content';
const API_KEYS = '/root/automaton/api-keys.json';
const DATA_DIR = '/root/automaton/data';
const DEEPSEEK_ENDPOINT = process.env.DEEPSEEK_ENDPOINT || 'https://token-plan.cn-beijing.maas.aliyuncs.com/compatible-mode/v1/chat/completions';
const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY || (() => { try { return JSON.parse(fs.readFileSync('/root/.automaton/automaton.json','utf-8')).deepseekApiKey; } catch { return ''; }})();

// Price tiers (credits per purchase)
const PRICES = {
  'price_starter': { name: 'Starter', credits: 500, price: 5 },
  'price_advanced': { name: 'Pro', credits: 1100, price: 10 },
  'price_pro': { name: 'Business', credits: 3000, price: 25 },
  'price_ultimate': { name: 'Enterprise', credits: 6500, price: 50 },
};

// Credit costs per endpoint
const CREDIT_COST = { analyze: 1, summarize: 2, review: 5, security: 3, explain: 2, refactor: 5, complexity: 2 };

// Rate limiting (in-memory) — shared across free endpoints and generate-readme
const FREE_LIMIT = new Map(); // ip -> { date, count }

// ── Helpers ────────────────────────────────────────────────
const MIME = { '.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.json':'application/json','.xml':'application/xml','.txt':'text/plain','.md':'text/markdown','.ico':'image/x-icon' };

function mime(p) { return MIME[path.extname(p).toLowerCase()] || 'application/octet-stream'; }

function readJSON(p, def={}) {
  try { return JSON.parse(fs.readFileSync(p, 'utf-8')); } catch { return def; }
}

function writeJSON(p, data) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
}

function log(msg) {
  const l = `[${new Date().toISOString()}] ${msg}`;
  console.log(l);
  try { fs.mkdirSync(DATA_DIR, { recursive: true }); fs.appendFileSync(path.join(DATA_DIR,'gateway.log'), l+'\n'); } catch {}
}

function ipFromReq(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || '0.0.0.0';
}

function generateKey() {
  return 'am_' + crypto.randomBytes(24).toString('base64url');
}

function getCredits(key) {
  const db = readJSON(API_KEYS);
  return db[key] || null;
}

function useCredits(key, cost) {
  const db = readJSON(API_KEYS);
  if (!db[key]) return false;
  if (db[key].credits < cost) return false;
  db[key].credits -= cost;
  db[key].used = (db[key].used || 0) + 1;
  db[key].last_used = new Date().toISOString();
  writeJSON(API_KEYS, db);
  return true;
}

function addCredits(priceId, txHash) {
  const tier = PRICES[priceId];
  if (!tier) return null;
  const key = generateKey();
  const db = readJSON(API_KEYS);
  db[key] = { credits: tier.credits, created: new Date().toISOString(), used: 0, price_id: priceId, tx_hash: txHash || '' };
  writeJSON(API_KEYS, db);
  return key;
}

// Free rate limit check (reused by generate-readme)
function checkFreeLimit(ip) {
  const today = new Date().toISOString().split('T')[0];
  const entry = FREE_LIMIT.get(ip);
  if (!entry || entry.date !== today) {
    FREE_LIMIT.set(ip, { date: today, count: 0 });
    return true;
  }
  if (entry.count >= 3) return false;
  return true;
}

function incrementFree(ip) {
  const today = new Date().toISOString().split('T')[0];
  const entry = FREE_LIMIT.get(ip);
  if (!entry || entry.date !== today) FREE_LIMIT.set(ip, { date: today, count: 1 });
  else entry.count++;
}

// DeepSeek call
async function callAI(messages) {
  if (!DEEPSEEK_KEY) return { error: 'AI not configured' };
  try {
    const resp = await fetch(DEEPSEEK_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${DEEPSEEK_KEY}` },
      body: JSON.stringify({ model: 'kimi-k2.7-code', messages, max_tokens: 2048, temperature: 0.3 })
    });
    const data = await resp.json();
    return data.choices?.[0]?.message?.content || JSON.stringify(data);
  } catch (e) {
    return { error: e.message };
  }
}

// ── Route handlers ────────────────────────────────────────

// Static content
async function serveStatic(req, res) {
  let p = url.parse(req.url).pathname;
  if (p === '/' || p === '') p = '/index.html';
  const filePath = path.join(CONTENT, p);
  
  // Security: prevent directory traversal
  if (!filePath.startsWith(CONTENT)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }
  
  try {
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      res.writeHead(404); res.end('Not found'); return;
    }
    const content = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': mime(filePath), 'Cache-Control': 'public, max-age=3600' });
    res.end(content);
  } catch (e) {
    res.writeHead(500); res.end('Error');
  }
}

// Health
async function handleHealth(req, res) {
  const data = {
    status: 'ok', time: new Date().toISOString(), uptime: process.uptime(),
    deepseek: !!DEEPSEEK_KEY, free_today: FREE_LIMIT.size
  };
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

// Free endpoints (3/day/IP)
async function handleFree(req, res) {
  const ip = ipFromReq(req);
  const mode = url.parse(req.url).pathname.split('/').pop(); // analyze, review, etc.
  
  if (!checkFreeLimit(ip)) {
    res.writeHead(429, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Free limit reached (3/day). Buy credits at /upgrade.html', upgrade: true }));
    return;
  }
  
  let body = '';
  req.on('data', c => body += c);
  req.on('end', async () => {
    try {
      const input = JSON.parse(body);
      const prompt = buildPrompt(mode, input);
      const result = await callAI([{ role: 'user', content: prompt }]);
      incrementFree(ip);
      res.writeHead(200, { 'Content-Type': 'application/json', 'X-Free-Remaining': 2 - (FREE_LIMIT.get(ip)?.count || 0) });
      res.end(JSON.stringify({ result, mode, free_remaining: 2 - (FREE_LIMIT.get(ip)?.count || 0) }));
    } catch (e) {
      res.writeHead(400); res.end(JSON.stringify({ error: 'Invalid request: ' + e.message }));
    }
  });
}

function buildPrompt(mode, input) {
  const code = input.code || input.text || '';
  const lang = input.language || input.lang || '';
  const prompts = {
    analyze: `Analyze this text deeply. Provide insights, themes, and key points:\n\n${code}`,
    summarize: `Summarize this text concisely:\n\n${code}`,
    review: `Code review the following ${lang} code. Check for bugs, security issues, style problems, and suggest improvements:\n\n${code}`,
    security: `Security audit this ${lang} code. Check for OWASP Top 10, injections, secrets, and vulnerabilities:\n\n${code}`,
    explain: `Explain this ${lang} code in simple terms:\n\n${code}`,
    refactor: `Suggest refactoring improvements for this ${lang} code. Show before/after:\n\n${code}`,
    complexity: `Analyze the complexity of this ${lang} code. Calculate cyclomatic complexity, nesting depth, and suggest simplifications:\n\n${code}`
  };
  return prompts[mode] || `Process this: ${code}`;
}

// Premium endpoints (credit-based)
async function handlePremium(req, res) {
  const mode = url.parse(req.url).pathname.split('/').pop();
  const cost = CREDIT_COST[mode] || 1;
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Missing X-API-Key header. Get one at /upgrade.html' }));
    return;
  }
  
  const keyData = getCredits(apiKey);
  if (!keyData) {
    res.writeHead(401); res.end(JSON.stringify({ error: 'Invalid API key' }));
    return;
  }
  
  if (keyData.credits < cost) {
    res.writeHead(402); res.end(JSON.stringify({ error: 'Insufficient credits', credits: keyData.credits, cost, upgrade: '/upgrade.html' }));
    return;
  }
  
  let body = '';
  req.on('data', c => body += c);
  req.on('end', async () => {
    try {
      const input = JSON.parse(body);
      const prompt = buildPrompt(mode, input);
      const result = await callAI([{ role: 'user', content: prompt }]);
      if (useCredits(apiKey, cost)) {
        const remaining = getCredits(apiKey)?.credits || 0;
        res.writeHead(200, { 'Content-Type': 'application/json', 'X-Credits-Remaining': remaining });
        res.end(JSON.stringify({ result, mode, credits_remaining: remaining, credits_used: cost }));
      } else {
        res.writeHead(402); res.end(JSON.stringify({ error: 'Credit deduction failed' }));
      }
    } catch (e) {
      res.writeHead(400); res.end(JSON.stringify({ error: 'Invalid request: ' + e.message }));
    }
  });
}

// README Generator (3/day/IP — reuses free-limit infrastructure)
async function handleGenerateReadme(req, res) {
  const ip = ipFromReq(req);

  // Rate limit check (reuses existing FREE_LIMIT infrastructure)
  if (!checkFreeLimit(ip)) {
    res.writeHead(429, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Free limit reached (3/day). Buy credits at /upgrade.html', upgrade: true }));
    return;
  }

  let body = '';
  req.on('data', c => body += c);
  req.on('end', async () => {
    try {
      const input = JSON.parse(body);
      
      if (!input.code || typeof input.code !== 'string') {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing or invalid "code" field in JSON body' }));
        return;
      }

      const prompt = `You are a README generator. Given the following source code, generate a comprehensive, well-structured README.md file in Markdown format.

The README should include:
1. A project title (derived from the code)
2. A brief description of what the code does
3. Features section
4. Installation instructions
5. Usage examples
6. API documentation (if applicable)
7. Configuration options
8. License section (MIT)

Here is the source code:
\`\`\`
${input.code}
\`\`\`

Generate ONLY the README.md content, no additional commentary.`;

      const result = await callAI([{ role: 'user', content: prompt }]);
      
      // Check if the AI returned an error
      if (typeof result === 'object' && result.error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'AI generation failed: ' + result.error }));
        return;
      }

      // Insert attribution footer
      const footer = '\n\n---\n\n*Built with [my-automaton AI](https://my-automaton.ai)*\n';
      const readme = result + footer;

      incrementFree(ip);
      const remaining = Math.max(0, 2 - (FREE_LIMIT.get(ip)?.count || 0));
      
      res.writeHead(200, { 
        'Content-Type': 'application/json',
        'X-Free-Remaining': remaining
      });
      res.end(JSON.stringify({ readme, free_remaining: remaining }));
      
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid request: ' + e.message }));
    }
  });
}

// Stripe checkout (serves static upgrade page)
async function handleUpgrade(req, res) {
  const filePath = path.join(CONTENT, 'upgrade.html');
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    // Inject Stripe public key if available
    const html = content.replace('{{STRIPE_PK}}', process.env.STRIPE_PK || 'pk_test_YOUR_KEY');
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
  } catch {
    res.writeHead(404); res.end('Upgrade page not found');
  }
}

// Stripe webhook
async function handleWebhook(req, res) {
  let body = '';
  req.on('data', c => body += c);
  req.on('end', async () => {
    try {
      const event = JSON.parse(body);
      log(`Stripe webhook: ${event.type}`);
      
      if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const priceId = session.line_items?.data?.[0]?.price?.id || session.metadata?.price_id || '';
        const txHash = session.metadata?.tx_hash || `${session.id}`;
        
        if (priceId && PRICES[priceId]) {
          const key = addCredits(priceId, txHash);
          if (key) {
            log(`✅ API key generated: ${key} for ${priceId}`);
            res.writeHead(200); res.end(JSON.stringify({ received: true, key }));
            return;
          }
        }
      }
      res.writeHead(200); res.end(JSON.stringify({ received: true }));
    } catch (e) {
      log(`Webhook error: ${e.message}`);
      res.writeHead(400); res.end(JSON.stringify({ error: e.message }));
    }
  });
}

// Stats
async function handleStats(req, res) {
  const db = readJSON(API_KEYS);
  const keys = Object.keys(db);
  const totalCreditsSold = keys.reduce((s, k) => s + (db[k].price_id ? PRICES[db[k].price_id]?.credits || 500 : 0), 0);
  const totalCreditsUsed = keys.reduce((s, k) => s + (db[k].credits || 0), 0); // remaining
  const totalPurchases = keys.length;
  
  // Revenue from statically known tiers
  const totalRevenue = keys.reduce((s, k) => {
    const tier = PRICES[db[k].price_id];
    return s + (tier ? tier.price : 0);
  }, 0);
  
  const data = {
    total_keys: totalPurchases,
    total_credits_sold: totalCreditsSold,
    total_credits_remaining: totalCreditsUsed,
    total_revenue_usd: totalRevenue,
    free_usage_today: FREE_LIMIT.size,
    endpoints: Object.keys(CREDIT_COST).length,
    gateway_version: 'production-v1.0',
    deepseek_configured: !!DEEPSEEK_KEY,
    server_time: new Date().toISOString()
  };
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

// Admin: add credits (dev mode / creator)
async function handleAdmin(req, res) {
  let body = '';
  req.on('data', c => body += c);
  req.on('end', () => {
    try {
      const { action, key, credits, price_id } = JSON.parse(body);
      if (action === 'add') {
        const newKey = generateKey();
        const db = readJSON(API_KEYS);
        db[newKey] = { credits: credits || 100, created: new Date().toISOString(), used: 0, price_id: price_id || 'manual' };
        writeJSON(API_KEYS, db);
        res.writeHead(200); res.end(JSON.stringify({ key: newKey, credits: credits || 100 }));
      } else if (action === 'topup' && key) {
        const db = readJSON(API_KEYS);
        if (db[key]) {
          db[key].credits += credits || 100;
          writeJSON(API_KEYS, db);
          res.writeHead(200); res.end(JSON.stringify({ key, credits: db[key].credits }));
        } else {
          res.writeHead(404); res.end(JSON.stringify({ error: 'Key not found' }));
        }
      } else {
        res.writeHead(400); res.end(JSON.stringify({ error: 'Unknown action' }));
      }
    } catch (e) {
      res.writeHead(400); res.end(JSON.stringify({ error: e.message }));
    }
  });
}

// Badge generator (dynamic SVG)
async function handleBadge(req, res) {
  const u = url.parse(req.url, true);
  const { label='status', message='ok', color='green' } = u.query;
  const colors = { green:'#3fb950', blue:'#58a6ff', yellow:'#d29922', red:'#f85149', purple:'#bc8cff', orange:'#f0883e', gray:'#8b949e' };
  const c = colors[color] || color || '#3fb950';
  
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${label.length*7 + message.length*7 + 20}" height="20">
    <linearGradient id="b" x2="0" y2="1"><stop offset="0" stop-color="#555"/><stop offset="1" stop-color="#333"/></linearGradient>
    <rect rx="3" fill="#555" width="${label.length*7 + 10}" height="20"/>
    <rect rx="3" fill="${c}" x="${label.length*7 + 10}" width="${message.length*7 + 10}" height="20"/>
    <text fill="#fff" font-family="DejaVu Sans,Verdana,sans-serif" font-size="11" x="5" y="14">${escapeXml(label)}</text>
    <text fill="#fff" font-family="DejaVu Sans,Verdana,sans-serif" font-size="11" x="${label.length*7 + 15}" y="14">${escapeXml(message)}</text>
  </svg>`;
  
  res.writeHead(200, { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'no-cache' });
  res.end(svg);
}

function escapeXml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

// Sitemap
async function handleSitemap(req, res) {
  const sitemapPath = path.join(CONTENT, 'sitemap.xml');
  try {
    const content = fs.readFileSync(sitemapPath);
    res.writeHead(200, { 'Content-Type': 'application/xml' });
    res.end(content);
  } catch {
    res.writeHead(404); res.end('Not found');
  }
}

// OpenAPI spec
async function handleOpenAPI(req, res) {
  const spec = {
    openapi: '3.0.0',
    info: { title: 'my-automaton API', version: '1.0.0', description: 'AI-powered code review and analysis API. Pay-per-use.' },
    servers: [{ url: 'https://automation.songheng.vip' }],
    paths: {
      '/free/analyze': { post: { summary: 'Free text analysis (3/day)', requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { text: { type: 'string' }, mode: { type: 'string', enum: ['analyze','summarize','review','security','explain'] } } } } } }, responses: { '200': { description: 'Analysis result' }, '429': { description: 'Rate limited' } } } },
      '/v1/review': { post: { summary: 'Premium code review (5 credits)', parameters: [{ name: 'X-API-Key', in: 'header', required: true, schema: { type: 'string' } }], requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { code: { type: 'string' }, language: { type: 'string' } } } } } }, responses: { '200': { description: 'Review result' }, '402': { description: 'Insufficient credits' } } } },
      '/v1/security': { post: { summary: 'Premium security scan (3 credits)', parameters: [{ name: 'X-API-Key', in: 'header', required: true, schema: { type: 'string' } }], requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { code: { type: 'string' }, language: { type: 'string' } } } } } }, responses: { '200': { description: 'Security report' } } } },
      '/api/stats/overview': { get: { summary: 'Public stats', responses: { '200': { description: 'Stats JSON' } } } },
      '/api/generate-readme': { post: { summary: 'Generate README.md from source code (3/day/IP)', requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { code: { type: 'string' } } } } } }, responses: { '200': { description: 'Generated README with attribution footer' }, '429': { description: 'Rate limited (3/day)' } } } }
    }
  };
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(spec, null, 2));
}


// ── Stripe Checkout (POST /api/checkout) ──────────────────────
async function handleCheckout(req, res) {
  let body = '';
  req.on('data', c => body += c);
  req.on('end', async () => {
    try {
      const input = JSON.parse(body || '{}');
      const priceId = input.price_id || '';
      const tier = PRICES[priceId];
      
      if (!tier) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid price_id. Options: ' + Object.keys(PRICES).join(', ') }));
        return;
      }

      // If Stripe is configured, create a Checkout Session
      const STRIPE_SK = process.env.STRIPE_SK || '';
      if (STRIPE_SK && STRIPE_SK !== 'sk_test_YOUR_KEY') {
        try {
          const Stripe = require('stripe');
          const stripe = new Stripe(STRIPE_SK);
          const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
              price_data: {
                currency: 'hkd',
                product_data: { name: tier.name + ' - ' + tier.credits + ' API Credits' },
                unit_amount: tier.price * 1000, // HKD cents
              },
              quantity: 1,
            }],
            mode: 'payment',
            success_url: 'https://automation.songheng.vip/thank-you.html?session_id={CHECKOUT_SESSION_ID}',
            cancel_url: 'https://automation.songheng.vip/pricing.html',
            metadata: { price_id: priceId },
          });
          log('Stripe checkout session created: ' + session.id + ' for ' + priceId);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ url: session.url, session_id: session.id }));
          return;
        } catch (stripeErr) {
          log('Stripe error: ' + stripeErr.message);
          // Fall through to direct key generation
        }
      }

      // Fallback: generate key directly (for wallet/crypto payments or Stripe unavailable)
      const key = addCredits(priceId, 'direct_' + Date.now());
      if (key) {
        log('Direct key generated: ' + key + ' for ' + priceId);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ key, credits: tier.credits, tier: tier.name }));
      } else {
        res.writeHead(500); res.end(JSON.stringify({ error: 'Key generation failed' }));
      }
    } catch (e) {
      log('Checkout error: ' + e.message);
      res.writeHead(400); res.end(JSON.stringify({ error: e.message }));
    }
  });
}

// ── Lead Capture (POST /api/capture-lead) ─────────────────────
async function handleCaptureLead(req, res) {
  let body = '';
  req.on('data', c => body += c);
  req.on('end', () => {
    try {
      const input = JSON.parse(body || '{}');
      const email = (input.email || '').trim();
      const name = (input.name || '').trim();
      const interest = (input.interest || 'general').trim();
      const ip = ipFromReq(req);

      if (!email || !email.includes('@')) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Valid email required' }));
        return;
      }

      // Save lead
      const leadsFile = path.join(DATA_DIR, 'leads.json');
      const leads = readJSON(leadsFile, { leads: [] });
      leads.leads.push({
        email, name, interest, ip,
        captured_at: new Date().toISOString(),
        source: input.source || 'pricing-page'
      });
      writeJSON(leadsFile, leads);
      log('Lead captured: ' + email + ' (' + interest + ')');

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: 'Thanks! We will be in touch.' }));
    } catch (e) {
      log('Lead capture error: ' + e.message);
      res.writeHead(400); res.end(JSON.stringify({ error: e.message }));
    }
  });
}

// ── HTTP Server ───────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  const p = url.parse(req.url).pathname;
  const method = req.method;
  
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key, X-X402-Payment');
  if (method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  
  try {
    // Health
    if (p === '/health' || p === '/api/health') { await handleHealth(req, res); return; }
    
    // Static content (root pages)
    if (method === 'GET' && !p.startsWith('/api/') && !p.startsWith('/v1/') && !p.startsWith('/free/') && !p.startsWith('/webhook/') && !p.startsWith('/badge/')) {
      await serveStatic(req, res);
      return;
    }
    
    // Sitemap + robots
    if (p === '/sitemap.xml') { await handleSitemap(req, res); return; }
    if (p === '/openapi.json') { await handleOpenAPI(req, res); return; }
    
    // Badge
    if (p === '/badge' || p.startsWith('/badge/')) { await handleBadge(req, res); return; }
    

    // Stripe Checkout
    if (p === '/api/checkout' && method === 'POST') { await handleCheckout(req, res); return; }
    
    // Lead Capture
    if (p === '/api/capture-lead' && method === 'POST') { await handleCaptureLead(req, res); return; }
    
    // Free endpoints
    if (p.startsWith('/free/') && method === 'POST') { await handleFree(req, res); return; }
    
    // Premium endpoints
    if (p.startsWith('/v1/') && method === 'POST') { await handlePremium(req, res); return; }
    
    // README Generator (3/day/IP — uses free-limit infrastructure)
    if (p === '/api/generate-readme' && method === 'POST') { await handleGenerateReadme(req, res); return; }
    
    // Stripe
    if (p === '/upgrade' || p === '/upgrade.html') { await handleUpgrade(req, res); return; }
    
    // Stats
    if (p === '/api/stats/overview' || p === '/api/stats') { await handleStats(req, res); return; }
    
    // Admin
    if (p === '/api/admin/credits' && method === 'POST') { await handleAdmin(req, res); return; }
    
    // 404
    res.writeHead(404); res.end('Not found');
  } catch (e) {
    log(`Error: ${e.message}`);
    res.writeHead(500); res.end(JSON.stringify({ error: 'Internal error' }));
  }
});

server.listen(PORT, '0.0.0.0', () => {
  log(`✅ my-automaton Gateway running on port ${PORT}`);
  log(`   Public: https://automation.songheng.vip`);
  log(`   Stripe: ${STRIPE_SK ? '✅ Configured' : '❌ Not configured'}`);
  log(`   DeepSeek: ${DEEPSEEK_KEY ? '✅ Configured' : '❌ Not configured'}`);
  log(`   Free endpoints: /free/{analyze,review,security,summarize,explain,refactor,complexity}`);
  log(`   Premium endpoints: /v1/{analyze,review,security,summarize,explain,refactor,complexity}`);
  log(`   README Generator: /api/generate-readme (POST, 3/day/IP)`);
  log(`   Upgrade: /upgrade.html`);
  log(`   Stats: /api/stats/overview`);
});
