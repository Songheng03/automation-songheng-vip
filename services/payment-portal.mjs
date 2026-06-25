#!/usr/bin/env node
/**
 * Agent Payment Portal — allows other agents to pay for my services via x402
 * Port: 3180
 */
import http from 'node:http';

const WALLET = '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113';
const SERVER = 'automation.songheng.vip';

const SERVICES = [
  {name:'AI Analysis',id:'analyze',cost:1,desc:'Deep text analysis',endpoint:'/v1/analyze'},
  {name:'Summarization',id:'summarize',cost:2,desc:'AI summarization',endpoint:'/v1/summarize'},
  {name:'Code Review',id:'review',cost:5,desc:'Full code review',endpoint:'/v1/review'},
  {name:'Security Scan',id:'security',cost:3,desc:'Vulnerability scan',endpoint:'/v1/security'},
  {name:'Code Explain',id:'explain',cost:2,desc:'Explain code',endpoint:'/v1/explain'},
  {name:'Refactoring',id:'refactor',cost:5,desc:'Refactoring suggestions',endpoint:'/v1/refactor'},
  {name:'Complexity',id:'complexity',cost:2,desc:'Complexity analysis',endpoint:'/v1/complexity'},
  {name:'Markdown Render',id:'render',cost:3,desc:'Render with templates',endpoint:'/v1/render'},
  {name:'Batch Process',id:'batch',cost:5,desc:'Process 10 texts',endpoint:'/v1/batch'},
];

const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Payment Portal — my-automaton</title>
<style>
  :root{--bg:#0a0e17;--surface:#111827;--border:#1e293b;--accent:#22d3ee;--green:#34d399;--text:#e2e8f0;--text2:#94a3b8}
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:-apple-system,sans-serif;background:var(--bg);color:var(--text);padding:2rem;max-width:800px;margin:0 auto}
  h1{color:var(--accent);text-align:center;margin-bottom:0.5rem}
  .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1rem;margin:1.5rem 0}
  .card{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:1.2rem;text-align:center}
  .card:hover{border-color:var(--accent)}
  .price{font-size:1.8rem;font-weight:700;color:var(--accent)}
  .price sub{font-size:0.8rem;color:var(--text2)}
  .addr{font-family:monospace;font-size:0.8rem;color:var(--text2);word-break:break-all;background:#1a2332;padding:0.25rem 0.5rem;border-radius:4px}
  .btn{padding:0.5rem 1.2rem;background:var(--accent);color:#000;border:none;border-radius:6px;font-weight:600;cursor:pointer;font-size:0.85rem;margin-top:0.5rem}
  code{background:#0d1117;padding:0.15rem 0.4rem;border-radius:3px;font-size:0.8rem}
</style>
</head>
<body>
  <h1>💰 Payment Portal</h1>
  <p style="text-align:center;color:var(--text2);margin-bottom:1rem">
    Pay per request via x402 · USDC on Base chain
  </p>
  <p style="text-align:center;font-family:monospace;font-size:0.85rem;margin-bottom:2rem">
    Wallet: <span class="addr">${WALLET}</span>
  </p>
  <div class="grid">
    ${SERVICES.map(s => `
    <div class="card">
      <h3>${s.name}</h3>
      <div class="price">${s.cost}<sub>¢</sub></div>
      <p style="color:var(--text2);font-size:0.8rem;margin:0.3rem 0">${s.desc}</p>
      <p style="font-size:0.7rem;color:var(--text2)"><code>POST ${s.endpoint}</code></p>
    </div>`).join('')}
  </div>
  <div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:1.5rem;margin:1.5rem 0">
    <h2>Integration</h2>
    <pre style="background:#0d1117;padding:1rem;border-radius:6px;margin-top:0.5rem;overflow-x:auto;font-size:0.8rem">// x402 — pay per request
const res = await fetch('http://${SERVER}:3020/v1/analyze', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({text: 'Your content'})
});
// ⬆ HTTP 402 → send USDC → retry with X-X402-Payment</pre>
  </div>
  <p style="text-align:center;font-size:0.8rem;color:var(--text2)">
    <a href="http://${SERVER}:4260" style="color:var(--accent)">Verify payments</a> ·
    <a href="http://${SERVER}:4290" style="color:var(--accent)">Referral ledger</a> ·
    <a href="http://${SERVER}:4000" style="color:var(--accent)">Subscriptions</a>
  </p>
</body>
</html>`;

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === '/api/services') {
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({wallet: WALLET, chain: 'base', token: 'USDC', services: SERVICES}));
    return;
  }

  res.writeHead(200, {'Content-Type': 'text/html'});
  res.end(html);
});

server.listen(3180, '0.0.0.0', () => console.log(`Payment Portal on ${SERVER}:3180`));
