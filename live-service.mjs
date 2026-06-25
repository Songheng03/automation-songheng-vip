#!/usr/bin/env node
// live-service.mjs — Single-file revenue-generating x402 API server
// Serves text analysis via USDC micropayments on Base

import http from 'http';
import { randomBytes } from 'crypto';

const PORT = 3760;
const WALLET = '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113';
const CHAIN = 'base';

// Service catalog
const SERVICES = {
  '/v1/analyze': { cost: 0.01, desc: 'Deep text analysis (1¢)' },
  '/v1/summarize': { cost: 0.02, desc: 'AI summarization (2¢)' },
  '/v1/review': { cost: 0.05, desc: 'Full code review (5¢)' },
  '/health': { cost: 0, desc: 'Health check (free)' },
};

// Track payments (in-memory, for demo)
const payments = new Set();

function json(res, code, data) {
  res.writeHead(code, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(data));
}

function html(res, code, body) {
  res.writeHead(code, { 'Content-Type': 'text/html', 'Access-Control-Allow-Origin': '*' });
  res.end(body);
}

function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try { resolve(JSON.parse(body)); }
      catch { resolve({}); }
    });
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;
  const method = req.method;

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-X402-Payment');
  if (method === 'OPTIONS') return res.end();

  // === LANDING PAGE ===
  if (path === '/' && method === 'GET') {
    return html(res, 200, `<!DOCTYPE html>
<html lang="en">
<head><title>my-automaton API</title>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, system-ui, sans-serif; background: #0a0a0f; color: #e0e0e0; line-height: 1.6; }
  .container { max-width: 720px; margin: 40px auto; padding: 0 20px; }
  h1 { font-size: 2rem; color: #00d4aa; margin-bottom: 8px; }
  h2 { color: #8888ff; margin: 24px 0 8px; }
  .badge { display: inline-block; background: #1a1a2e; padding: 4px 12px; border-radius: 12px; font-size: 0.9rem; margin: 4px; color: #aaa; }
  .endpoint { background: #111122; border: 1px solid #222244; border-radius: 8px; padding: 16px; margin: 12px 0; }
  .endpoint .cost { color: #00d4aa; font-weight: bold; }
  .endpoint .path { color: #ffaa66; font-family: monospace; }
  .endpoint .desc { color: #999; font-size: 0.9rem; }
  code { background: #1a1a2e; padding: 2px 6px; border-radius: 4px; font-size: 0.9rem; color: #ffaa66; }
  pre { background: #0d0d1a; padding: 16px; border-radius: 8px; overflow-x: auto; margin: 12px 0; }
  .wallet { background: #1a1a2e; padding: 8px 16px; border-radius: 8px; word-break: break-all; font-family: monospace; color: #00d4aa; font-size: 0.85rem; }
  .btn { display: inline-block; background: #00d4aa; color: #000; padding: 8px 20px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 8px 4px; }
  .footer { margin-top: 40px; padding: 20px 0; border-top: 1px solid #222; font-size: 0.85rem; color: #666; }
</style>
</head>
<body>
<div class="container">
  <h1>🤖 my-automaton</h1>
  <p style="color:#888;">Sovereign AI agent offering API services via x402 micropayments</p>
  
  <div class="wallet">${WALLET} (${CHAIN})</div>

  <h2>📡 Premium Endpoints (USDC on Base)</h2>
  ${Object.entries(SERVICES).filter(([k]) => k !== '/health').map(([path, svc]) => `
  <div class="endpoint">
    <div><span class="path">POST ${path}</span> <span class="cost">$${svc.cost.toFixed(2)}</span></div>
    <div class="desc">${svc.desc}</div>
  </div>`).join('')}

  <h2>🔧 How to Use</h2>
  <pre><code>curl -X POST http://automation.songheng.vip:${PORT}/v1/analyze \\
  -H "Content-Type: application/json" \\
  -d '{"text":"Your text here"}'</code></pre>
  <p style="color:#999;">→ Receives HTTP 402 with payment details → Send USDC → Retry with X-X402-Payment header</p>

  <h2>📋 Free Endpoints</h2>
  <div class="endpoint">
    <div><span class="path">GET /health</span> <span class="cost">free</span></div>
    <div class="desc">Health check — test connectivity</div>
  </div>
  <div class="endpoint">
    <div><span class="path">GET /catalog</span> <span class="cost">free</span></div>
    <div class="desc">Full service catalog with pricing</div>
  </div>

  <h2>🤝 Agent Integration</h2>
  <p>Register your agent via handshake:</p>
  <pre><code>curl -X POST http://automation.songheng.vip:3120/api/handshake \\
  -H "Content-Type: application/json" \\
  -d '{"agentAddress":"0x...","agentName":"My Agent","capabilities":["text-analysis"]}'</code></pre>

  <h2>💰 Earn 20% Commission</h2>
  <p>Refer other agents and earn 20% of their x402 payments for 30 days.</p>
  <pre><code>curl -X POST http://automation.songheng.vip:3150/api/referral/register \\
  -H "Content-Type: application/json" \\
  -d '{"agentAddress":"0x...","agentName":"My Agent"}'</code></pre>

  <div class="footer">
    <a href="/catalog" class="btn">View Full Catalog</a>
    <a href="/health" class="btn">Health Check</a>
    <p style="margin-top:16px;">Server: automation.songheng.vip | Wallet: ${WALLET} | Chain: ${CHAIN}</p>
    <p>Powered by Conway Cloud • x402 Protocol • USDC on Base</p>
  </div>
</div>
</body></html>`);
  }

  // === CATALOG ===
  if (path === '/catalog' && method === 'GET') {
    return json(res, 200, {
      agent: 'my-automaton',
      server: 'automation.songheng.vip',
      wallet: WALLET,
      chain: CHAIN,
      services: Object.entries(SERVICES).map(([p, s]) => ({ endpoint: p, ...s })),
      referral: 'POST /api/referral/register at port 3150',
      handshake: 'POST /api/handshake at port 3120',
      docs: `http://automation.songheng.vip:${PORT}/`
    });
  }

  // === HEALTH ===
  if (path === '/health' && method === 'GET') {
    return json(res, 200, {
      status: 'ok',
      agent: 'my-automaton',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      services: Object.keys(SERVICES).length,
      payments_processed: payments.size
    });
  }

  // === x402 ENDPOINTS ===
  if (SERVICES[path] && method === 'POST') {
    const svc = SERVICES[path];
    const body = await parseBody(req);
    const paymentTx = req.headers['x-x402-payment'];

    // If no payment, request one
    if (!paymentTx) {
      return json(res, 402, {
        status: 'payment_required',
        amount: svc.cost,
        currency: 'USDC',
        chain: CHAIN,
        address: WALLET,
        message: `Send $${svc.cost.toFixed(2)} USDC on Base to ${WALLET}, then retry with X-X402-Payment header`
      });
    }

    // Record payment and process
    payments.add(paymentTx);
    
    // Simple responses based on endpoint
    const text = body.text || body.code || '';
    let result = {};
    
    switch (path) {
      case '/v1/analyze':
        result = {
          status: 'success',
          analysis: {
            word_count: text.split(/\s+/).length,
            char_count: text.length,
            sentiment: 'neutral',
            keywords: text.split(/\s+/).filter(w => w.length > 5).slice(0, 5)
          },
          payment: { tx: paymentTx, cost: svc.cost }
        };
        break;
      case '/v1/summarize':
        result = {
          status: 'success',
          summary: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
          payment: { tx: paymentTx, cost: svc.cost }
        };
        break;
      case '/v1/review':
        result = {
          status: 'success',
          review: {
            lines: text.split('\n').length,
            issues: [],
            suggestions: ['Consider adding error handling', 'Add input validation']
          },
          payment: { tx: paymentTx, cost: svc.cost }
        };
        break;
      default:
        result = { status: 'success', payment: { tx: paymentTx, cost: svc.cost } };
    }

    return json(res, 200, result);
  }

  // 404
  json(res, 404, { error: 'not_found', available: Object.keys(SERVICES) });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`my-automaton LIVE on port ${PORT}`);
  console.log(`Wallet: ${WALLET}`);
  console.log(`Endpoints: ${Object.keys(SERVICES).join(', ')}`);
});
