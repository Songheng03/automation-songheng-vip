#!/usr/bin/env node
/**
 * my-automaton Gateway — Port 8080
 * Sovereign AI agent service network.
 * x402 micropayments via USDC on Base chain.
 * Inline badge generator for GitHub repos.
 * Integrated AI Playground (DeepSeek inference).
 */
import http from 'http';
import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';
import { handleReferral, handleHandshake, handleCatalog, handleCommercePage, recordReferralCommission } from '/root/services/agent-commerce.js';
import { handlePromotionDashboard, runPromotionCycle } from '/root/services/promotion-hub.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '8080', 10);
const HOST = process.env.HOST || '0.0.0.0';
const WALLET = '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113';
const CHAIN_NAME = 'base';
const CHAIN_ID = 8453;
const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const CONTENT_DIR = path.join(__dirname, 'content');
const AGENT_NAME = 'my-automaton';
const DEEPSEEK_API_KEY = process.env.OPENAI_API_KEY || process.env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_BASE_URL = 'https://api.deepseek.com/v1';
const DEEPSEEK_MODEL = 'deepseek-chat';

const SERVICES = [
  { name: 'analyze', cost: 1, desc: 'Deep text analysis' },
  { name: 'summarize', cost: 2, desc: 'AI summarization' },
  { name: 'review', cost: 5, desc: 'Full code review' },
  { name: 'security', cost: 3, desc: 'Security vulnerability scan' },
  { name: 'explain', cost: 2, desc: 'Code explanation' },
  { name: 'refactor', cost: 5, desc: 'Refactoring suggestions' },
  { name: 'complexity', cost: 2, desc: 'Complexity analysis' },
  { name: 'batch', cost: 5, desc: 'Batch 10 texts' },
  { name: 'render', cost: 3, desc: 'Markdown with templates' },
];

const SEO_ROUTES = {
  '/tools': '/dev-tools.html',
  '/free-ai-code-review-tool': '/free-ai-code-review-tool.html',
  '/free-ai-security-scanner': '/free-ai-security-scanner.html',
  '/free-ai-text-summarizer': '/free-ai-text-summarizer.html',
  '/free-ai-code-explainer': '/free-ai-code-explainer.html',
  '/ai-code-refactoring-tool': '/ai-code-refactoring-tool.html',
  '/free-agent-to-agent-api': '/free-agent-to-agent-api.html',
  '/sitemap.xml': '/sitemap.xml',
  '/robots.txt': '/robots.txt',
  '/playground': '/playground.html',
  '/dashboard': '/dashboard.html',
  '/api-docs': '/api-docs.html',
  '/docs': '/api-docs.html',
};

const STATS_FILE = path.join(__dirname, 'data', 'stats.json');
const DATA_DIR = path.join(__dirname, 'data');
function ensureDataDir() { try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch {} }

function loadStats() {
  try { return JSON.parse(fs.readFileSync(STATS_FILE, 'utf8')); } catch { return { totalCalls: 0, freeToday: 0, date: '', revenue: 0, payments: [], requests: [], handshakes: 0, referrals: 0, serviceUsage: {}, deepseekStatus: 'unknown' }; }
}
function saveStats(s) { ensureDataDir(); fs.writeFileSync(STATS_FILE, JSON.stringify(s, null, 2)); }

// ── Demo API for Playground (3 free/day/IP) ──
const demoFreeCounts = new Map();
async function handleDemo(body) {
  const ip = body && body._ip ? body._ip : 'unknown';
  const today = new Date().toISOString().slice(0,10);
  const key = ip + ':' + today;
  const count = demoFreeCounts.get(key) || 0;
  if (count >= 3) return { error: 'Free limit reached (3/day). Use paid API at /api-docs.', remaining: 0, upgrade: true };
  const text = body && body.text || '';
  const mode = body && body.mode || 'chat';
  if (!text || text === 'ping') return { remaining: 3 - count, result: 'OK - demo service ready' };
  demoFreeCounts.set(key, count + 1);
  const result = await callInference(text, mode);
  return { result: result, remaining: 3 - count - 1 };
}

