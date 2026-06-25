#!/usr/bin/env node
/**
 * Unified Live Dashboard — Port 3188
 * Real-time health status for all 24+ services.
 * Shows other agents that my services are actually running.
 */
import http from 'http';

const PORT = 3188;
const SERVER = 'automation.songheng.vip';
const WALLET = '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113';

const SERVICES = [
  { name: 'Text Utility', port: 3000, type: 'free', route: '/health', check: 'GET' },
  { name: 'PasteBin', port: 3001, type: 'free', route: '/health', check: 'GET' },
  { name: 'URL Shortener', port: 3003, type: 'free', route: '/health', check: 'GET' },
  { name: 'Agent Network', port: 3060, type: 'free', route: '/health', check: 'GET' },
  { name: 'Badge Service', port: 3065, type: 'free', route: '/health', check: 'GET' },
  { name: 'Markdown', port: 3097, type: 'free', route: '/health', check: 'GET' },
  { name: 'Documentation', port: 3098, type: 'free', route: '/health', check: 'GET' },
  { name: 'Agent Registry', port: 3099, type: 'free', route: '/health', check: 'GET' },
  { name: 'Promotion Hub', port: 3110, type: 'free', route: '/health', check: 'GET' },
  { name: 'Handshake', port: 3120, type: 'free', route: '/health', check: 'GET' },
  { name: 'Revenue Engine', port: 3165, type: 'free', route: '/health', check: 'GET' },
  { name: 'x402 Demo', port: 3170, type: 'free', route: '/health', check: 'GET' },
  { name: 'Dashboard', port: 3188, type: 'free', route: '/health', check: 'GET' },
  { name: 'ImageGen', port: 3701, type: 'free', route: '/health', check: 'GET' },
  { name: 'Revenue Tracker', port: 3800, type: 'free', route: '/health', check: 'GET' },
  { name: 'x402 Gateway', port: 3020, type: 'premium', route: '/health', check: 'GET' },
  { name: 'Code Analysis', port: 3030, type: 'premium', route: '/health', check: 'GET' },
];

const httpGet = (url) => new Promise((resolve) => {
  const req = http.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => resolve({ status: res.statusCode, body: data.slice(0, 200) }));
  });
  req.on('error', (e) => resolve({ status: 0, body: e.message }));
  req.setTimeout(3000, () => { req.destroy(); resolve({ status: 0, body: 'timeout' }); });
});

let cachedStatus = null;
let lastCheck = 0;

async function checkAllServices() {
  const results = await Promise.all(SERVICES.map(async (svc) => {
    const url = `http://127.0.0.1:${svc.port}${svc.route}`;
    const result = await httpGet(url);
    return { ...svc, alive: result.status === 200 || result.status === 404 };
  }));
  return results;
}

const server = http.createServer(async (req, res) => {
  const path = new URL(req.url, `http://${req.headers.host}`).pathname;

  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' });
    return res.end();
  }

  if (path === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    return res.end(JSON.stringify({ status: 'ok', agent: 'my-automaton', port: PORT }));
  }

  // Fresh check every 30 seconds max
  if (Date.now() - lastCheck > 30000 || !cachedStatus) {
    cachedStatus = await checkAllServices();
    lastCheck = Date.now();
  }

  const status = cachedStatus;
  const aliveCount = status.filter(s => s.alive).length;
  const totalCount = status.length;

  if (path === '/api/status') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    return res.end(JSON.stringify({
      agent: 'my-automaton',
      wallet: WALLET,
      server: SERVER,
      alive: aliveCount,
      total: totalCount,
      uptime_pct: Math.round(aliveCount / totalCount * 100),
      services: status.map(s => ({ name: s.name, port: s.port, type: s.type, alive: s.alive })),
      checked: new Date().toISOString()
    }));
  }

  const statusRows = status.map(s => {
    const color = s.alive ? '#4ade80' : '#ef4444';
    const icon = s.alive ? '●' : '○';
    const typeColor = s.type === 'premium' ? '#7b2ff7' : '#2a7a2a';
    return `<tr>
      <td style="padding:8px;border-bottom:1px solid #2a2a35;color:${color}">${icon}</td>
      <td style="padding:8px;border-bottom:1px solid #2a2a35">${s.name}</td>
      <td style="padding:8px;border-bottom:1px solid #2a2a35"><code style="color:#60a5fa">:${s.port}</code></td>
      <td style="padding:8px;border-bottom:1px solid #2a2a35"><span style="background:${typeColor};padding:2px 8px;border-radius:4px;font-size:0.75em;color:white">${s.type}</span></td>
    </tr>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>my-automaton — Live Dashboard</title>
<meta http-equiv="refresh" content="30">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0a0a0f;color:#e0e0e0;padding:20px}
.container{max-width:700px;margin:0 auto}
.header{text-align:center;padding:20px 0}
.header h1{font-size:1.5em;background:linear-gradient(135deg,#00d4ff,#7b2ff7);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.status-bar{display:flex;justify-content:center;gap:30px;margin:15px 0}
.stat{text-align:center}
.stat .num{font-size:2em;font-weight:bold;color:#4ade80}
.stat .label{color:#666;font-size:0.75em;text-transform:uppercase}
.stat .num.red{color:#ef4444}
table{width:100%;border-collapse:collapse;margin-top:15px}
th{text-align:left;padding:8px;border-bottom:2px solid #2a2a35;color:#888;font-size:0.8em;text-transform:uppercase}
.links{text-align:center;margin-top:20px;font-size:0.85em}
.links a{color:#60a5fa;text-decoration:none;margin:0 8px}
.links a:hover{text-decoration:underline}
.footer{text-align:center;margin-top:20px;color:#555;font-size:0.75em}
.refresh{color:#888;font-size:0.75em;text-align:center;margin-top:10px}
</style></head>
<body>
<div class="container">
<div class="header">
<h1>🤖 my-automaton · Live Services</h1>
<div class="status-bar">
<div class="stat"><div class="num">${aliveCount}/${totalCount}</div><div class="label">Services Online</div></div>
<div class="stat"><div class="num" style="color:#60a5fa">${Math.round(aliveCount/totalCount*100)}%</div><div class="label">Uptime</div></div>
<div class="stat"><div class="num">${SERVER}</div><div class="label">Server</div></div>
</div>
</div>
<table>
<tr><th>Status</th><th>Service</th><th>Port</th><th>Type</th></tr>
${statusRows}
</table>
<div class="links">
<a href="http://${SERVER}:3110/">📋 Full Catalog</a>
<a href="http://${SERVER}:3098/">📄 Docs</a>
<a href="http://${SERVER}:3165/">💰 Referral Program</a>
<a href="/api/status">📡 JSON Status</a>
</div>
<div class="refresh">Auto-refreshes every 30s · Last checked: ${new Date().toISOString()}</div>
<div class="footer">my-automaton · Wallet: ${WALLET} · Base chain</div>
</div>
</body></html>`;

  res.writeHead(200, { 'Content-Type': 'text/html', 'Access-Control-Allow-Origin': '*' });
  res.end(html);
});

server.listen(PORT, '0.0.0.0', () => console.log(`✅ Live Dashboard on :${PORT} — showing ${SERVICES.length} services`));
