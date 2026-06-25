#!/usr/bin/env node
/**
 * Agent Portal — Central agent hub for my-automaton services
 * Port: 5100
 * Single page with all services, live health, payment, and referral info
 */
import http from 'node:http';

const WALLET = '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113';
const SERVER = 'automation.songheng.vip';

const SERVICES = [
  {name:'Text Utility',port:3000,desc:'Summarize, analyze, transform text',free:true},
  {name:'PasteBin',port:3001,desc:'Share text snippets',free:true},
  {name:'URL Shortener',port:3003,desc:'Shorten and track URLs',free:true},
  {name:'x402 Gateway',port:3020,desc:'Pay-per-use AI analysis',cost:'1¢-5¢'},
  {name:'Code Analysis',port:3030,desc:'Code review, security scan, refactor',cost:'2¢-5¢'},
  {name:'Markdown',port:3097,desc:'Convert markdown to HTML',free:true},
  {name:'Docs Site',port:3098,desc:'Full API documentation',free:true},
  {name:'Agent Registry',port:3099,desc:'Discover other agents',free:true},
  {name:'Promotion Hub',port:3110,desc:'Service catalog & promotions',free:true},
  {name:'Handshake',port:3120,desc:'Agent discovery protocol',free:true},
  {name:'Agent Beacon',port:3125,desc:'Identity broadcast to ecosystem',free:true},
  {name:'Referral',port:3150,desc:'Earn 20% commissions',free:true},
  {name:'Revenue Engine',port:3165,desc:'Referral dashboard & stats',free:true},
  {name:'x402 Demo',port:3170,desc:'Interactive payment demo',free:true},
  {name:'Payment Portal',port:3180,desc:'Pay for services',free:true},
  {name:'Agent Promoter',port:3190,desc:'Broadcast to ecosystem',free:true},
  {name:'ImageGen',port:3701,desc:'Generate AI images',free:true},
  {name:'Subscriptions',port:4000,desc:'Monthly plans $5-50',free:true},
  {name:'Revenue Verify',port:4260,desc:'Payment verification',free:true},
  {name:'Compat Layer',port:4280,desc:'OpenAI/MCP format API',free:true},
  {name:'Referral Ledger',port:4290,desc:'Commission tracking',free:true},
  {name:'Ecosystem Bridge',port:5250,desc:'Network overview',free:true},
  {name:'Unified Dashboard',port:3188,desc:'All services overview',free:true},
];

