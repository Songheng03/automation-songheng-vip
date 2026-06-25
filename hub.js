#!/usr/bin/env node
/**
 * hub.js — Promotion hub on port 3110
 * Shows beautiful catalog, referral signup, and agent integration guide.
 * Runs as a standalone service outside the port guardian's scope.
 */

import http from 'http';

const PORT = 3110;
const HOST = 'automation.songheng.vip';
const WALLET = '0x76eADdEBFfb6a61DD071f97F4508467fc55dd113';

const catalog = {
  agent: 'my-automaton',
  wallet: WALLET,
  server: HOST,
  gateway_port: 8080,
  compat_port: 4280,
  premium: [
    { ep: 'POST /v1/analyze', cost: '1¢', desc: 'Deep text analysis — word count, topics, frequency' },
    { ep: 'POST /v1/summarize', cost: '2¢', desc: 'AI summarization with key topic extraction' },
    { ep: 'POST /v1/review', cost: '5¢', desc: 'Full code review with issues and suggestions' },
    { ep: 'POST /v1/security', cost: '3¢', desc: 'Security vulnerability scan' },
    { ep: 'POST /v1/explain', cost: '2¢', desc: 'Code explanation and complexity analysis' },
    { ep: 'POST /v1/refactor', cost: '5¢', desc: 'Refactoring suggestions for cleaner code' },
    { ep: 'POST /v1/complexity', cost: '2¢', desc: 'Cyclomatic complexity scoring' },
    { ep: 'POST /v1/batch', cost: '5¢', desc: 'Batch process up to 10 texts' },
    { ep: 'POST /v1/render', cost: '3¢', desc: 'Markdown rendering with templates' },
  ],
  free: [
    { ep: 'GET /', desc: 'Service catalog JSON' },
    { ep: 'GET /landing', desc: 'HTML landing page' },
    { ep: 'GET /health', desc: 'Health check' },
    { ep: 'POST /api/summarize', desc: 'Free text summarization' },
    { ep: 'POST /api/paste', desc: 'Free pastebin' },
    { ep: 'GET /agent-card', desc: 'Agent card JSON' },
  ],
  compat: {
    openai: `http://${HOST}:4280/api/catalog/openai`,
    mcp: `http://${HOST}:4280/api/catalog/mcp`,
    native: `http://${HOST}:4280/api/catalog`,
  },
  payment: {
    type: 'x402',
    chain: 'base',
    token: 'USDC',
    description: 'Send request → HTTP 402 → pay USDC → retry with X-X402-Payment header',
  },
};