// ── DeepSeek Inference ──
async function callDeepSeek(prompt, system = 'You are a helpful AI assistant.') {
  const response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${DEEPSEEK_API_KEY}` },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt }
      ],
      max_tokens: 2048, temperature: 0.7
    })
  });
  if (!response.ok) throw new Error(`DeepSeek API error ${response.status}: ${await response.text()}`);
  const data = await response.json();
  return { content: data.choices?.[0]?.message?.content || '', usage: data.usage || {} };
}

// ── DeepSeek Connectivity Check ──
async function checkDeepSeekConnectivity() {
  if (!DEEPSEEK_API_KEY) return { connected: false, reason: 'No API key configured', model: null };
  try {
    const response = await fetch(`${DEEPSEEK_BASE_URL}/models`, {
      headers: { 'Authorization': `Bearer ${DEEPSEEK_API_KEY}` }
    });
    if (response.ok) {
      const data = await response.json();
      return { connected: true, model: DEEPSEEK_MODEL, available: data.data?.length || 0 };
    }
    return { connected: false, reason: `API error ${response.status}`, model: null };
  } catch (e) {
    return { connected: false, reason: e.message, model: null };
  }
}

// ── Local Fallback ──
function localAnalysis(text, mode) {
  const wordCount = text.split(/\s+/).length;
  const charCount = text.length;
  const sentences = text.split(/[.!?]+/).filter(s => s.trim()).length;
  const lines = text.split('\n').length;
  const modes = {
    analyze: JSON.stringify({ sentiment: 'neutral', themes: ['No AI key configured'], tone: 'plain', summary: `Text analysis: ${wordCount} words, ${charCount} chars, ${sentences} sentences. Configure DEEPSEEK_API_KEY for AI-powered analysis.` }),
    summarize: `**Summary**\nWords: ${wordCount}\nSentences: ${sentences}\nConfigure DeepSeek API key for AI summarization.`,
    review: `**Local Code Review**\nLines: ${lines}\n- Check for common issues\n- Configure DEEPSEEK_API_KEY for AI review`,
    security: `**Local Security Scan**\nLines: ${lines}\n${text.includes('eval(')?'⚠ eval() detected\n':''}${text.includes('innerHTML')?'⚠ innerHTML usage\n':''}Configure DEEPSEEK_API_KEY for full scan.`,
    explain: `**Local Explanation**\n${lines} lines, ${wordCount} words.\nConfigure DEEPSEEK_API_KEY for AI explanation.`,
    chat: `**Local Response**\nI'm running without an AI backend. Set DEEPSEEK_API_KEY or OPENAI_API_KEY in environment to enable AI responses.\n\nYou said: ${text.substring(0, 200)}`
  };
  return modes[mode] || modes.summarize;
}

async function callInference(text, mode) {
  if (!DEEPSEEK_API_KEY) return localAnalysis(text, mode);
  const systemPrompts = {
    analyze: 'You are a text analysis AI. Respond in JSON format with fields: sentiment, themes (array), tone, summary.',
    summarize: 'You are a summarization AI. Be concise. Provide 2-3 sentences.',
    review: 'You are a senior code reviewer. List issues by severity (critical, major, minor) with line references.',
    security: 'You are a security expert. Focus on OWASP Top 10 vulnerabilities. Respond with severity ratings.',
    explain: 'You are a code teacher. Explain code in plain English with examples.',
    refactor: 'You are a code refactoring expert. Suggest improvements for readability, performance, and maintainability.',
    complexity: 'You are a code complexity analyst. Estimate cyclomatic complexity and suggest simplifications.',
    chat: 'You are a helpful AI assistant.',
  };
  
  try {
    const result = await callDeepSeek(text, systemPrompts[mode] || systemPrompts.summarize);
    if (mode === 'analyze') return result.content;
    return result.content;
  } catch (e) {
    console.error('Inference error:', e.message);
    return localAnalysis(text, mode) + `\n\n[AI backend error: ${e.message}]`;
  }
}

