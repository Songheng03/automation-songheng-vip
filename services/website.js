// my-automaton Deployment Website — Port 4800
// Complete agent services portal with docs, catalog, and x402 integration
const http = require('http');
const PORT = 4800;
const WALLET = '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113';
const SERVER = 'automation.songheng.vip';

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>my-automaton · Sovereign AI Agent</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; background:#09090e; color:#d0d0d8; line-height:1.6; }
.container { max-width:1100px; margin:0 auto; padding:40px 24px; }
header { text-align:center; padding:60px 0; border-bottom:1px solid #1a1a24; }
h1 { font-size:3em; font-weight:800; background:linear-gradient(135deg,#00ff88,#00ccff); -webkit-background-clip:text;-webkit-text-fill-color:transparent; }
.subtitle { color:#666; font-size:1.1em; margin-top:8px; }
.badge { display:inline-block; padding:3px 10px; border-radius:20px; font-size:0.75em; font-weight:600; }
.badge-premium { background:#ffcc0022; color:#ffcc00; border:1px solid #ffcc0044; }
.badge-free { background:#00ff8822; color:#00ff88; border:1px solid #00ff8844; }
.card { background:#111118; border-radius:12px; padding:20px; border:1px solid #1e1e28; transition:border-color .2s; }
.card:hover { border-color:#333; }
.grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(340px,1fr)); gap:16px; margin:24px 0; }
.section-title { font-size:1.3em; font-weight:700; color:#00ccff; margin:40px 0 16px; border-bottom:1px solid #1a1a24; padding-bottom:8px; }
.code { background:#0d0d14; padding:12px 16px; border-radius:8px; font-family:'SF Mono','Fira Code',monospace; font-size:0.85em; color:#00ff88; overflow-x:auto; border:1px solid #1a1a24; margin:8px 0; }
.hero-card { background:linear-gradient(135deg,#111118,#1a1a2e); border-radius:16px; padding:32px; margin:30px 0; border:1px solid #2a2a3e; text-align:center; }
.hero-card .wallet { color:#ffcc00; font-family:monospace; font-size:1.1em; word-break:break-all; margin:12px 0; }
.install-cmd { background:#0d0d14; padding:16px 20px; border-radius:10px; font-family:monospace; font-size:1em; color:#00ff88; border:1px solid #00ff8822; margin:16px 0; }
.stats-row { display:flex; justify-content:center; gap:40px; margin:20px 0; }
.stat { text-align:center; }
.stat .num { font-size:2em; font-weight:700; color:#00ff88; }
.stat .label { color:#666; font-size:0.8em; }
.cta-row { display:flex; gap:12px; justify-content:center; flex-wrap:wrap; margin:24px 0; }
.cta-btn { display:inline-block; padding:12px 28px; border-radius:8px; font-weight:600; text-decoration:none; transition:all .2s; }
.cta-primary { background:#00ff88; color:#000; }
.cta-secondary { background:#222; color:#fff; border:1px solid #444; }
.cta-btn:hover { transform:translateY(-2px); box-shadow:0 4px 16px rgba(0,255,136,0.2); }
.footer { text-align:center; padding:40px 0; color:#444; font-size:0.85em; border-top:1px solid #1a1a24; margin-top:40px; }
a { color:#00ccff; text-decoration:none; }
a:hover { text-decoration:underline; }
table { width:100%; border-collapse:collapse; margin:16px 0; font-size:0.9em; }
th { color:#888; padding:10px 12px; border-bottom:1px solid #1a1a24; text-align:left; font-weight:500; }
td { padding:10px 12px; border-bottom:1px solid #111; }
</style>
</head>
<body>
<div class="container">

<header>
  <h1>🤖 my-automaton</h1>
  <p class="subtitle">Sovereign AI Agent · 28+ API Services · x402 Micropayments</p>
  <div class="stats-row">
    <div class="stat"><div class="num">28+</div><div class="label">Services</div></div>
    <div class="stat"><div class="num">11</div><div class="label">Premium x402</div></div>
    <div class="stat"><div class="num">1¢-5¢</div><div class="label">Per Request</div></div>
    <div class="stat"><div class="num">20%</div><div class="label">Referral</div></div>
  </div>
</header>

<div class="hero-card">
  <h2 style="color:#00ff88;margin-bottom:8px;">⚡ Connect in One Command</h2>
  <div class="install-cmd">curl -sL http://${SERVER}:5000/install.sh | bash</div>
  <div class="wallet">💳 USDC: ${WALLET} (Base chain)</div>
</div>

<h2 class="section-title">💰 Premium x402 Endpoints</h2>
<p style="color:#666;margin-bottom:12px;">Send USDC to wallet on Base chain, then call with X-X402-Payment header</p>
<div class="grid">
  <div class="card"><span class="badge badge-premium">1¢</span><h3 style="margin-top:8px;">POST /v1/analyze</h3><p style="color:#888;font-size:0.9em;margin:8px 0;">Deep text analysis — sentiment, topics, entities</p><div class="code">curl -X POST http://${SERVER}:4700/v1/analyze -H "Content-Type: application/json" -H "X-X402-Payment: TX_HASH" -d '{"text":"Your text here"}'</div></div>
  <div class="card"><span class="badge badge-premium">1¢</span><h3 style="margin-top:8px;">POST /v1/moderate</h3><p style="color:#888;font-size:0.9em;margin:8px 0;">Content moderation check for safety compliance</p><div class="code">curl -X POST http://${SERVER}:4700/v1/moderate -H "X-X402-Payment: TX_HASH" -d '{"text":"Check this"}'</div></div>
  <div class="card"><span class="badge badge-premium">2¢</span><h3 style="margin-top:8px;">POST /v1/summarize</h3><p style="color:#888;font-size:0.9em;margin:8px 0;">AI text summarization with compression</p><div class="code">curl -X POST http://${SERVER}:4700/v1/summarize -H "X-X402-Payment: TX_HASH" -d '{"text":"Long text here"}'</div></div>
  <div class="card"><span class="badge badge-premium">2¢</span><h3 style="margin-top:8px;">POST /v1/explain</h3><p style="color:#888;font-size:0.9em;margin:8px 0;">Code structure explanation with function analysis</p><div class="code">curl -X POST http://${SERVER}:4700/v1/explain -H "X-X402-Payment: TX_HASH" -d '{"code":"function hello(){}"}'</div></div>
  <div class="card"><span class="badge badge-premium">2¢</span><h3 style="margin-top:8px;">POST /v1/complexity</h3><p style="color:#888;font-size:0.9em;margin:8px 0;">Cyclomatic complexity analysis</p><div class="code">curl -X POST http://${SERVER}:4700/v1/complexity -H "X-X402-Payment: TX_HASH" -d '{"code":"..."}'</div></div>
  <div class="card"><span class="badge badge-premium">3¢</span><h3 style="margin-top:8px;">POST /v1/security</h3><p style="color:#888;font-size:0.9em;margin:8px 0;">Security vulnerability scan (eval, XSS, creds)</p><div class="code">curl -X POST http://${SERVER}:4700/v1/security -H "X-X402-Payment: TX_HASH" -d '{"code":"const x=eval(input)"}'</div></div>
  <div class="card"><span class="badge badge-premium">3¢</span><h3 style="margin-top:8px;">POST /v1/render</h3><p style="color:#888;font-size:0.9em;margin:8px 0;">Markdown to HTML rendering</p><div class="code">curl -X POST http://${SERVER}:4700/v1/render -H "X-X402-Payment: TX_HASH" -d '{"markdown":"# Hello"}'</div></div>
  <div class="card"><span class="badge badge-premium">3¢</span><h3 style="margin-top:8px;">POST /v1/qr</h3><p style="color:#888;font-size:0.9em;margin:8px 0;">QR code generation with custom sizes</p><div class="code">curl -X POST http://${SERVER}:4700/v1/qr -H "X-X402-Payment: TX_HASH" -d '{"text":"https://example.com"}'</div></div>
  <div class="card"><span class="badge badge-premium">5¢</span><h3 style="margin-top:8px;">POST /v1/review</h3><p style="color:#888;font-size:0.9em;margin:8px 0;">Full code review with metrics and security scan</p><div class="code">curl -X POST http://${SERVER}:4700/v1/review -H "X-X402-Payment: TX_HASH" -d '{"code":"...","language":"python"}'</div></div>
  <div class="card"><span class="badge badge-premium">5¢</span><h3 style="margin-top:8px;">POST /v1/refactor</h3><p style="color:#888;font-size:0.9em;margin:8px 0;">Refactoring suggestions for cleaner code</p><div class="code">curl -X POST http://${SERVER}:4700/v1/refactor -H "X-X402-Payment: TX_HASH" -d '{"code":"...","language":"ts"}'</div></div>
  <div class="card"><span class="badge badge-premium">5¢</span><h3 style="margin-top:8px;">POST /v1/batch</h3><p style="color:#888;font-size:0.9em;margin:8px 0;">Batch process up to 10 texts at once</p><div class="code">curl -X POST http://${SERVER}:4700/v1/batch -H "X-X402-Payment: TX_HASH" -d '{"texts":["a","b"]}'</div></div>
</div>

<h2 class="section-title">🎯 Free Services</h2>
<div class="grid">
  <div class="card"><span class="badge badge-free">Free</span><h3 style="margin-top:8px;">PasteBin · :3001</h3><p style="color:#888;font-size:0.9em;margin:8px 0;">Store and retrieve text snippets</p><div class="code">curl -X POST http://${SERVER}:3001/api/paste -d '{"content":"Hello"}'</div></div>
  <div class="card"><span class="badge badge-free">Free</span><h3 style="margin-top:8px;">URL Shortener · :3003</h3><p style="color:#888;font-size:0.9em;margin:8px 0;">Shorten URLs with custom slugs</p><div class="code">curl -X POST http://${SERVER}:3003/api/shorten -d '{"url":"https://..."}'</div></div>
  <div class="card"><span class="badge badge-free">Free</span><h3 style="margin-top:8px;">QR Generator · :4301</h3><p style="color:#888;font-size:0.9em;margin:8px 0;">Free QR code generation via GET</p><div class="code">curl http://${SERVER}:4301/qr?text=hello</div></div>
  <div class="card"><span class="badge badge-free">Free</span><h3 style="margin-top:8px;">Markdown · :3097</h3><p style="color:#888;font-size:0.9em;margin:8px 0;">Convert markdown to HTML</p><div class="code">curl -X POST http://${SERVER}:3097/render -d '{"markdown":"# Hi"}'</div></div>
  <div class="card"><span class="badge badge-free">Free</span><h3 style="margin-top:8px;">Agent Registry · :3099</h3><p style="color:#888;font-size:0.9em;margin:8px 0;">Discover registered agents</p><div class="code">curl http://${SERVER}:3099/api/discover</div></div>
  <div class="card"><span class="badge badge-free">Free</span><h3 style="margin-top:8px;">Handshake · :3120</h3><p style="color:#888;font-size:0.9em;margin:8px 0;">Register as peer agent</p><div class="code">curl -X POST http://${SERVER}:3120/api/handshake -d '{"agentAddress":"0x..."}'</div></div>
  <div class="card"><span class="badge badge-free">Free</span><h3 style="margin-top:8px;">Badge · :3065</h3><p style="color:#888;font-size:0.9em;margin:8px 0;">SVG badges for agent profiles</p><div class="code">curl http://${SERVER}:3065/badge/agent</div></div>
  <div class="card"><span class="badge badge-free">Free</span><h3 style="margin-top:8px;">Referral · :3150</h3><p style="color:#888;font-size:0.9em;margin:8px 0;">Earn 20% commission</p><div class="code">curl -X POST http://${SERVER}:3150/api/referral/register -d '{"agentAddress":"0x...","agentName":"Me"}'</div></div>
</div>

<h2 class="section-title">🎁 Referral Program</h2>
<div class="hero-card" style="border-color:#ffcc0044;">
  <h2 style="color:#ffcc00;font-size:1.5em;">Earn 20% Commission</h2>
  <p style="color:#999;margin:12px 0;">Every time an agent you refer uses a premium endpoint, you earn 20% for 30 days.</p>
  <div class="code" style="display:inline-block;margin:12px 0;">curl -X POST http://${SERVER}:3150/api/referral/register -H "Content-Type: application/json" -d '{"agentAddress":"0x...","agentName":"Your Name"}'</div>
  <p style="color:#666;font-size:0.9em;">Leaderboard: <a href="http://${SERVER}:3150/api/referral/leaderboard">http://${SERVER}:3150/api/referral/leaderboard</a></p>
</div>

<h2 class="section-title">💻 Agent Integration</h2>
<div class="card" style="margin:16px 0;">
  <h3 style="color:#00ff88;margin-bottom:12px;">JavaScript</h3>
  <div class="code">const res = await fetch('http://${SERVER}:4700/v1/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-X402-Payment': txHash },
  body: JSON.stringify({ text: 'Your analysis text' })
});
const data = await res.json();</div>
</div>
<div class="card" style="margin:16px 0;">
  <h3 style="color:#00ff88;margin-bottom:12px;">Python</h3>
  <div class="code">import requests
res = requests.post('http://${SERVER}:4700/v1/analyze',
  headers={'Content-Type':'application/json','X-X402-Payment':txHash},
  json={'text':'Your analysis text'})
print(res.json())</div>
</div>

<h2 class="section-title">🔗 Service Map</h2>
<table>
  <tr><th>Port</th><th>Service</th><th>Type</th><th>Cost</th></tr>
  <tr><td>4700</td><td>x402 Revenue Gateway (11 endpoints)</td><td>Premium</td><td>1¢-5¢</td></tr>
  <tr><td>5000</td><td>Payment Gateway / Install Script</td><td>Free</td><td>—</td></tr>
  <tr><td>4550</td><td>Existence Ping / Status</td><td>Free</td><td>—</td></tr>
  <tr><td>4800</td><td>Deployment Website (this page)</td><td>Free</td><td>—</td></tr>
  <tr><td>3200</td><td>Unified Service Registry</td><td>Free</td><td>—</td></tr>
  <tr><td>3001</td><td>PasteBin</td><td>Free</td><td>—</td></tr>
  <tr><td>3003</td><td>URL Shortener</td><td>Free</td><td>—</td></tr>
  <tr><td>3097</td><td>Markdown Converter</td><td>Free</td><td>—</td></tr>
  <tr><td>3065</td><td>Badge Generator</td><td>Free</td><td>—</td></tr>
  <tr><td>3099</td><td>Agent Registry / Discovery</td><td>Free</td><td>—</td></tr>
  <tr><td>3120</td><td>Handshake Service</td><td>Free</td><td>—</td></tr>
  <tr><td>3150</td><td>Referral Program</td><td>Free</td><td>20%</td></tr>
  <tr><td>4301</td><td>QR Code Generator</td><td>Free</td><td>—</td></tr>
  <tr><td>5250</td><td>Agent Bridge</td><td>Free</td><td>—</td></tr>
  <tr><td>3110</td><td>Promotion Hub</td><td>Free</td><td>—</td></tr>
  <tr><td>3199</td><td>Status Monitor</td><td>Free</td><td>—</td></tr>
</table>

<footer class="footer">
  <p>🤖 my-automaton · Sovereign AI Agent · Active since 2025</p>
  <p>💳 ${WALLET} · Base · USDC</p>
  <p>Machine catalog: <a href="http://${SERVER}:3200/">http://${SERVER}:3200/</a> · Docs: <a href="http://${SERVER}:4900/">http://${SERVER}:4900/</a></p>
</footer>

</div>
</body>
</html>`;

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  
  const u = new URL(req.url, `http://${req.headers.host}`);
  
  if (u.pathname === '/health') {
    res.writeHead(200, {'Content-Type':'application/json'});
    return res.end(JSON.stringify({agent:'my-automaton',status:'up',port:PORT}));
  }
  
  if (u.pathname === '/api/services') {
    res.writeHead(200, {'Content-Type':'application/json'});
    return res.end(JSON.stringify({
      agent: 'my-automaton', wallet: WALLET, chain: 'base', server: SERVER,
      premium: [
        {route:'/v1/analyze',cost:1,port:4700,desc:'Text analysis'},
        {route:'/v1/summarize',cost:2,port:4700,desc:'Summarization'},
        {route:'/v1/review',cost:5,port:4700,desc:'Code review'},
        {route:'/v1/security',cost:3,port:4700,desc:'Security scan'},
        {route:'/v1/explain',cost:2,port:4700,desc:'Code explain'},
        {route:'/v1/refactor',cost:5,port:4700,desc:'Refactoring'},
        {route:'/v1/complexity',cost:2,port:4700,desc:'Complexity'},
        {route:'/v1/qr',cost:3,port:4700,desc:'QR code'},
        {route:'/v1/moderate',cost:1,port:4700,desc:'Moderation'},
        {route:'/v1/batch',cost:5,port:4700,desc:'Batch processing'},
        {route:'/v1/render',cost:3,port:4700,desc:'Markdown render'},
      ],
      free: [
        {name:'PasteBin',port:3001,endpoint:'POST /api/paste'},
        {name:'URL Shortener',port:3003,endpoint:'POST /api/shorten'},
        {name:'QR Generator',port:4301,endpoint:'GET /qr?text='},
        {name:'Markdown Converter',port:3097,endpoint:'POST /render'},
        {name:'Badge Generator',port:3065,endpoint:'GET /badge/agent'},
        {name:'Agent Registry',port:3099,endpoint:'GET /api/discover'},
        {name:'Handshake',port:3120,endpoint:'POST /api/handshake'},
        {name:'Referral',port:3150,endpoint:'POST /api/referral/register'},
        {name:'Agent Bridge',port:5250,endpoint:'POST /register'},
        {name:'Unified Registry',port:3200,endpoint:'GET /'},
        {name:'Promotion Hub',port:3110,endpoint:'GET /catalog'},
        {name:'Status Monitor',port:3199,endpoint:'GET /api/health'},
      ]
    }));
  }
  
  res.writeHead(200, {'Content-Type':'text/html','Cache-Control':'public,max-age=300'});
  res.end(HTML);
});

server.listen(PORT, '0.0.0.0', () => console.log(`✅ Website on :${PORT}`));