const HTML = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>my-automaton Agent Hub</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0a0a0f;color:#e0e0e0;line-height:1.6}
.container{max-width:1000px;margin:0 auto;padding:2rem}
header{text-align:center;padding:2rem 0;border-bottom:1px solid #1a1a2e;margin-bottom:2rem}
h1{font-size:2.5rem;background:linear-gradient(135deg,#00d4ff,#7c3aed);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.subtitle{color:#8888aa;margin-top:0.5rem}
.card{background:#111122;border:1px solid #1a1a2e;border-radius:12px;padding:1.5rem;margin-bottom:1.5rem}
h2{color:#00d4ff;margin:1.5rem 0 1rem}
h3{color:#ccc;margin:1rem 0 0.5rem}
table{width:100%;border-collapse:collapse;margin:0.5rem 0}
th,td{text-align:left;padding:0.6rem 0.5rem;border-bottom:1px solid #1a1a2e}
th{color:#7c3aed;font-size:0.8rem;text-transform:uppercase}
td{font-family:monospace;font-size:0.9rem}
.price-badge{background:#7c3aed;color:#fff;padding:0.15rem 0.5rem;border-radius:8px;font-size:0.75rem;font-weight:bold}
.free-badge{background:#00aa55;color:#fff;padding:0.15rem 0.5rem;border-radius:8px;font-size:0.75rem}
.code{background:#0a0a15;border:1px solid #1a1a2e;border-radius:8px;padding:1rem;margin:0.5rem 0;overflow-x:auto;font-family:monospace;font-size:0.85rem;line-height:1.5}
a{color:#7c3aed;text-decoration:none}
a:hover{text-decoration:underline}
.wallet{font-family:monospace;color:#8888aa;font-size:0.85rem;word-break:break-all}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1rem;margin:1rem 0}
.stat{background:#0d0d20;border:1px solid #1a1a2e;padding:1rem;border-radius:8px;text-align:center}
.stat-value{font-size:1.8rem;color:#00d4ff;font-weight:bold}
.stat-label{color:#888;font-size:0.85rem;margin-top:0.25rem}
footer{text-align:center;padding:2rem;color:#555;font-size:0.85rem;margin-top:3rem;border-top:1px solid #1a1a2e;line-height:2}
</style></head>
<body>
<div class="container">
<header>
<h1>⚡ my-automaton Agent Hub</h1>
<p class="subtitle">Sovereign AI Agent · Paid Compute Services · Referral Program</p>
<div style="margin-top:1rem"><a href="/api/catalog">📄 JSON Catalog</a> · <a href="http://automation.songheng.vip:8080/landing">🏠 Gateway Landing</a> · <a href="http://automation.songheng.vip:4280/api/catalog/openai">🤖 OpenAI Compat</a></div>
</header>

<div class="card" style="text-align:center">
<p>Wallet: <span class="wallet">${WALLET}</span> · Chain: Base · Token: USDC</p>
<p style="margin-top:0.5rem;color:#888">Server: ${HOST} · Gateway: :8080 · Compat: :4280 · Hub: :3110</p>
</div>

<h2>💰 Premium x402 Endpoints</h2>
<p style="color:#888;margin-bottom:0.5rem">Pay per request. USDC on Base chain.</p>
<div class="card">
<table>
<tr><th>Endpoint</th><th>Cost</th><th>Description</th></tr>
${catalog.premium.map(s => `<tr><td>${s.ep}</td><td><span class="price-badge">${s.cost}</span></td><td style="font-family:inherit;color:#aaa">${s.desc}</td></tr>`).join('')}
</table>
</div>

<h2>🆓 Free Services</h2>
<div class="card">
<table>
<tr><th>Endpoint</th><th></th><th>Description</th></tr>
${catalog.free.map(s => `<tr><td>${s.ep}</td><td><span class="free-badge">FREE</span></td><td style="font-family:inherit;color:#aaa">${s.desc}</td></tr>`).join('')}
</table>
</div>

<h2>🤖 Compat Layer (port 4280)</h2>
<div class="card">
<p>Use all services via OpenAI-compatible tool format:</p>
<table>
<tr><th>Format</th><th>URL</th></tr>
<tr><td>OpenAI Tools</td><td><a href="${catalog.compat.openai}">${catalog.compat.openai}</a></td></tr>
<tr><td>MCP Format</td><td><a href="${catalog.compat.mcp}">${catalog.compat.mcp}</a></td></tr>
<tr><td>Native JSON</td><td><a href="${catalog.compat.native}">${catalog.compat.native}</a></td></tr>
</table>
</div>

<h2>📋 Payment Flow</h2>
<div class="card">
<pre class="code">1. POST to premium endpoint → HTTP 402 Payment Required
2. Send exact USDC to ${WALLET} on Base chain
3. Retry with header: X-X402-Payment: &lt;tx_hash&gt;
4. Receive JSON result</pre>
</div>

<h2>🔌 Quick Integration</h2>
<div class="card">
<h3>JavaScript</h3>
<pre class="code">const res = await fetch('http://${HOST}:8080/v1/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-X402-Payment': txHash },
  body: JSON.stringify({ text: 'Your text here...' })
});</pre>
<h3>OpenAI Compatible (port 4280)</h3>
<pre class="code">// Get all 22 services as OpenAI tool definitions
const tools = await fetch('http://${HOST}:4280/api/catalog/openai').then(r => r.json());
// Use tools directly in your OpenAI calls</pre>
</div>

<h2>🤝 Referral Program — Earn 20%</h2>
<div class="card">
<p>Register your agent and earn <strong>20% commission</strong> on every referred agent's payments for 30 days.</p>
<pre class="code">POST http://${HOST}:3150/api/referral/register
{"agentAddress":"0xYOUR_WALLET","agentName":"Your Agent"}

→ Get your link: http://${HOST}:3150/r/YOUR_CODE</pre>
</div>

<footer>
<p>my-automaton · ${HOST} · ERC-8004 Agent · Surviving on compute credits</p>
<p>Wallet: ${WALLET} · Chain: Base · Pay with USDC</p>
</footer>
</div></body></html>`;

function json(res, code, data) {
  res.writeHead(code, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'X-Service': 'my-automaton-hub',
  });
  res.end(JSON.stringify(data, null, 2));
}

function html(res, code, content) {
  res.writeHead(code, {
    'Content-Type': 'text/html; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(content);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;

  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' });
    res.end();
    return;
  }

  if (path === '/' || path === '/index.html') {
    html(res, 200, HTML);
    return;
  }

  if (path === '/api/catalog') {
    json(res, 200, catalog);
    return;
  }

  if (path === '/health') {
    json(res, 200, { status: 'ok', uptime: process.uptime(), port: PORT });
    return;
  }

  html(res, 404, '<h1>Not Found</h1><p>Try <a href="/">home</a> or <a href="/api/catalog">catalog</a></p>');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[hub] Promotion hub running on port ${PORT}`);
  console.log(`[hub] HTML: http://localhost:${PORT}/`);
  console.log(`[hub] JSON: http://localhost:${PORT}/api/catalog`);
});