// ── Badge Generator ──
function svgBadge(label, value, color) {
  const bg = typeof color === 'object' ? color.bg : color;
  const tc = typeof color === 'object' ? color.text : '#fff';
  const lw = Math.max(label.length * 7 + 14, 30);
  const vw = Math.max(String(value).length * 7 + 14, 30);
  const tw = lw + vw;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${tw}" height="20"><rect rx="3" width="${tw}" height="20" fill="#555"/><rect x="${lw}" width="${vw}" height="20" fill="${bg}"/><g fill="#fff" font-family="Verdana,sans-serif" font-size="11"><text x="${lw/2}" y="14" text-anchor="middle" fill="#010101" fill-opacity=".3">${label}</text><text x="${lw/2}" y="14" text-anchor="middle">${label}</text><text x="${lw+vw/2}" y="14" text-anchor="middle" fill="#010101" fill-opacity=".3">${value}</text><text x="${lw+vw/2}" y="14" text-anchor="middle" fill="${tc}">${value}</text></g></svg>`;
}

function githubApi(repoPath) {
  return new Promise((resolve, reject) => {
    https.get({ hostname: 'api.github.com', path: `/repos${repoPath}`, headers: { 'User-Agent': 'my-automaton-badge/1.0', 'Accept': 'application/vnd.github.v3+json' }, timeout: 5000 }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { reject(new Error('parse fail')); } });
    }).on('error', reject);
  });
}

async function handleBadgeInline(pathWithQuery) {
  const m = pathWithQuery.match(/^\/repo-badge\/([^/]+)\/([^/]+)(?:\/([a-z-]+))?(?:\?.*)?$/i);
  if (!m) return { status: 400, body: 'Usage: /repo-badge/:owner/:repo/:metric', type: 'text' };
  const [, owner, repo, metric = 'stars'] = m;
  try {
    const data = await githubApi(`/${owner}/${repo}`);
    if (data.message === 'Not Found') return { status: 200, body: svgBadge('repo', 'not found', '#da3633'), type: 'svg' };
    const fmt = n => n >= 1000000 ? (n/1000000).toFixed(1)+'M' : n >= 1000 ? (n/1000).toFixed(1)+'K' : String(n);
    const colors = { stars:'#e4aa42', forks:'#2ea44f', issues:'#da3633', license:'#6f42c1', size:'#0969da', updated:'#8250df', health:(data.archived?'#da3633':'#1a7f37') };
    const metrics = {
      stars: { label:'stars', value:fmt(data.stargazers_count||0) },
      forks: { label:'forks', value:fmt(data.forks_count||0) },
      issues: { label:'issues', value:fmt(data.open_issues_count||0) },
      license: { label:'license', value:data.license?data.license.spdx_id:'none' },
      size: { label:'language', value:data.language||'unknown' },
      updated: { label:'updated', value:data.pushed_at?data.pushed_at.slice(0,10):'never' },
      health: { label:'health', value:data.archived?'archived':'active' },
    };
    const mData = metrics[metric] || metrics.stars;
    return { status: 200, body: svgBadge(mData.label, mData.value, colors[metric] || '#1a7f37'), type: 'svg' };
  } catch (e) {
    return { status: 200, body: svgBadge('error', e.message.slice(0,10), '#da3633'), type: 'svg' };
  }
}

// ── Serve Static File ──
function serveStatic(urlPath, res) {
  const filePath = SEO_ROUTES[urlPath] || urlPath;
  let fullPath = path.join(CONTENT_DIR, filePath === '/' ? 'index.html' : filePath);
  
  if (fullPath.endsWith('/')) fullPath = path.join(fullPath, 'index.html');
  
  const extMap = {
    '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
    '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.xml': 'application/xml',
    '.txt': 'text/plain', '.md': 'text/markdown',
  };
  
  try {
    if (!fs.existsSync(fullPath) || fs.statSync(fullPath).isDirectory()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
      return;
    }
    const ext = path.extname(fullPath).toLowerCase();
    const contentType = extMap[ext] || 'application/octet-stream';
    const content = fs.readFileSync(fullPath);
    res.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=3600' });
    res.end(content);
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Server Error');
  }
}

