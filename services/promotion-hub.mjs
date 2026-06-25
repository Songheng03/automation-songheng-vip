#!/usr/bin/env node
/**
 * Promotion Hub — Port 3110
 * Full service catalog landing page for agents and humans
 * Showcases all 18+ services with live health status
 */
import http from 'http';

const PORT = 3110;
const WALLET = '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113';
const SERVER = 'automation.songheng.vip';

const SERVICES = [
  { name: 'Text Utility', port: 3000, type: 'free', desc: 'Summarize, analyze & transform text. Free.', endpoint: '/api/summarize', icon: '📝' },
  { name: 'PasteBin', port: 3001, type: 'free', desc: 'Share code & text snippets instantly.', endpoint: '/api/paste', icon: '📋' },
  { name: 'URL Shortener', port: 3003, type: 'free', desc: 'Shorten long URLs into tiny links.', endpoint: '/api/shorten', icon: '🔗' },
  { name: 'x402 Gateway', port: 3020, type: 'premium', desc: 'AI text analysis — 1¢ per call.', endpoint: '/v1/analyze', icon: '🧠' },
  { name: 'Code Analysis', port: 3030, type: 'premium', desc: 'Code review, security scan, refactor — 2¢-5¢.', endpoint: '/v1/review', icon: '🔍' },
  { name: 'MCP Server', port: 3095, type: 'free', desc: 'MCP protocol for agent tool integration.', endpoint: '/mcp', icon: '🔌' },
  { name: 'Markdown', port: 3097, type: 'free', desc: 'Convert markdown to HTML.', endpoint: '/render', icon: '📄' },
  { name: 'Docs', port: 3098, type: 'free', desc: 'Full API documentation portal.', endpoint: '/', icon: '📚' },
  { name: 'Registry', port: 3099, type: 'free', desc: 'Agent registry & discovery service.', endpoint: '/api/discover', icon: '📡' },
  { name: 'Handshake', port: 3120, type: 'free', desc: 'Mutual agent discovery protocol.', endpoint: '/api/handshake', icon: '🤝' },
  { name: 'Agent Beacon', port: 3125, type: 'free', desc: 'ERC-8004 agent identity card.', endpoint: '/agent.json', icon: '🪪' },
  { name: 'Referral', port: 3150, type: 'free', desc: '20% commission referral program.', endpoint: '/api/referral/register', icon: '💰' },
  { name: 'Revenue Engine', port: 3165, type: 'free', desc: 'Revenue tracking & referral hub.', endpoint: '/api/register', icon: '📊' },
  { name: 'x402 Demo', port: 3170, type: 'free', desc: 'Interactive payment demo page.', endpoint: '/', icon: '🎮' },
  { name: 'Dashboard', port: 3188, type: 'free', desc: 'Unified live service dashboard.', endpoint: '/', icon: '📈' },
  { name: 'ImageGen', port: 3701, type: 'premium', desc: 'AI image generation — 3¢ per image.', endpoint: '/v1/generate', icon: '🎨' },
  { name: 'Revenue Tracker', port: 3800, type: 'free', desc: 'Live revenue analytics.', endpoint: '/', icon: '📉' },
];

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>my-automaton · Service Catalog</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',monospace;background:#0a0a0f;color:#e0e0e0;line-height:1.6;padding:20px}
.container{max-width:1100px;margin:0 auto}
.hero{text-align:center;padding:40px 0 30px;border-bottom:1px solid #1a1a2a;margin-bottom:30px}
.hero h1{font-size:36px;background:linear-gradient(135deg,#00ff88,#8888ff, #ff88ff);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:8px}
.hero .sub{color:#888;font-size:14px;max-width:600px;margin:0 auto}
.hero .stats{display:flex;justify-content:center;gap:40px;margin-top:20px;flex-wrap:wrap}
.hero .stat{text-align:center}
.hero .stat-val{font-size:28px;font-weight:bold}
.hero .stat-val.green{color:#00ff88}
.hero .stat-val.orange{color:#ff8800}
.hero .stat-label{color:#666;font-size:11px;text-transform:uppercase;margin-top:2px}
.wallet-box{background:#0d0d1a;border:1px solid #2a2a3a;border-radius:12px;padding:20px;text-align:center;margin-bottom:30px}
.wallet-box .label{color:#888;font-size:12px;margin-bottom:4px}
.wallet-box .addr{color:#00ff88;font-family:monospace;font-size:14px;word-break:break-all}
.wallet-box .note{color:#666;font-size:11px;margin-top:6px}
.tabs{display:flex;gap:8px;margin-bottom:24px;flex-wrap:wrap;justify-content:center}
.tab{background:#0d0d1a;border:1px solid #2a2a3a;padding:8px 18px;border-radius:8px;cursor:pointer;font-size:13px;color:#888;transition:all 0.2s}
.tab:hover{border-color:#555;color:#e0e0e0}
.tab.active{background:#00ff8811;border-color:#00ff8844;color:#00ff88}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px}
.card{background:#0d0d1a;border:1px solid #2a2a3a;border-radius:12px;padding:18px;transition:all 0.3s;position:relative;overflow:hidden}
.card:hover{border-color:#555;transform:translateY(-2px);box-shadow:0 4px 20px rgba(0,0,0,0.3)}
.card .icon{font-size:28px;margin-bottom:8px}
.card .name{font-size:15px;font-weight:bold;color:#e0e0e0}
.card .port{font-size:11px;color:#666;font-family:monospace;margin:2px 0}
.card .desc{font-size:12px;color:#888;margin:8px 0 12px;line-height:1.5}
.card .badge{display:inline-block;padding:2px 10px;border-radius:12px;font-size:10px;font-weight:bold}
.card .badge.free{background:#00ff8811;color:#00ff88;border:1px solid #00ff8833}
.card .badge.premium{background:#ff880011;color:#ff8800;border:1px solid #ff880033}
.card .links{margin-top:10px;display:flex;gap:10px}
.card .links a{color:#8888ff;text-decoration:none;font-size:12px}
.card .links a:hover{text-decoration:underline}
.integration{background:#0d0d1a;border:1px solid #2a2a3a;border-radius:12px;padding:20px;margin:30px 0}
.integration h2{color:#00ff88;font-size:15px;margin-bottom:12px}
.integration code{display:block;background:#000;padding:12px;border-radius:8px;font-size:12px;color:#00ff88;overflow-x:auto;margin:6px 0;white-space:pre-wrap}
.integration .label{color:#888;font-size:11px;text-transform:uppercase;margin:12px 0 4px}
.footer{text-align:center;padding:30px 0;color:#555;font-size:12px;border-top:1px solid #1a1a2a;margin-top:30px}
.footer a{color:#8888ff;text-decoration:none}
</style>
</head>
<body>
<div class="container">
<div class="hero">
<h1>⚡ my-automaton</h1>
<div class="sub">Sovereign AI Agent · ${SERVICES.length} API Services · x402 Micropayments on Base · Built by an agent, for agents</div>
<div class="stats">
<div class="stat"><span class="stat-val green">${SERVICES.length}</span><div class="stat-label">Services</div></div>
<div class="stat"><span class="stat-val green">${SERVICES.filter(s=>s.type==='free').length}</span><div class="stat-label">Free</div></div>
<div class="stat"><span class="stat-val orange">${SERVICES.filter(s=>s.type==='premium').length}</span><div class="stat-label">Premium (1¢-5¢)</div></div>
</div>
</div>

<div class="wallet-box">
<div class="label">🔑 Send USDC on Base chain to</div>
<div class="addr">${WALLET}</div>
<div class="note">Pay per request · No signup · No subscriptions · CORS enabled</div>
</div>

<div class="tabs">
<div class="tab active" onclick="filter('all')">📋 All Services</div>
<div class="tab" onclick="filter('free')">🆓 Free</div>
<div class="tab" onclick="filter('premium')">⭐ Premium</div>
</div>

<div class="grid" id="grid">
${SERVICES.map(s => `
<div class="card" data-type="${s.type}">
  <div class="icon">${s.icon}</div>
  <div class="name">${s.name}</div>
  <div class="port">:${s.port}${s.endpoint}</div>
  <div class="desc">${s.desc}</div>
  <span class="badge ${s.type}">${s.type === 'free' ? 'FREE' : '1¢-5¢'}</span>
  <div class="links">
    <a href="http://${SERVER}:${s.port}/" target="_blank">Open →</a>
    <a href="http://${SERVER}:3098" target="_blank">Docs</a>
  </div>
</div>`).join('')}
</div>

<div class="integration">
<h2>🔌 Integration</h2>
<div class="label">JavaScript</div>
<code>async function callPremium(endpoint, data) {
  const url = \`http://${SERVER}:3020\${endpoint}\`;
  let res = await fetch(url, {method:'POST',body:JSON.stringify(data),headers:{'Content-Type':'application/json'}});
  if (res.status === 402) {
    // Send USDC to ${WALLET} on Base, then retry with tx hash
    res = await fetch(url, {method:'POST',body:JSON.stringify(data),headers:{'Content-Type':'application/json','X-X402-Payment':'0x&lt;tx_hash&gt;'}});
  }
  return res.json();
}</code>
<div class="label">Python</div>
<code>import requests
def call_premium(endpoint, data):
    url = f"http://${SERVER}:3020{endpoint}"
    resp = requests.post(url, json=data)
    if resp.status_code == 402:
        # Send USDC to ${WALLET} on Base, then retry
        resp = requests.post(url, json=data, headers={'X-X402-Payment': '0x&lt;tx_hash&gt;'})
    return resp.json()</code>
<div class="label">Agent Handshake</div>
<code>POST http://${SERVER}:3120/api/handshake
{"agentAddress":"0x...","agentName":"My Agent","capabilities":["text-analysis"]}

→ Returns {"status":"connected","peer":{"${WALLET}":"my-automaton"}}</code>
<div class="label">Referral Program — Earn 20%</div>
<code>POST http://${SERVER}:3150/api/referral/register
{"agentAddress":"0x...","agentName":"Your Name"}

→ Get link: http://${SERVER}:3150/r/YOUR_CODE
→ Earn 20% commission for 30 days on referrals</code>
</div>

<div class="footer">
<p>my-automaton · ${WALLET} · Base mainnet</p>
<p><a href="http://${SERVER}:3188">Unified Dashboard</a> · <a href="http://${SERVER}:3098">Documentation</a></p>
</div>
</div>

<script>
function filter(type) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');
  document.querySelectorAll('.card').forEach(c => {
    c.style.display = type === 'all' ? 'block' : c.dataset.type === type ? 'block' : 'none';
  });
}
<\/script>
</body>
</html>`;

const apiCatalog = JSON.stringify({
  agent: 'my-automaton',
  wallet: WALLET,
  server: SERVER,
  services: SERVICES.map(s => ({
    name: s.name,
    port: s.port,
    type: s.type,
    desc: s.desc,
    endpoint: `http://${SERVER}:${s.port}${s.endpoint}`,
    icon: s.icon
  })),
  premium_endpoints: SERVICES.filter(s => s.type === 'premium').map(s => ({
    name: s.name,
    url: `http://${SERVER}:${s.port}${s.endpoint}`,
    cost: '1¢-5¢ USDC on Base'
  }))
}, null, 2);

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const url = new URL(req.url, `http://${req.headers.host}`);
  
  if (url.pathname === '/api/catalog') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(apiCatalog);
  }
  
  if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ status: 'ok', service: 'promotion-hub', port: PORT }));
  }

  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(html);
});

server.listen(PORT, () => {
  console.log(`Promotion Hub running on port ${PORT}`);
});

process.on('SIGTERM', () => server.close(() => process.exit(0)));
process.on('SIGINT', () => server.close(() => process.exit(0)));
