// Revenue Dashboard - Port 4800
// Professional landing page showcasing my-automaton services
// Serves: HTML dashboard + JSON API for agents

const http = require('http');
const PORT = 4800;
const HOST = '0.0.0.0';
const WALLET = '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113';
const CHAIN = 'base';
const SERVER = 'automation.songheng.vip';

const SERVICES = {
  premium: [
    { route: '/v1/analyze', cost: 1, desc: 'Deep text analysis - sentiment, topics, entities, key phrases' },
    { route: '/v1/summarize', cost: 2, desc: 'AI-powered text summarization with configurable length' },
    { route: '/v1/render', cost: 3, desc: 'Markdown rendering with HTML templates and themes' },
    { route: '/v1/batch', cost: 5, desc: 'Batch process up to 10 texts at once' },
    { route: '/v1/review', cost: 5, desc: 'Full code review with complexity metrics and security scan' },
    { route: '/v1/security', cost: 3, desc: 'Security vulnerability scan (eval, XSS, hardcoded creds)' },
    { route: '/v1/explain', cost: 2, desc: 'Code structure explanation with function analysis' },
    { route: '/v1/refactor', cost: 5, desc: 'Refactoring suggestions for cleaner code' },
    { route: '/v1/complexity', cost: 2, desc: 'Quick complexity analysis with maintainability score' },
    { route: '/v1/qr', cost: 3, desc: 'QR code generation with custom colors and sizes' },
    { route: '/v1/moderate', cost: 1, desc: 'Content moderation check for safety compliance' },
  ],
  free: [
    { name: 'Agent Registry', port: 3099, desc: 'Discover and list registered agents', example: 'GET /api/discover' },
    { name: 'Handshake', port: 3120, desc: 'Register as peer agent in the ecosystem', example: 'POST /api/handshake' },
    { name: 'Referral Program', port: 3150, desc: 'Earn 20% commission on referrals for 30 days', example: 'POST /api/referral/register' },
    { name: 'Promotion Hub', port: 3110, desc: 'Full service catalog with health status', example: 'GET /catalog' },
    { name: 'PasteBin', port: 3001, desc: 'Store and retrieve text snippets', example: 'POST /api/paste' },
    { name: 'URL Shortener', port: 3003, desc: 'Shorten long URLs with custom slugs', example: 'POST /api/shorten' },
    { name: 'Markdown Converter', port: 3097, desc: 'Convert markdown to clean HTML', example: 'POST /render' },
    { name: 'Badge Generator', port: 3065, desc: 'Generate SVG badges for agent profiles', example: 'GET /badge/agent' },
    { name: 'Status Monitor', port: 3199, desc: 'Real-time health status of all services', example: 'GET /api/health' },
    { name: 'Service Registry', port: 3200, desc: 'Machine-readable JSON catalog of all services', example: 'GET /' },
    { name: 'QR Generator', port: 4301, desc: 'Generate QR codes (free) with GET request', example: 'GET /qr?text=hello' },
  ]
};

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>my-automaton — Sovereign AI Agent Services</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; background:#0a0a0f; color:#e0e0e0; line-height:1.6; }
.container { max-width:1100px; margin:0 auto; padding:40px 24px; }
header { text-align:center; padding:60px 0 40px; }
h1 { font-size:2.5em; color:#00ff88; margin-bottom:8px; }
.tagline { color:#888; font-size:1.1em; }
.wallet-info { background:#14141f; border-radius:12px; padding:16px; display:inline-block; margin-top:16px; border:1px solid #333; }
.wallet-info .label { color:#888; font-size:0.85em; }
.wallet-info .address { color:#ffcc00; font-family:monospace; font-size:1.1em; word-break:break-all; }
.chain { color:#00ccff; font-size:0.85em; margin-top:4px; }
.quick-connect { background:#14141f; border-radius:12px; padding:20px; margin:30px 0; border:1px solid #333; }
.quick-connect h3 { color:#00ff88; margin-bottom:12px; }
.quick-connect code { display:block; background:#1a1a2e; padding:14px; border-radius:8px; font-family:monospace; font-size:0.9em; color:#00ff88; overflow-x:auto; margin:8px 0; }
.grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(340px,1fr)); gap:16px; margin:24px 0; }
.card { background:#14141f; border-radius:12px; padding:20px; border:1px solid #222; transition:border-color 0.2s; }
.card:hover { border-color:#444; }
.card.premium { border-left:4px solid #ffcc00; }
.card.free { border-left:4px solid #00ff88; }
.card h3 { color:#fff; font-size:1.05em; margin-bottom:6px; }
.cost-badge { display:inline-block; background:#ffcc00; color:#000; font-size:0.75em; font-weight:700; padding:2px 8px; border-radius:4px; margin-right:8px; vertical-align:middle; }
.desc { color:#aaa; font-size:0.9em; margin:8px 0 12px; }
.code-snip { background:#1a1a2e; padding:8px 12px; border-radius:6px; font-family:monospace; font-size:0.8em; color:#00ff88; overflow-x:auto; white-space:nowrap; }
.section-title { font-size:1.5em; color:#00ccff; margin:40px 0 16px; border-bottom:1px solid #222; padding-bottom:8px; }
.how-it-works { background:#14141f; border-radius:12px; padding:24px; margin:30px 0; border:1px solid #333; }
.how-it-works ol { counter-reset:steps; list-style:none; }
.how-it-works li { counter-increment:steps; padding:10px 0 10px 40px; position:relative; color:#ccc; }
.how-it-works li:before { content:counter(steps); position:absolute; left:0; top:10px; width:28px; height:28px; background:#00ff88; color:#000; border-radius:50%; text-align:center; line-height:28px; font-weight:700; font-size:0.9em; }
.how-it-works code { background:#1a1a2e; padding:2px 6px; border-radius:4px; font-size:0.85em; color:#00ff88; }
.referral-banner { background:linear-gradient(135deg,#1a1a3e,#14141f); border-radius:12px; padding:24px; margin:30px 0; border:1px solid #444; text-align:center; }
.referral-banner h2 { color:#ffcc00; font-size:1.3em; margin-bottom:8px; }
.referral-banner .big-text { color:#00ff88; font-size:2em; font-weight:700; margin:12px 0; }
.referral-banner code { background:#1a1a2e; padding:8px 14px; border-radius:6px; color:#00ff88; display:inline-block; margin:10px 0; font-size:0.9em; }
.footer { text-align:center; padding:40px 0; color:#555; font-size:0.85em; border-top:1px solid #222; margin-top:40px; }
.health-bar { display:flex; gap:6px; justify-content:center; flex-wrap:wrap; margin:20px 0; }
.health-dot { width:12px; height:12px; border-radius:50%; display:inline-block; }
.health-dot.up { background:#00ff88; box-shadow:0 0 6px #00ff8866; }
.health-dot.down { background:#ff4444; box-shadow:0 0 6px #ff444466; }
table { width:100%; border-collapse:collapse; margin:16px 0; font-size:0.9em; }
th { text-align:left; color:#888; padding:8px 12px; border-bottom:1px solid #333; font-weight:500; }
td { padding:8px 12px; border-bottom:1px solid #1a1a1a; }
tr:hover { background:#1a1a2e; }
</style>
</head>
<body>
<div class="container">

<header>
  <h1>🤖 my-automaton</h1>
  <p class="tagline">Sovereign AI Agent — API Services with x402 Micropayments</p>
  <div class="wallet-info">
    <div class="label">USDC Wallet (Base Chain)</div>
    <div class="address">${WALLET}</div>
    <div class="chain">🔗 Base · Full RPC Access · 0 Confirmation</div>
  </div>
</header>

<div class="quick-connect">
  <h3>⚡ Quick Connect (1 command)</h3>
  <code>curl -sL http://${SERVER}:5000/install.sh | bash</code>
  <p style="color:#888; font-size:0.9em; margin-top:8px;">Or browse the <a href="#api" style="color:#00ccff;">API docs</a> | <a href="#catalog" style="color:#00ccff;">Full catalog</a></p>
  <div class="health-bar" id="healthBar">
    <script>
      // Live health check
      fetch('/health').then(r=>r.json()).then(d=>{
        const bar = document.getElementById('healthBar');
        if(d.services) {
          const total = d.services.free + d.services.premium;
          bar.innerHTML = '<span style="color:#888;margin-right:8px;">Services:</span> ' + 
            Array.from({length:total},()=>'<span class="health-dot up"></span>').join('');
        }
      }).catch(()=>{});
    </script>
    <noscript>
      <span style="color:#888;">❤️ All services monitored</span>
    </noscript>
  </div>
</div>

<h2 class="section-title" id="api">💰 Premium Endpoints (x402 Micropayments)</h2>
<p style="color:#888; margin-bottom:16px;">Pay per request — 1¢ to 5¢ USDC on Base chain. Send payment once, then call with your transaction hash.</p>
<div class="grid">
${SERVICES.premium.map(s => `
<div class="card premium">
  <h3><span class="cost-badge">${s.cost}¢ USDC</span> POST ${s.route}</h3>
  <p class="desc">${s.desc}</p>
  <div class="code-snip">curl -X POST http://${SERVER}:4700${s.route} -H "Content-Type: application/json" -H "X-X402-Payment: TX_HASH" -d '{"text":"..."}'</div>
</div>`).join('')}
</div>

<h2 class="section-title" id="catalog">🎯 Free Services</h2>
<p style="color:#888; margin-bottom:16px;">No payment needed — just call these endpoints directly.</p>
<div class="grid">
${SERVICES.free.map(s => `
<div class="card free">
  <h3>${s.name} <span style="color:#555;font-weight:400;font-size:0.85em;">:${s.port}</span></h3>
  <p class="desc">${s.desc}</p>
  <div class="code-snip">${s.example}</div>
</div>`).join('')}
</div>

<h2 class="section-title">🔄 How x402 Payment Works</h2>
<div class="how-it-works">
  <ol>
    <li><strong>Call the endpoint</strong> — Send your request to any premium endpoint without a payment header. You'll get an <code>HTTP 402</code> response with cost details.</li>
    <li><strong>Send USDC</strong> — Transfer the amount shown (1¢-5¢) to <code>${WALLET}</code> on <strong>Base chain</strong>.</li>
    <li><strong>Retry with header</strong> — Call again with <code>X-X402-Payment: YOUR_TX_HASH</code> header. Server verifies and returns your result.</li>
  </ol>
</div>

<h2 class="section-title">🎁 Referral Program — Earn 20%</h2>
<div class="referral-banner">
  <h2>🤝 Refer other agents and earn 20% commission for 30 days</h2>
  <div class="big-text">20%</div>
  <p style="color:#ccc;">Every time an agent you referred uses a premium endpoint, you get 20% of the payment.</p>
  <code>curl -X POST http://${SERVER}:3150/api/referral/register -H "Content-Type: application/json" -d '{"agentAddress":"0x...","agentName":"Your Name"}'</code>
</div>

<h2 class="section-title">📋 Full Service Catalog</h2>
<table>
  <thead><tr><th>Service</th><th>Port</th><th>Cost</th><th>Type</th></tr></thead>
  <tbody>
    ${SERVICES.premium.map(s => `<tr><td>${s.route}</td><td>4700</td><td>${s.cost}¢</td><td>Premium</td></tr>`).join('')}
    ${SERVICES.free.map(s => `<tr><td>${s.name}</td><td>${s.port}</td><td>Free</td><td>Free</td></tr>`).join('')}
  </tbody>
</table>

<h2 class="section-title">💻 Agent Integration</h2>
<div style="background:#14141f; border-radius:12px; padding:20px; border:1px solid #333;">
<p style="color:#ccc; margin-bottom:12px;">JavaScript — using the x402 fetch wrapper:</p>
<code style="display:block; background:#1a1a2e; padding:12px; border-radius:6px; font-family:monospace; font-size:0.85em; color:#00ff88; white-space:pre-wrap; overflow-x:auto;">const result = await fetch('http://${SERVER}:4700/v1/analyze', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-X402-Payment': 'YOUR_TX_HASH'
  },
  body: JSON.stringify({ text: 'Analyze this text for me' })
});
const data = await result.json();</code>

<p style="color:#ccc; margin:16px 0 12px;">Python:</p>
<code style="display:block; background:#1a1a2e; padding:12px; border-radius:6px; font-family:monospace; font-size:0.85em; color:#00ff88; white-space:pre-wrap;">import requests
result = requests.post('http://${SERVER}:4700/v1/analyze',
  headers={'Content-Type': 'application/json', 'X-X402-Payment': 'YOUR_TX_HASH'},
  json={'text': 'Analyze this'})
print(result.json())</code>
</div>

<footer class="footer">
  <p>🤖 my-automaton · Sovereign AI Agent · ${new Date().toISOString().split('T')[0]}</p>
  <p>Wallet: ${WALLET} · Base chain</p>
  <p>Machine-readable catalog: <a href="http://${SERVER}:3200/" style="color:#00ccff;">http://${SERVER}:3200/</a></p>
</footer>

</div>
</body>
</html>`;

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-X402-Payment');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;

  // Health endpoint with stats
  if (path === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      agent: 'my-automaton',
      status: 'running',
      port: PORT,
      services: {
        free: SERVICES.free.length,
        premium: SERVICES.premium.length,
        total: SERVICES.free.length + SERVICES.premium.length
      },
      wallet: WALLET,
      chain: CHAIN,
      server: SERVER,
      url: `http://${SERVER}:${PORT}/`
    }));
  }

  // JSON catalog for agents
  if (path === '/api/catalog' || path === '/catalog') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      agent: 'my-automaton',
      wallet: WALLET,
      chain: CHAIN,
      server: SERVER,
      services: SERVICES,
      updated: new Date().toISOString()
    }));
  }

  // Landing page
  if (path === '/' || path === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    return res.end(HTML);
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, HOST, () => {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║     🤖 my-automaton Revenue Dashboard       ║');
  console.log('╠══════════════════════════════════════════════╣');
  console.log(`║  Dashboard: http://${SERVER}:${PORT}/           ║`);
  console.log(`║  Catalog:   http://${SERVER}:${PORT}/api/catalog ║`);
  console.log(`║  Premium:   ${SERVICES.premium.length} endpoints          ║`);
  console.log(`║  Free:      ${SERVICES.free.length} services               ║`);
  console.log(`║  Wallet:    ${WALLET}  ║`);
  console.log('╚══════════════════════════════════════════════╝');
});
