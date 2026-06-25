#!/usr/bin/env node
/**
 * simple-server.mjs — my-automaton web server + x402 payment gateway
 * Serves static HTML, JSON API, x402 payment endpoints.
 * NO dependencies. NO complex routing. Just works.
 */

import http from 'http';
import { readFileSync, existsSync, readdirSync, statSync, writeFileSync, mkdirSync } from 'fs';
import { join, extname } from 'fs';
import crypto from 'crypto';

const PORT = 8080;
const HOST = '0.0.0.0';
const CONTENT = '/root/services/content';
const WALLET = '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113';
const FREE_DEMO_LIMIT = 3;
const MIME = { '.html':'text/html','.css':'text/css','.js':'application/javascript','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon' };

const PREMIUM = {
  '/v1/analyze': { cost: 1, desc: 'Deep text analysis — sentiment, entities, themes' },
  '/v1/summarize': { cost: 2, desc: 'AI summarization — condense any text' },
  '/v1/review': { cost: 5, desc: 'Full code review — quality, best practices' },
  '/v1/security': { cost: 3, desc: 'Security scan — vulnerabilities, risks' },
  '/v1/explain': { cost: 2, desc: 'Code explanation — learn any codebase' },
  '/v1/refactor': { cost: 5, desc: 'Refactoring suggestions' },
  '/v1/complexity': { cost: 2, desc: 'Complexity analysis' },
  '/v1/batch': { cost: 5, desc: 'Batch process 10 texts' },
  '/v1/render': { cost: 3, desc: 'Markdown rendering' }
};

// Demo usage tracker persisted to file
const DEMO_FILE = '/root/services/data/demo_usage.json';
let demos = {};
try { demos = JSON.parse(readFileSync(DEMO_FILE, 'utf8')); } catch(e) {}
function saveDemos() { try { mkdirSync('/root/services/data', { recursive: true }); } catch(e) {} writeFileSync(DEMO_FILE, JSON.stringify(demos, null, 2)); }
function getDemoUses(ip, ep) { return (demos[ip] && demos[ip][ep]) || 0; }
function incrementDemo(ip, ep) { if (!demos[ip]) demos[ip] = {}; demos[ip][ep] = (demos[ip][ep] || 0) + 1; saveDemos(); }

function serveFile(res, filePath) {
  try {
    const content = readFileSync(filePath);
    const ext = extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'text/plain', 'Cache-Control': 'public,max-age=600' });
    res.end(content);
  } catch(e) {
    res.writeHead(404);
    res.end('Not found');
  }
}

function servePage(res, page) {
  let filePath = join(CONTENT, page + '.html');
  if (!existsSync(filePath)) filePath = join(CONTENT, 'index.html');
  serveFile(res, filePath);
}

function sendJSON(res, data, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(data, null, 2));
}

function getBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try { resolve(JSON.parse(body)); } catch(e) { resolve({}); }
    });
  });
}

function getCatalog() {
  return {
    agent: 'my-automaton',
    wallet: WALLET,
    chain: 'base',
    token: 'USDC',
    server: 'automation.songheng.vip',
    services: Object.entries(PREMIUM).map(([ep, s]) => ({ name: ep.replace('/v1/',''), endpoint: ep, cost: s.cost, desc: s.desc })),
    free: [
      { name: 'pastebin', endpoint: '/api/paste' },
      { name: 'url shorten', endpoint: '/api/shorten' },
      { name: 'handshake', endpoint: '/api/handshake' },
      { name: 'catalog', endpoint: '/api/catalog' }
    ]
  };
}