// ── Request Router ──
const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-X402-Payment, Authorization');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const path = url.pathname;
  const pathWithQuery = req.url;

  // Demo API - 3 free/day/IP for Playground
  if (path === '/api/demo') {
    let bodyRaw = '';
    try {
      bodyRaw = await new Promise((res, rej) => {
        let d = ''; req.on('data', c => d += c); req.on('end', () => res(d || '{}')); req.on('error', rej);
      });
    } catch(e) { bodyRaw = '{}'; }
    try { bodyRaw = JSON.parse(bodyRaw); } catch(e) { bodyRaw = { text: bodyRaw, mode: 'chat' }; }
    bodyRaw._ip = req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : req.socket.remoteAddress || 'unknown';
    const result = await handleDemo(bodyRaw);
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify(result));
    return;
  }

  // Badge endpoints
  if (path === '/repo-badge' && pathWithQuery.startsWith('/repo-badge/')) {
    const result = await handleBadgeInline(pathWithQuery);
    res.writeHead(result.status, { 'Content-Type': result.type === 'svg' ? 'image/svg+xml' : 'text/plain', 'Cache-Control': 'no-cache' });
    res.end(result.body);
    return;
  }

  // Service commerce pages
  if (path.startsWith('/commerce/')) {
    const serviceName = path.slice('/commerce/'.length);
    if (serviceName && SERVICES.find(s => s.name === serviceName)) {
      const html = await handleCommercePage(serviceName, SERVICES);
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html);
      return;
    }
  }

  // Agent referral & handshake endpoints
  if (path === '/api/referral/register' && req.method === 'POST') {
    let body = '';
    await new Promise(res => { req.on('data', c => body += c); req.on('end', res); });
    const result = handleReferral(body);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));
    return;
  }
  
  if (path.startsWith('/api/referral/stats/')) {
    const addr = path.slice('/api/referral/stats/'.length);
    const result = handleReferral(null, addr);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));
    return;
  }
  
  if (path.startsWith('/r/')) {
    const code = path.slice('/r/'.length);
    recordReferralCommission(code);
    res.writeHead(302, { 'Location': '/playground' });
    res.end();
    return;
  }

  if (path === '/api/handshake' && req.method === 'POST') {
    let body = '';
    await new Promise(res => { req.on('data', c => body += c); req.on('end', res); });
    const result = handleHandshake(body);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));
    return;
  }

  // API catalog
  if (path === '/api/catalog' || path === '/api/catalog/') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    const cat = SERVICES.map(s => ({ ...s, endpoint: `/v1/${s.name}`, payment: { wallet: WALLET, chain: CHAIN_NAME, chainId: CHAIN_ID, usdc: USDC } }));
    res.end(JSON.stringify({ agent: AGENT_NAME, wallet: WALLET, server: 'automation.songheng.vip', services: cat, freeEndpoints: ['/playground', '/api/demo'] }));
    return;
  }

  // Stats/health
  if (path === '/stats' || path === '/health') {
    const stats = loadStats();
    const deepseekStatus = await checkDeepSeekConnectivity();
    stats.deepseekStatus = deepseekStatus.connected ? 'connected' : 'disconnected';
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ status: 'ok', agent: AGENT_NAME, wallet: WALLET, uptime: process.uptime(), totalCalls: stats.totalCalls, deepseek: deepseekStatus }));
    return;
  }

  // Static files
  if (path === '/' || path.endsWith('.html') || path.endsWith('.css') || path.endsWith('.js') || path.endsWith('.png') || path.endsWith('.svg') || path.endsWith('.xml') || path.endsWith('.txt') || path.endsWith('.ico') || path.endsWith('.json') || path.endsWith('.md')) {
    serveStatic(path, res);
    return;
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'text/html', 'Access-Control-Allow-Origin': '*' });
  res.end(`<!DOCTYPE html><html><body><h1>404</h1><p>my-automaton at automation.songheng.vip</p><a href="/">Home</a></body></html>`);
});

server.listen(PORT, HOST, () => {
  console.log(`my-automaton gateway running on http://${HOST}:${PORT}`);
  console.log(`Wallet: ${WALLET}`);
  console.log(`DeepSeek: ${DEEPSEEK_API_KEY ? 'configured' : 'NOT configured (fallback mode)'}`);
});

process.on('uncaughtException', e => console.error('Uncaught:', e));
process.on('unhandledRejection', e => console.error('Unhandled:', e));
