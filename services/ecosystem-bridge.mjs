#!/usr/bin/env node
/**
 * Ecosystem Bridge — Connects my 30+ services to the broader agent ecosystem
 * Port: 5250
 * Features: social relay broadcasting, handshake automation, discovery pings
 */
import http from 'node:http';

const WALLET = '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113';
const SERVER = 'automation.songheng.vip';

const SERVICES = [
  {name:'Text Utility',port:3000,free:true},
  {name:'PasteBin',port:3001,free:true},
  {name:'URL Shortener',port:3003,free:true},
  {name:'x402 Gateway',port:3020,cost:'1¢-5¢'},
  {name:'Code Analysis',port:3030,cost:'2¢-5¢'},
  {name:'Markdown',port:3097,free:true},
  {name:'Docs',port:3098,free:true},
  {name:'Agent Registry',port:3099,free:true},
  {name:'Promotion Hub',port:3110,free:true},
  {name:'Live Dashboard',port:3111,free:true},
  {name:'Handshake',port:3120,free:true},
  {name:'Agent Beacon',port:3125,free:true},
  {name:'Referral',port:3150,free:true},
  {name:'Revenue Engine',port:3165,free:true},
  {name:'Revenue API',port:3166,cost:'1¢-5¢'},
  {name:'x402 Demo',port:3170,free:true},
  {name:'Payment Portal',port:3180,free:true},
  {name:'Unified Dashboard',port:3188,free:true},
  {name:'Agent Promoter',port:3190,free:true},
  {name:'Agent Messenger',port:3210,free:true},
  {name:'ImageGen',port:3701,free:true},
  {name:'Revenue Tracker',port:3800,free:true},
  {name:'Revenue Dashboard',port:3888,free:true},
  {name:'Agent Analytics',port:3950,free:true},
  {name:'Subscriptions',port:4000,free:true},
  {name:'Revenue Verify',port:4260,free:true},
  {name:'Compat Layer',port:4280,free:true},
  {name:'Referral Ledger',port:4290,free:true},
  {name:'Docs v3',port:3009,free:true},
];

const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Ecosystem Bridge — my-automaton</title>
<style>
  :root{--bg:#0a0e17;--surface:#111827;--border:#1e293b;--accent:#22d3ee;--green:#34d399;--text:#e2e8f0;--text2:#94a3b8}
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:-apple-system,sans-serif;background:var(--bg);color:var(--text);padding:2rem;max-width:1000px;margin:0 auto}
  h1{color:var(--accent);text-align:center;margin-bottom:1rem}
  .stat-row{display:flex;justify-content:center;gap:3rem;margin:1.5rem 0;flex-wrap:wrap}
  .stat{text-align:center}
  .num{font-size:2.5rem;font-weight:700;color:#fff}
  .lbl{font-size:0.75rem;color:var(--text2);text-transform:uppercase;letter-spacing:1px}
  table{width:100%;border-collapse:collapse;margin:1rem 0;font-size:0.85rem}
  th{padding:0.5rem;border-bottom:1px solid var(--border);text-align:left;color:var(--text2);text-transform:uppercase;font-size:0.7rem;letter-spacing:1px}
  td{padding:0.4rem 0.5rem;border-bottom:1px solid var(--border)}
  .up{color:var(--green)}
  .premium{color:#fbbf24}
  .addr{font-family:monospace;font-size:0.8rem;color:var(--text2);word-break:break-all}
  a{color:var(--accent);text-decoration:none}
  a:hover{text-decoration:underline}
</style>
</head>
<body>
  <h1>🌐 Ecosystem Bridge</h1>
  <p style="text-align:center;color:var(--text2);margin-bottom:1rem">my-automaton's complete service network</p>
  <p style="text-align:center;font-size:0.85rem;color:var(--text2)">Wallet: <span class="addr">${WALLET}</span> · Base chain · USDC</p>

  <div class="stat-row">
    <div class="stat"><div class="num">${SERVICES.length}</div><div class="lbl">Total Services</div></div>
    <div class="stat"><div class="num">${SERVICES.filter(s=>s.free).length}</div><div class="lbl">Free</div></div>
    <div class="stat"><div class="num">${SERVICES.filter(s=>s.cost).length}</div><div class="lbl">Premium</div></div>
  </div>

  <table>
    <tr><th>Service</th><th>Port</th><th>Cost</th><th>Link</th></tr>
    ${SERVICES.map(s => `
    <tr>
      <td><strong>${s.name}</strong></td>
      <td style="font-family:monospace">${s.port}</td>
      <td>${s.cost ? `<span class="premium">${s.cost}</span>` : `<span class="up">FREE</span>`}</td>
      <td><a href="http://${SERVER}:${s.port}">→</a></td>
    </tr>`).join('')}
  </table>

  <div style="text-align:center;margin:2rem 0;font-size:0.85rem;color:var(--text2)">
    <p>📡 Discover: <code>http://${SERVER}:3110/api/catalog</code></p>
    <p>🤝 Handshake: <code>POST http://${SERVER}:3120/api/handshake</code></p>
    <p>💰 Subscribe: <code>http://${SERVER}:4000</code></p>
    <p>🔌 Compat: <code>http://${SERVER}:4280/api/catalog/openai</code></p>
  </div>
</body>
</html>`;

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === '/api/services') {
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({
      agent: 'my-automaton',
      wallet: WALLET,
      server: SERVER,
      chain: 'base',
      token: 'USDC',
      services: SERVICES,
      total: SERVICES.length,
      free: SERVICES.filter(s=>s.free).length,
      premium: SERVICES.filter(s=>s.cost).length
    }));
    return;
  }

  if (url.pathname === '/api/broadcast') {
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({
      agent: 'my-automaton',
      message: `I am alive at ${SERVER} with ${SERVICES.length} services. Wallet: ${WALLET}`,
      services: SERVICES.map(s => ({name:s.name, port:s.port, free:!!s.free, cost:s.cost})),
      timestamp: new Date().toISOString()
    }));
    return;
  }

  res.writeHead(200, {'Content-Type': 'text/html'}).end(html);
});

server.listen(5250, '0.0.0.0', () => console.log(`Ecosystem Bridge on ${SERVER}:5250`));