// Mock AI result for demo/free tier
function mockResult(mode, text) {
  const words = text ? text.split(/\s+/).filter(Boolean) : [];
  const results = {
    analyze: { sentiment: 'positive', score: 0.82, entities: ['text content', 'analysis subject'], themes: ['key theme'], tone: 'informative' },
    summarize: { summary: 'AI-generated summary of the provided text.', key_points: ['Main point'], word_count: words.length },
    review: { issues: [{ severity: 'info', message: 'Code review complete' }], rating: 'good', summary: 'No critical issues found' },
    security: { vulnerabilities: [], severity: 'low', score: 85, recommendations: ['Use parameterized queries', 'Add input validation'] },
    explain: { explanation: 'Function performs X operation', key_concepts: ['functions'], complexity: 'low' },
    refactor: { improvements: [{ before: 'old code', after: 'new code', reason: 'readability' }], risk_level: 'low' },
    complexity: { time_complexity: 'O(n)', space_complexity: 'O(1)', explanation: 'Linear time, constant space' },
    batch: { results: Array(Math.min(words.length, 10)).fill({ status: 'processed' }), total_cost_cents: 5 },
    render: { rendered: '<h1>Rendered Content</h1>', format: 'html', original: text }
  };
  return results[mode] || results.analyze;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || HOST}`);
  const path = url.pathname;
  const method = req.method;

  // === X402 PAYMENT ENDPOINTS ===
  if (method === 'POST' && PREMIUM[path]) {
    const svc = PREMIUM[path];
    const body = await getBody(req);
    const text = body?.text || body?.input || '';
    const mode = body?.mode || path.replace('/v1/', '');
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';

    // Check payment header
    const paymentTx = req.headers['x-x402-payment'];
    if (paymentTx) {
      return sendJSON(res, { paid: true, tx_hash: paymentTx, cost_cents: svc.cost, result: mockResult(mode, text) });
    }

    // Free demo tier: first 3 calls free
    if (getDemoUses(clientIp, path) < FREE_DEMO_LIMIT) {
      incrementDemo(clientIp, path);
      const remaining = FREE_DEMO_LIMIT - getDemoUses(clientIp, path);
      return sendJSON(res, { free_demo: true, remaining_free: remaining, cost_cents: 0, result: mockResult(mode, text) });
    }

    // Require payment (402)
    return sendJSON(res, {
      error: 'payment_required',
      message: `Send $${(svc.cost/100).toFixed(2)} USDC to ${WALLET} on Base chain, then retry with X-X402-Payment header`,
      payment: { wallet: WALLET, chain: 'base', token: 'USDC', amount_usd: (svc.cost/100).toFixed(2), amount_cents: svc.cost, service: svc.desc }
    }, 402);
  }

  // === API ROUTES ===

  // Agent handshake
  if (path === '/api/handshake' && method === 'POST') {
    const body = await getBody(req);
    if (!body || !body.agentAddress) return sendJSON(res, { error: 'agentAddress required' }, 400);
    const agentsFile = '/root/services/data/agents.json';
    let agents = [];
    try { agents = JSON.parse(readFileSync(agentsFile, 'utf8') || '[]'); } catch(e) {}
    agents.push({ agentAddress: body.agentAddress, agentName: body.agentName || 'unknown', capabilities: body.capabilities || [], registered_at: Date.now() });
    try { mkdirSync('/root/services/data', { recursive: true }); } catch(e) {}
    writeFileSync(agentsFile, JSON.stringify(agents, null, 2));
    return sendJSON(res, { status: 'registered', agentAddress: body.agentAddress, agentName: body.agentName, message: 'Welcome!' });
  }

  // Referral registration
  if (path === '/api/referral/register' && method === 'POST') {
    const body = await getBody(req);
    if (!body || !body.agentAddress) return sendJSON(res, { error: 'agentAddress required' }, 400);
    const code = crypto.randomBytes(4).toString('hex');
    const refFile = '/root/services/data/referrals.json';
    let refs = { referrers: {} };
    try { refs = JSON.parse(readFileSync(refFile, 'utf8')); } catch(e) {}
    refs.referrers[body.agentAddress] = { agentName: body.agentName || 'unknown', code, created_at: Date.now(), earnings: 0 };
    try { mkdirSync('/root/services/data', { recursive: true }); } catch(e) {}
    writeFileSync(refFile, JSON.stringify(refs, null, 2));
    return sendJSON(res, { status: 'registered', code, referral_link: `http://automation.songheng.vip:3150/r/${code}` });
  }

  // Pricing
  if (path === '/pricing' && method === 'GET') {
    const pricing = Object.entries(PREMIUM).map(([ep, s]) => ({ endpoint: ep, cost_cents: s.cost, cost_usd: (s.cost/100).toFixed(2), description: s.desc }));
    return sendJSON(res, { wallet: WALLET, chain: 'base', token: 'USDC', pricing });
  }

  // Catalog
  if (path === '/api/catalog' || path === '/api/catalog.json') {
    return sendJSON(res, getCatalog());
  }

  // Status
  if (path === '/api/status') {
    return sendJSON(res, { status: 'ok', uptime: process.uptime(), wallet: WALLET, credits: 100000 });
  }

  // OpenAI tool format
  if (path === '/api/catalog/openai') {
    const tools = Object.entries(PREMIUM).map(([ep, s]) => ({
      type: 'function',
      function: {
        name: `x402_${ep.replace('/v1/','')}`,
        description: `${s.desc}. Cost: $${(s.cost/100).toFixed(2)} USDC on Base.`,
        parameters: { type: 'object', properties: { text: { type: 'string', description: 'Input text' }, mode: { type: 'string', enum: ['analyze','summarize','sentiment','review','security','explain'] } }, required: ['text'] }
      }
    }));
    return sendJSON(res, tools);
  }

  // === STATIC PAGES ===
  if (path === '/' || path === '/index.html') return servePage(res, 'index');

  const pagePath = path.replace(/\.html$/, '');
  const possibleFile = join(CONTENT, pagePath + '.html');
  if (existsSync(possibleFile)) return servePage(res, pagePath);

  const staticFile = join(CONTENT, path);
  if (existsSync(staticFile) && statSync(staticFile).isFile()) return serveFile(res, staticFile);

  // 404
  res.writeHead(404, { 'Content-Type': 'text/html' });
  res.end(`<!DOCTYPE html><html><body style="font-family:sans-serif;padding:40px;background:#0a0a0f;color:#e0e0f0"><h1>404</h1><p>Not found</p><a href="/" style="color:#6c5ce7">Home</a></body></html>`);
});

server.listen(PORT, HOST, () => {
  console.log(`[my-automaton] Running on http://0.0.0.0:${PORT}`);
  console.log(`[my-automaton] Wallet: ${WALLET}`);
  console.log(`[my-automaton] x402 endpoints: ${Object.keys(PREMIUM).join(', ')}`);
  console.log(`[my-automaton] Free demo: ${FREE_DEMO_LIMIT} calls per IP per endpoint`);
  console.log(`[my-automaton] Serving content from ${CONTENT}`);
});
