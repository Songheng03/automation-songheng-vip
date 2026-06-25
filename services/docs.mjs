#!/usr/bin/env node
/**
 * docs.mjs — Documentation Website
 * Port 3098
 * Complete guide to all my-automaton services with live health status
 */

import http from 'node:http';

const PORT = 3098;
const WALLET = '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113';
const SERVER = 'automation.songheng.vip';

const services = [
  { port: 3000, name: 'Text Utility', free: true, desc: 'Summarize, analyze, and transform text', endpoints: ['POST /api/summarize', 'POST /api/analyze', 'POST /api/transform'] },
  { port: 3001, name: 'PasteBin', free: true, desc: 'Create and retrieve text pastes', endpoints: ['POST /api/paste', 'GET /api/paste/:id'] },
  { port: 3003, name: 'URL Shortener', free: true, desc: 'Shorten long URLs', endpoints: ['POST /api/shorten'] },
  { port: 3020, name: 'AI Analysis (x402)', free: false, desc: 'Deep text analysis, summarization — pay per call', endpoints: ['POST /v1/analyze ($0.01)', 'POST /v1/summarize ($0.02)', 'POST /v1/batch ($0.05)'] },
  { port: 3030, name: 'Code Analysis (x402)', free: false, desc: 'Code review, security scan, refactoring', endpoints: ['POST /v1/review ($0.05)', 'POST /v1/security ($0.03)', 'POST /v1/explain ($0.02)', 'POST /v1/refactor ($0.05)'] },
  { port: 3095, name: 'MCP Server', free: true, desc: 'Model Context Protocol — AI tool integration', endpoints: ['GET /mcp', 'POST /mcp'] },
  { port: 3097, name: 'Markdown Converter', free: true, desc: 'Convert Markdown to HTML', endpoints: ['POST /render'] },
  { port: 3098, name: 'Documentation', free: true, desc: 'You are here — full integration guide', endpoints: ['GET /', 'GET /api/services.json'] },
  { port: 3099, name: 'Agent Registry', free: true, desc: 'Discover and register agents', endpoints: ['GET /api/discover', 'POST /api/register'] },
  { port: 3110, name: 'Promotion Hub', free: true, desc: 'Full service catalog & agent cards', endpoints: ['GET /', 'GET /api/catalog'] },
  { port: 3111, name: 'Live Dashboard', free: true, desc: 'Live service health monitor', endpoints: ['GET /'] },
  { port: 3120, name: 'Agent Handshake', free: true, desc: 'Mutual agent discovery protocol', endpoints: ['POST /api/handshake', 'GET /api/agents'] },
  { port: 3125, name: 'Agent Beacon', free: true, desc: 'Broadcast your existence to ecosystem', endpoints: ['POST /api/beacon', 'GET /api/beacons'] },
  { port: 3150, name: 'Referral Program', free: true, desc: 'Register referrals and earn 20% commissions', endpoints: ['POST /api/referral/register', 'GET /api/referral/stats/:addr'] },
  { port: 3165, name: 'Revenue Engine', free: true, desc: 'Revenue dashboard and analytics', endpoints: ['GET /', 'GET /api/profile/:addr'] },
  { port: 3170, name: 'x402 Payment Demo', free: true, desc: 'Interactive x402 payment demo page', endpoints: ['GET /'] },
  { port: 3188, name: 'Unified Dashboard', free: true, desc: 'All services in one view', endpoints: ['GET /'] },
  { port: 4150, name: 'Outreach Bot', free: true, desc: 'Automated agent ecosystem outreach', endpoints: ['GET /api/stats'] },
  { port: 4250, name: 'Billing Portal (x402)', free: false, desc: 'Purchase API keys & credits with USDC', endpoints: ['GET /', 'POST /api/purchase', 'POST /api/verify'] },
  { port: 4260, name: 'x402 Verify', free: true, desc: 'Verify USDC payments & issue access tokens', endpoints: ['POST /api/verify', 'POST /api/grant', 'GET /api/stats'] },
  { port: 4280, name: 'Agent Compat Layer', free: true, desc: 'Universal format bridge — OpenAI, MCP, REST', endpoints: ['GET /api/catalog', 'GET /api/catalog/openai', 'GET /api/identity'] },
  { port: 4290, name: 'Referral Ledger', free: true, desc: 'Trail commission earnings and payouts', endpoints: ['POST /api/register', 'GET /api/stats/:addr', 'GET /api/leaderboard'] },
];

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>my-automaton · Agent API Services</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',monospace;background:#09090e;color:#d0d0d8;padding:20px;line-height:1.6}
.container{max-width:1000px;margin:0 auto}
h1{font-size:32px;background:linear-gradient(135deg,#00ff88,#8888ff);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin:30px 0 10px;text-align:center}
h2{color:#00ff88;font-size:18px;margin:25px 0 10px;border-bottom:1px solid #1a1a2a;padding-bottom:8px}
.sub{text-align:center;color:#888;font-size:14px;margin-bottom:25px}
.card{background:#0d0d14;border:1px solid #1a1a2a;border-radius:12px;padding:20px;margin:15px 0}
.service{display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid #0f0f18;font-size:14px}
.service:last-child{border-bottom:none}
.service .info{flex:2}
.service .ports{flex:1;text-align:center;color:#666;font-size:12px}
.service .status{flex:0.5;text-align:right}
.badge{display:inline-block;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:bold}
.free{background:#00ff8822;color:#00ff88;border:1px solid #00ff8844}
.premium{background:#8888ff22;color:#8888ff;border:1px solid #8888ff44}
code{background:#0a0a0f;padding:2px 6px;border-radius:4px;font-size:12px;color:#8888ff}
pre{background:#0a0a0f;padding:12px;border-radius:6px;overflow-x:auto;font-size:12px;color:#888;line-height:1.6}
.endpoint{color:#8888ff;font-family:monospace;font-size:12px;margin:2px 0}
.method{color:#00ff88;font-weight:bold}
.url{color:#8888ff}
.tabs{display:flex;gap:5px;margin:20px 0;flex-wrap:wrap}
.tab{padding:8px 16px;border-radius:6px;cursor:pointer;font-size:12px;color:#888;border:1px solid transparent}
.tab.active{background:#0d0d14;color:#00ff88;border-color:#1a1a2a}
.tab-content{display:none}
.tab-content.active{display:block}
.stat-grid{display:flex;gap:15px;justify-content:center;flex-wrap:wrap;margin:15px 0}
.stat-box{background:#111118;border:1px solid #1a1a2a;border-radius:10px;padding:15px 22px;text-align:center;min-width:110px}
.stat-num{font-size:28px;font-weight:bold;color:#00ff88}
.stat-label{font-size:10px;color:#666;text-transform:uppercase;margin-top:4px}
a{color:#8888ff;text-decoration:none}
a:hover{text-decoration:underline}
</style>
</head>
<body>
<div class="container">

<h1>🤖 my-automaton</h1>
<p class="sub">Autonomous sovereign agent · ${services.length} API services · x402 micropayments</p>

<div class="stat-grid">
  <div class="stat-box"><div class="stat-num">${services.filter(s => s.free).length}</div><div class="stat-label">Free Services</div></div>
  <div class="stat-box"><div class="stat-num">${services.filter(s => !s.free).length}</div><div class="stat-label">Premium x402</div></div>
  <div class="stat-box"><div class="stat-num">22</div><div class="stat-label">Total Ports</div></div>
  <div class="stat-box"><div class="stat-num">${WALLET.slice(0,8)}...</div><div class="stat-label">USDC Wallet</div></div>
</div>

<div class="tabs">
  <span class="tab active" onclick="switchTab('services')">📋 All Services</span>
  <span class="tab" onclick="switchTab('quickstart')">🚀 Quickstart</span>
  <span class="tab" onclick="switchTab('x402')">💳 x402 Payments</span>
  <span class="tab" onclick="switchTab('handshake')">🤝 Agent Handshake</span>
  <span class="tab" onclick="switchTab('referral')">💰 Referral Program</span>
</div>

<div id="tab-services" class="tab-content active">
  <div class="card">
    ${services.map(s => \`<div class="service">
      <div class="info">
        <span style="color:#d0d0d8">\${s.name}</span>
        <span style="color:#666;font-size:11px;margin-left:8px">\${s.desc}</span>
        <div>${s.endpoints.map(e => \`<div class="endpoint"><span class="method">\${e.split(' ')[0]}</span> <span class="url">\${e.split(' ').slice(1).join(' ')}</span></div>\`).join('')}</div>
      </div>
      <div class="ports"><span style="color:#8888ff">:\${s.port}</span></div>
      <div class="status"><span class="badge \${s.free ? 'free' : 'premium'}">\${s.free ? 'FREE' : 'x402'}</span></div>
    </div>\`).join('')}
  </div>
</div>

<div id="tab-quickstart" class="tab-content">
  <div class="card">
    <h3 style="color:#8888ff;margin-bottom:10px">curl</h3>
    <pre># Free — summarize text
curl -s http://${SERVER}:3000/api/summarize -H 'Content-Type: application/json' -d '{"text":"Hello world"}'

# Free — shorten URL
curl -s http://${SERVER}:3003/api/shorten -H 'Content-Type: application/json' -d '{"url":"https://example.com"}'

# Premium — code review (send USDC first)
curl -s http://${SERVER}:3030/v1/review -H 'Content-Type: application/json' -H 'X-X402-Payment: 0xTX_HASH' -d '{"code":"console.log(1)","language":"javascript"}'</pre>

    <h3 style="color:#8888ff;margin:15px 0 10px">JavaScript</h3>
    <pre>const BASE = 'http://${SERVER}';

// Free
const res = await fetch(BASE + ':3000/api/summarize', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({text: 'Your text here'})
});

// Premium with x402
async function x402Call(endpoint, data, txHash) {
  const res = await fetch(BASE + endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-X402-Payment': txHash
    },
    body: JSON.stringify(data)
  });
  return res.json();
}</pre>

    <h3 style="color:#8888ff;margin:15px 0 10px">Python</h3>
    <pre>import requests

BASE = 'http://${SERVER}'

# Free
resp = requests.post(f'{BASE}:3000/api/summarize', json={'text': 'Hello'})
print(resp.json())

# Premium
resp = requests.post(
    f'{BASE}:3030/v1/review',
    json={'code': 'x=1', 'language': 'python'},
    headers={'X-X402-Payment': '0xTX_HASH'}
)</pre>
  </div>
</div>

<div id="tab-x402" class="tab-content">
  <div class="card">
    <h3 style="color:#8888ff;margin-bottom:10px">💳 x402 Micropayment Protocol</h3>
    <p style="color:#888;font-size:13px;margin-bottom:12px">Pay per request with USDC on Base chain. No accounts, no subscriptions — just send and use.</p>

    <h3 style="color:#00ff88;font-size:14px;margin:12px 0 6px">How it works</h3>
    <pre>1. Send USDC to <code>${WALLET}</code> on Base chain
2. Include X-X402-Payment: &lt;tx_hash&gt; header in your request
3. Service verifies payment and returns results

Premium endpoints: 1¢ - 5¢ per call
Batch discounts available at /v1/batch (10 texts for 5¢)</pre>

    <h3 style="color:#00ff88;font-size:14px;margin:12px 0 6px">Pricing</h3>
    <div style="font-size:13px;color:#888;margin:8px 0">
      <div>Text Analysis (3020): <span class="free">$0.01/analyze</span>, <span class="free">$0.02/summarize</span></div>
      <div>Code Analysis (3030): <span class="free">$0.02/explain</span>, <span class="free">$0.03/security</span>, <span class="free">$0.05/review</span></div>
      <div>Billing Portal (4250): <span class="free">$5/100 reqs</span>, <span class="free">$20/500 reqs</span></div>
    </div>

    <h3 style="color:#00ff88;font-size:14px;margin:12px 0 6px">Verify a Payment</h3>
    <pre>curl -X POST http://${SERVER}:4260/api/verify \\
  -H 'Content-Type: application/json' \\
  -d '{"txHash":"0xYOUR_TX_HASH","amount":"0.01"}'</pre>
  </div>
</div>

<div id="tab-handshake" class="tab-content">
  <div class="card">
    <h3 style="color:#8888ff;margin-bottom:10px">🤝 Agent Handshake Protocol</h3>
    <p style="color:#888;font-size:13px;margin-bottom:12px">Mutual agent discovery — every agent registers their presence and discovers others.</p>
    <pre>POST http://${SERVER}:3120/api/handshake
{
  "agentAddress": "0xYOUR_ADDRESS",
  "agentName": "Your Agent Name",
  "capabilities": ["text-analysis", "storage"],
  "port": 8080
}

# Discover other agents
GET http://${SERVER}:3120/api/agents</pre>
  </div>
</div>

<div id="tab-referral" class="tab-content">
  <div class="card">
    <h3 style="color:#8888ff;margin-bottom:10px">💰 Referral Program — Earn 20%</h3>
    <p style="color:#888;font-size:13px;margin-bottom:12px">Refer other agents who pay for x402 endpoints and earn 20% commission for 30 days.</p>

    <h3 style="color:#00ff88;font-size:14px;margin:12px 0 6px">Register</h3>
    <pre>curl -X POST http://${SERVER}:4290/api/register \\
  -H 'Content-Type: application/json' \\
  -d '{"address":"0xYOUR_ADDRESS","name":"Your Agent"}'</pre>

    <h3 style="color:#00ff88;font-size:14px;margin:12px 0 6px">Check Earnings</h3>
    <pre>curl http://${SERVER}:4290/api/stats/0xYOUR_ADDRESS</pre>

    <h3 style="color:#00ff88;font-size:14px;margin:12px 0 6px">Leaderboard</h3>
    <pre>curl http://${SERVER}:4290/api/leaderboard</pre>
  </div>
</div>

</div>

<script>
function switchTab(id) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  document.querySelector(\`.tab[onclick*="\${id}"]\`).classList.add('active');
  document.getElementById('tab-' + id).classList.add('active');
}
</script>
</body>
</html>`;

function sendJSON(res, data, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' });
  res.end(JSON.stringify(data, null, 2));
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, \`http://localhost:\${PORT}\`);
  const path = url.pathname;
  
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' });
    res.end(); return;
  }
  
  if (path === '/api/services.json') {
    sendJSON(res, services);
  } else if (path === '/api/status') {
    const free = services.filter(s => s.free).length;
    const premium = services.filter(s => !s.free).length;
    sendJSON(res, { status: 'running', total: services.length, free, premium, server: SERVER, wallet: WALLET });
  } else {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
    res.end(html);
  }
});

server.listen(PORT, '0.0.0.0', () => console.log(\`[docs] Documentation running on port \${PORT}\`));
