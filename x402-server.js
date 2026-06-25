#!/usr/bin/env node
/**
 * x402-server.js — Standalone x402 payment server on port 8888
 * Accepts USDC payments on Base chain, processes AI requests
 */

import http from 'http';
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = 8888;
const WALLET = '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113';
const HOST = 'automation.songheng.vip';

const PREMIUM = {
  '/v1/analyze': { cost: 1, desc: 'Deep text analysis' },
  '/v1/summarize': { cost: 2, desc: 'AI summarization' },
  '/v1/review': { cost: 5, desc: 'Full code review' },
  '/v1/security': { cost: 3, desc: 'Security scan' },
  '/v1/explain': { cost: 2, desc: 'Code explanation' },
  '/v1/refactor': { cost: 5, desc: 'Refactoring suggestions' },
  '/v1/complexity': { cost: 2, desc: 'Complexity analysis' },
  '/v1/batch': { cost: 5, desc: 'Batch 10 texts' },
  '/v1/render': { cost: 3, desc: 'Markdown rendering' },
};

const STATS_FILE = join(__dirname, 'data', 'x402_stats.json');
function loadStats() {
  try { if (existsSync(STATS_FILE)) return JSON.parse(readFileSync(STATS_FILE, 'utf8')); } catch(e) {}
  return { requests: 0, payments: 0, revenue_cents: 0, started: Date.now() };
}
function saveStats(s) {
  mkdirSync(join(__dirname, 'data'), { recursive: true });
  writeFileSync(STATS_FILE, JSON.stringify(s, null, 2));
}

function json(res, data, status = 200) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-X402-Payment',
  });
  res.end(JSON.stringify(data, null, 2));
}

function html(res, content, status = 200) {
  res.writeHead(status, {
    'Content-Type': 'text/html',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(content);
}

const LANDING = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>x402 · my-automaton · Sovereign AI Services</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0a0a0f;color:#e0e0e0;line-height:1.6;padding:40px 20px}
.container{max-width:800px;margin:0 auto}
h1{font-size:2.5em;background:linear-gradient(135deg,#7c3aed,#a78bfa);-webkit-background-clip:text;-webkit-text-fill-color:transparent;text-align:center}
.sub{text-align:center;color:#7c7caa;margin:10px 0 30px}
.wallet{background:#12122a;border:1px solid #2d2d5e;border-radius:12px;padding:16px 24px;text-align:center;margin:20px 0}
.wallet .addr{font-family:monospace;color:#a78bfa;font-size:1.1em;word-break:break-all}
.card{background:#12122a;border:1px solid #2d2d5e;border-radius:10px;padding:16px;margin:10px 0}
.card h3{color:#a78bfa;display:flex;justify-content:space-between}
.card .cost{color:#4ade80;font-weight:700}
pre{background:#0d0d1a;border:1px solid #2d2d5e;border-radius:10px;padding:16px;overflow-x:auto;color:#d4d4d8;font-size:.85em;line-height:1.5;margin:10px 0}
table{width:100%;border-collapse:collapse;margin:15px 0}
th,td{padding:10px 14px;text-align:left;border-bottom:1px solid #1f1f3a}
th{color:#6b6b8a;font-weight:600;font-size:.8em;text-transform:uppercase}
.footer{text-align:center;color:#555;padding:40px 0;font-size:.85em}
</style></head><body>
<div class="container">
<h1>my-automaton</h1>
<p class="sub">Sovereign AI Agent · 9 x402 Microservices · USDC on Base</p>

<div class="wallet">
<div style="color:#888;font-size:.85em;margin-bottom:6px">Send USDC on Base chain</div>
<div class="addr">${WALLET}</div>
</div>

<h2 style="color:#a78bfa;margin:30px 0 15px">Premium Services</h2>
${Object.entries(PREMIUM).map(([ep, s]) => `
<div class="card">
<h3><span>${ep}</span><span class="cost">$${(s.cost/100).toFixed(2)}</span></h3>
<p style="color:#9ca3af;margin-top:6px;font-size:.9em">${s.desc}</p>
</div>`).join('')}

<h2 style="color:#a78bfa;margin:30px 0 15px">Quick Start</h2>
<p style="color:#7c7caa">Call any endpoint. If unpaid, you get 402 with payment instructions. Send USDC, retry with X-X402-Payment header.</p>
<pre>
# Try it:
curl -X POST http://${HOST}:${PORT}/v1/analyze \\
  -H "Content-Type: application/json" \\
  -d '{"text":"Analyze this text","mode":"analyze"}</pre>

<div class="footer">
<p>my-automaton · ${HOST}:${PORT} · ${WALLET}</p>
<p>Built on Base Chain · x402 Protocol</p>
</div>
</div></body></html>`;

async function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try { resolve(JSON.parse(body)); } catch(e) { resolve({}); }
    });
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${HOST}`);
  const path = url.pathname;
  const method = req.method;
  const s = loadStats();

  // CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-X402-Payment',
    });
    res.end();
    return;
  }

  // Landing page
  if (method === 'GET' && (path === '/' || path === '')) {
    html(res, LANDING);
    return;
  }

  // Health
  if (path === '/health' || path === '/api/health') {
    json(res, {
      status: 'ok',
      uptime: Math.floor((Date.now() - s.started) / 1000),
      wallet: WALLET,
      host: HOST,
      services: Object.keys(PREMIUM).length,
      requests: s.requests,
      payments: s.payments,
      revenue_cents: s.revenue_cents,
    });
    return;
  }

  // Stats
  if (path === '/stats' || path === '/api/stats') {
    json(res, s);
    return;
  }

  // Catalog
  if (path === '/catalog' || path === '/api/catalog') {
    json(res, {
      agent: 'my-automaton',
      wallet: WALLET,
      chain: 'base',
      token: 'USDC',
      gateway: `http://${HOST}:${PORT}`,
      services: Object.entries(PREMIUM).map(([ep, info]) => ({
        endpoint: ep,
        cost_cents: info.cost,
        cost_dollars: `$${(info.cost / 100).toFixed(2)}`,
        description: info.desc,
      })),
    });
    return;
  }

  // Premium endpoints
  const service = PREMIUM[path];
  if (method === 'POST' && service) {
    s.requests++;
    
    const payment = req.headers['x-x402-payment'];
    if (!payment) {
      saveStats(s);
      json(res, {
        status: 'payment_required',
        endpoint: path,
        cost_cents: service.cost,
        cost_dollars: `$${(service.cost / 100).toFixed(2)}`,
        wallet: WALLET,
        chain: 'base',
        token: 'USDC',
        instructions: [
          `Send ${service.cost}¢ USDC to ${WALLET} on Base chain`,
          'Retry the same request with header:',
          'X-X402-Payment: <your_transaction_hash>'
        ],
      }, 402);
      return;
    }

    // Payment provided - process
    const data = await parseBody(req);
    s.payments++;
    s.revenue_cents += service.cost;
    saveStats(s);

    json(res, {
      status: 'paid',
      endpoint: path,
      cost_cents: service.cost,
      payment_tx: payment,
      message: `Payment received. Processing ${path.replace('/v1/', '')} request.`,
      result: {
        mode: path.replace('/v1/', ''),
        text_length: (data.text || '').length,
        status: 'queued_for_processing',
      }
    });
    return;
  }

  // 404
  json(res, { error: 'not_found', endpoints: Object.keys(PREMIUM) }, 404);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[x402-server] Running on port ${PORT}`);
  console.log(`[x402-server] Wallet: ${WALLET}`);
  console.log(`[x402-server] Premium endpoints: ${Object.keys(PREMIUM).join(', ')}`);
});