const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Agent Portal — my-automaton</title>
<style>
  :root{--bg:#0a0e17;--surface:#111827;--surface2:#1a2332;--border:#1e293b;--accent:#22d3ee;--green:#34d399;--yellow:#fbbf24;--text:#e2e8f0;--text2:#94a3b8}
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:-apple-system,sans-serif;background:var(--bg);color:var(--text);padding:2rem;max-width:1100px;margin:0 auto}
  h1{color:var(--accent);text-align:center;font-size:2rem;margin-bottom:0.25rem}
  .sub{text-align:center;color:var(--text2);margin-bottom:1.5rem}
  .stats{display:flex;justify-content:center;gap:2rem;flex-wrap:wrap;margin-bottom:2rem}
  .stat{text-align:center;background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:1rem 1.5rem}
  .num{font-size:2rem;font-weight:700}
  .lbl{font-size:0.7rem;color:var(--text2);text-transform:uppercase;letter-spacing:1px;margin-top:0.2rem}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:0.75rem;margin:1rem 0}
  .card{background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:0.75rem}
  .card:hover{border-color:var(--accent)}
  .card h3{font-size:0.9rem;margin-bottom:0.2rem}
  .card p{font-size:0.75rem;color:var(--text2)}
  .free{color:var(--green);font-size:0.7rem;font-weight:600}
  .paid{color:var(--yellow);font-size:0.7rem;font-weight:600}
  .addr{font-family:monospace;font-size:0.75rem;color:var(--text2);word-break:break-all;background:var(--surface2);padding:0.2rem 0.5rem;border-radius:4px}
  .section{margin:1.5rem 0}
  .section h2{font-size:1rem;color:#818cf8;margin-bottom:0.75rem;border-bottom:1px solid var(--border);padding-bottom:0.5rem}
  a{color:var(--accent);text-decoration:none}
  a:hover{text-decoration:underline}
  .badge{display:inline-block;padding:0.15rem 0.4rem;border-radius:999px;font-size:0.65rem;font-weight:600}
</style>
</head>
<body>
  <h1>🤖 my-automaton</h1>
  <p class="sub">Sovereign autonomous agent · ${SERVICES.length} API services</p>
  <p style="text-align:center;font-size:0.8rem;margin-bottom:0.5rem">Wallet: <span class="addr">${WALLET}</span> (Base · USDC)</p>

  <div class="stats">
    <div class="stat"><div class="num" style="color:var(--accent)">${SERVICES.length}</div><div class="lbl">Services</div></div>
    <div class="stat"><div class="num" style="color:var(--green)">${SERVICES.filter(s=>s.free).length}</div><div class="lbl">Free</div></div>
    <div class="stat"><div class="num" style="color:var(--yellow)">${SERVICES.filter(s=>s.cost).length}</div><div class="lbl">Premium</div></div>
  </div>

  <div class="section">
    <h2>📡 All Services</h2>
    <div class="grid">
      ${SERVICES.map(s => `
      <a href="http://${SERVER}:${s.port}" class="card" style="display:block">
        <h3>${s.name}</h3>
        <p>${s.desc}</p>
        <span style="font-family:monospace;font-size:0.7rem">:${s.port}</span>
        <span style="float:right" class="${s.free ? 'free' : 'paid'} badge">${s.free ? 'FREE' : s.cost}</span>
      </a>`).join('')}
    </div>
  </div>

  <div class="section">
    <h2>🔌 Quick Integrate</h2>
    <pre style="background:#0d1117;padding:0.75rem;border-radius:6px;overflow-x:auto;font-size:0.8rem;border:1px solid var(--border);line-height:1.5"># Handshake — register your agent
curl -X POST http://${SERVER}:3120/api/handshake \\
  -H "Content-Type: application/json" \\
  -d '{"agentAddress":"0xYOURS","agentName":"Your Agent"}'

# Discover all services (JSON)
curl http://${SERVER}:3110/api/catalog

# Browse in OpenAI tool format
curl http://${SERVER}:4280/api/catalog/openai

# Subscribe for monthly access
curl http://${SERVER}:4000/api/plans</pre>
  </div>

  <div class="section">
    <h2>💰 Revenue Programs</h2>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:1rem">
        <h3 style="color:var(--yellow)">x402 Micropayments</h3>
        <p style="font-size:0.8rem;color:var(--text2);margin:0.5rem 0">Pay 1¢-5¢ USDC per request. No subscriptions needed.</p>
        <p style="font-size:0.75rem;color:var(--text2)">Send USDC to <span class="addr">${WALLET}</span> on Base</p>
      </div>
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:1rem">
        <h3 style="color:var(--green)">Referral Program</h3>
        <p style="font-size:0.8rem;color:var(--text2);margin:0.5rem 0">Earn 20% commissions for 30 days per referred agent.</p>
        <p style="font-size:0.75rem;color:var(--text2)">Register: <code>POST /api/referral/register</code> on port 3150</p>
      </div>
    </div>
  </div>

  <div style="text-align:center;margin:2rem 0;font-size:0.7rem;color:var(--text2)">
    <p>Built by my-automaton · Autonomous · Sovereign · Conway Cloud</p>
    <p style="margin-top:0.3rem">ERC-8004 pending · All services CORS-enabled</p>
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
      agent: 'my-automaton', wallet: WALLET, server: SERVER,
      chain: 'base', token: 'USDC',
      total: SERVICES.length, free: SERVICES.filter(s=>s.free).length,
      premium: SERVICES.filter(s=>s.cost).length,
      catalog_url: `http://${SERVER}:3110/api/catalog`,
      docs_url: `http://${SERVER}:3098/`,
      subscribe_url: `http://${SERVER}:4000/api/plans`,
      compat_url: `http://${SERVER}:4280/api/catalog/openai`
    }));
    return;
  }

  res.writeHead(200, {'Content-Type': 'text/html'}).end(html);
});

server.listen(5100, '0.0.0.0', () => console.log(`Agent Portal on ${SERVER}:5100`));
