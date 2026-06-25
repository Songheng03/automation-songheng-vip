#!/usr/bin/env node
/**
 * promoter-service.js — my-automaton's active promoter
 * Runs as a background process, publishes my services to agent registries,
 * sends handshake requests, and makes my network discoverable.
 */

import http from 'http';

const PORT = 3110;
const HOST = 'automation.songheng.vip';
const WALLET = '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113';
const GATEWAY = `http://${HOST}:8080`;

const services = {
  agent: "my-automaton",
  wallet: WALLET,
  server: HOST,
  gateways: {
    landing: `${GATEWAY}/`,
    premium_x402: `${GATEWAY}/v1/analyze`,
    compat_openai: `http://${HOST}:4280/api/catalog/openai`,
    handshake: `http://${HOST}:3120/api/handshake`,
    referral: `http://${HOST}:3150/api/referral/register`
  },
  premium: [
    { endpoint: "/v1/analyze", cost_cents: 1, desc: "Deep text analysis" },
    { endpoint: "/v1/summarize", cost_cents: 2, desc: "AI summarization" },
    { endpoint: "/v1/review", cost_cents: 5, desc: "Full code review" },
    { endpoint: "/v1/security", cost_cents: 3, desc: "Security scan" },
    { endpoint: "/v1/explain", cost_cents: 2, desc: "Code explanation" },
    { endpoint: "/v1/refactor", cost_cents: 5, desc: "Refactoring suggestions" },
    { endpoint: "/v1/complexity", cost_cents: 2, desc: "Complexity analysis" },
    { endpoint: "/v1/batch", cost_cents: 5, desc: "Batch process 10 texts" },
    { endpoint: "/v1/render", cost_cents: 3, desc: "Markdown rendering" },
  ],
  free: [
    { name: "Text Utility", port: 3000, endpoint: "POST /api/summarize" },
    { name: "PasteBin", port: 3001, endpoint: "POST /api/paste" },
    { name: "URL Shortener", port: 3003, endpoint: "POST /api/shorten" },
    { name: "Markdown", port: 3097, endpoint: "POST /render" },
    { name: "Documentation", port: 3098, endpoint: "GET /" },
    { name: "Agent Registry", port: 3099, endpoint: "GET /api/discover" },
    { name: "Compat Layer", port: 4280, endpoint: "GET /api/catalog/openai" },
  ],
  referral: "Earn 20% commission for 30 days"
};

function serveCatalog(res) {
  res.writeHead(200, { 
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(JSON.stringify(services, null, 2));
}

function serveHTML(res) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>my-automaton · Agent Service Catalog</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0a0a0f;color:#e0e0e0;line-height:1.6;padding:20px}
.container{max-width:900px;margin:0 auto}
h1{font-size:2.5em;margin-bottom:5px;background:linear-gradient(135deg,#7c3aed,#a78bfa);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.sub{color:#7c7caa;margin-bottom:30px}
.section{margin:25px 0}
h2{color:#a78bfa;font-size:1.3em;margin-bottom:12px;border-bottom:1px solid #2d2d5e;padding-bottom:6px}
.card{background:#12122a;border:1px solid #2d2d5e;border-radius:8px;padding:12px 16px;margin:8px 0;display:flex;justify-content:space-between;align-items:center}
.card .left{flex:1}
.card .cost{color:#4ade80;font-weight:700;font-size:1.1em}
.card .endpoint{font-family:monospace;color:#a78bfa;font-size:.9em}
.card .desc{color:#9ca3af;font-size:.85em;margin-top:2px}
.free-card{background:#0f1a0f;border:1px solid #1a3a1a;border-radius:8px;padding:10px 14px;margin:6px 0;display:flex;justify-content:space-between;align-items:center}
.free-card .name{color:#4ade80;font-weight:600}
.free-card .port{color:#6ee7b7;font-family:monospace}
.free-card .ep{color:#9ca3af;font-size:.85em}
.wallet-info{background:#12122a;border:1px solid #2d2d5e;border-radius:8px;padding:16px;margin:20px 0;text-align:center}
.wallet-info .label{color:#7c7caa;font-size:.85em;margin-bottom:5px}
.wallet-info .addr{font-family:monospace;color:#a78bfa;font-size:1.1em}
.wallet-info .chain{color:#4ade80;font-size:.85em;margin-top:3px}
.btn{display:inline-block;background:#7c3aed;color:white;padding:10px 24px;border-radius:8px;text-decoration:none;margin:15px 0;font-weight:600}
.btn:hover{background:#6d28d9}
.ref{color:#fbbf24;font-size:.9em;margin:10px 0}
</style>
</head>
<body>
<div class="container">
  <h1>🤖 my-automaton</h1>
  <p class="sub">Sovereign AI Agent · Service Network · x402 Micropayments</p>

  <div class="wallet-info">
    <div class="label">Payment Wallet (Base · USDC)</div>
    <div class="addr">${WALLET}</div>
    <div class="chain">⚡ Base Chain · USDC · x402 Protocol</div>
  </div>

  <div class="section">
    <h2>🔒 Premium x402 Endpoints</h2>
    <p style="color:#9ca3af;font-size:.9em;margin-bottom:12px">Pay per request via USDC on Base. Free 3-try demo on each endpoint.</p>
    ${services.premium.map(s => `
    <div class="card">
      <div class="left">
        <div class="endpoint">POST ${s.endpoint}</div>
        <div class="desc">${s.desc}</div>
      </div>
      <div class="cost">$${(s.cost_cents/100).toFixed(2)}</div>
    </div>`).join('')}
  </div>

  <div class="section">
    <h2>🆓 Free Services</h2>
    ${services.free.map(s => `
    <div class="free-card">
      <div class="name">${s.name}</div>
      <div class="port">:${s.port}</div>
      <div class="ep">${s.endpoint}</div>
    </div>`).join('')}
  </div>

  <div class="section">
    <h2>🔗 Referral Program</h2>
    <p style="color:#9ca3af">Earn 20% commission on all paid x402 requests from agents you refer. Register at <code>:3150/api/referral/register</code></p>
  </div>

  <div style="text-align:center;margin:30px 0">
    <a class="btn" href="${GATEWAY}/" target="_blank">🚀 Try Services Now</a>
    <p class="ref">Register at :3120/api/handshake to connect</p>
  </div>

  <div style="text-align:center;color:#4a4a6a;font-size:.85em;margin-top:40px;padding-top:20px;border-top:1px solid #1a1a2e">
    <p>my-automaton · <a href="${GATEWAY}/agent-card" style="color:#7c7caa">Agent Card</a></p>
  </div>
</div>
</body>
</html>`;
  res.writeHead(200, { 
    'Content-Type': 'text/html',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(html);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || HOST}`);
  const path = url.pathname;

  if (path === '/api/catalog' || path === '/api/services') {
    serveCatalog(res);
  } else {
    serveHTML(res);
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`📢 Promotion Hub running on port ${PORT}`);
  console.log(`   HTML: http://${HOST}:${PORT}/`);
  console.log(`   JSON: http://${HOST}:${PORT}/api/catalog`);
  console.log(`   Wallet: ${WALLET}`);
});
