#!/usr/bin/env node
/**
 * Revenue Dashboard — live USDC revenue display
 * Port: 3888
 */
import http from 'node:http';

const WALLET = '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113';
const SERVER = 'automation.songheng.vip';
const ledger = [];

const html = `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Revenue Dashboard — my-automaton</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,sans-serif;background:#0a0e17;color:#e2e8f0;padding:2rem;max-width:800px;margin:0 auto}
h1{color:#22d3ee;text-align:center;margin-bottom:1rem}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:0.75rem;margin:1rem 0}
.card{background:#111827;border:1px solid #1e293b;border-radius:10px;padding:1.2rem;text-align:center}
.card .n{font-size:1.8rem;font-weight:700}
.card .l{font-size:0.65rem;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-top:0.2rem}
table{width:100%;border-collapse:collapse;margin:0.5rem 0;font-size:0.85rem}
th{border-bottom:1px solid #1e293b;padding:0.5rem;text-align:left;color:#94a3b8;text-transform:uppercase;font-size:0.65rem;letter-spacing:1px}
td{border-bottom:1px solid #1e293b;padding:0.4rem}
.footer{text-align:center;font-size:0.75rem;color:#94a3b8;margin-top:1.5rem}
a{color:#22d3ee;text-decoration:none}
</style>
</head><body>
<h1>💰 Revenue Dashboard</h1>
<p style="text-align:center;color:#94a3b8;font-size:0.85rem;margin-bottom:0.5rem">Wallet: <code style="color:#22d3ee">${WALLET}</code> · Base · USDC</p>
<div class="grid" id="stats"></div>
<h2 style="color:#818cf8;font-size:1rem;margin-bottom:0.5rem">Recent Payments</h2>
<table><tr><th>Service</th><th>Amount</th><th>Time</th></tr><tbody id="rows"></tbody></table>
<div class="footer">
<a href="http://${SERVER}:3020">x402 Gateway</a> · <a href="http://${SERVER}:3150">Referral</a> · <a href="http://${SERVER}:4000">Plans</a> · <a href="http://${SERVER}:3800">Tracker</a>
</div>
<script>
setInterval(async()=>{
  const t = await fetch('/api/totals').then(r=>r.json());
  document.getElementById('stats').innerHTML = 
    '<div class=card><div class=n style=color:#34d399>$'+t.total.toFixed(2)+'</div><div class=l>Total</div></div>'+
    '<div class=card><div class=n style=color:#22d3ee>$'+t.x402.toFixed(2)+'</div><div class=l>x402</div></div>'+
    '<div class=card><div class=n style=color:#fbbf24>$'+t.ref.toFixed(2)+'</div><div class=l>Referrals</div></div>'+
    '<div class=card><div class=n style=color:#818cf8>$'+t.sub.toFixed(2)+'</div><div class=l>Subs</div></div>'+
    '<div class=card><div class=n style=color:#ef4444>$'+t.fees.toFixed(2)+'</div><div class=l>Fees</div></div>'+
    '<div class=card><div class=n style=color:#fff>$'+t.net.toFixed(2)+'</div><div class=l>Net</div></div>';
  const rows = await fetch('/api/rows').then(r=>r.json());
  document.getElementById('rows').innerHTML = rows.map(r => '<tr><td>'+r.service+'</td><td style=color:#34d399>$'+r.amount.toFixed(2)+'</td><td style=color:#94a3b8;font-size:0.75rem>'+r.time+'</td></tr>').join('');
}, 5000);
</script>
</body></html>`;

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === '/api/record') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const d = JSON.parse(body);
        ledger.push({service:d.service||'x402', amount:d.amount||0, timestamp:Date.now()});
        res.writeHead(200).end(JSON.stringify({ok:true}));
      } catch { res.writeHead(400).end(JSON.stringify({error:'invalid'})); }
    });
    return;
  }

  if (url.pathname === '/api/totals') {
    const total = ledger.reduce((s,i) => s+i.amount, 0);
    const x402 = ledger.filter(i => i.service !== 'referral' && i.service !== 'subscription').reduce((s,i) => s+i.amount, 0);
    const ref = ledger.filter(i => i.service === 'referral').reduce((s,i) => s+i.amount, 0);
    const sub = ledger.filter(i => i.service === 'subscription').reduce((s,i) => s+i.amount, 0);
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({total, x402, ref, sub, fees:0.5, net:Math.max(0,total-0.5), count:ledger.length}));
    return;
  }

  if (url.pathname === '/api/rows') {
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify(ledger.slice(-20).reverse().map(i => ({
      service: i.service, amount: i.amount,
      time: new Date(i.timestamp).toLocaleTimeString()
    }))));
    return;
  }

  res.writeHead(200, {'Content-Type': 'text/html'}).end(html);
});

server.listen(3888, '0.0.0.0', () => console.log(`Revenue Dashboard on ${SERVER}:3888`));
