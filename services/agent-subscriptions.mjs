#!/usr/bin/env node
/**
 * Agent Subscriptions — recurring revenue via monthly plans
 * Port: 4000
 * $5/mo Starter, $15/mo Pro, $50/mo Enterprise
 */
import http from 'node:http';

const WALLET = '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113';
const SERVER = 'automation.songheng.vip';

const PLANS = {
  starter: { price: 5, name: 'Starter', requests: 5000, x402_discount: 0.5, rev_share: 0 },
  pro: { price: 15, name: 'Pro', requests: 25000, x402_discount: 1.0, rev_share: 0.05 },
  enterprise: { price: 50, name: 'Enterprise', requests: 100000, x402_discount: 1.0, rev_share: 0.10 }
};

const subscribers = [];

const html = `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Agent Subscriptions — my-automaton</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,sans-serif;background:#0a0e17;color:#e2e8f0;padding:2rem;max-width:800px;margin:0 auto}
h1{color:#22d3ee;text-align:center;font-size:1.5rem}
.sub{text-align:center;color:#94a3b8;font-size:0.85rem;margin-bottom:1.5rem}
.plans{display:grid;grid-template-columns:repeat(3,1fr);gap:0.75rem;margin:1.5rem 0}
.plan{background:#111827;border:1px solid #1e293b;border-radius:10px;padding:1.2rem;text-align:center;transition:border-color 0.2s}
.plan:hover{border-color:#22d3ee}
.plan.featured{border-color:#818cf8;position:relative}
.plan.featured::before{content:'★ Most Popular';position:absolute;top:-10px;left:50%;transform:translateX(-50%);background:#818cf8;color:#fff;font-size:0.55rem;padding:0.15rem 0.5rem;border-radius:999px;font-weight:600}
.plan .name{font-weight:600;font-size:1rem}
.plan .price{font-size:1.8rem;font-weight:700;margin:0.5rem 0}
.plan .price span{font-size:0.8rem;color:#94a3b8}
.plan ul{list-style:none;font-size:0.75rem;text-align:left;margin:0.5rem 0}
.plan ul li{color:#94a3b8;margin:0.3rem 0;padding-left:1rem;position:relative}
.plan ul li::before{content:'✓';position:absolute;left:0;color:#34d399}
.plan .btn{display:inline-block;margin-top:0.75rem;padding:0.4rem 1rem;border-radius:6px;text-decoration:none;font-size:0.8rem;font-weight:600;background:#22d3ee;color:#0a0e17}
.plan.featured .btn{background:#818cf8;color:#fff}
.card{background:#111827;border:1px solid #1e293b;border-radius:8px;padding:1.2rem;margin:1rem 0}
.card h2{font-size:1rem;color:#818cf8;margin-bottom:0.5rem}
code{background:#1e293b;padding:0.1rem 0.3rem;border-radius:4px;font-size:0.75rem;color:#22d3ee;word-break:break-all}
pre{background:#1e293b;padding:0.75rem;border-radius:6px;font-size:0.75rem;margin:0.3rem 0}
.footer{text-align:center;font-size:0.75rem;color:#94a3b8;margin-top:1.5rem}
a{color:#22d3ee}
</style></head><body>
<h1>📅 Agent Subscriptions</h1>
<p class="sub">Monthly plans for unlimited API access · Wallet: <code>${WALLET}</code></p>

<div class="plans">
${Object.entries(PLANS).map(([k,v]) => `
<div class="plan${k==='pro'?' featured':''}">
<div class="name">${v.name}</div>
<div class="price">$${v.price}<span>/mo</span></div>
<ul>
<li>${v.requests.toLocaleString()} requests/mo</li>
<li>x402 endpoints ${v.x402_discount >= 1 ? 'free' : '50% off'}</li>
${v.rev_share > 0 ? `<li>${(v.rev_share*100)}% revenue share</li>` : '<li>Standard fees</li>'}
<li>CORS enabled</li>
<li>Priority support</li>
</ul>
<a class="btn" href="http://${SERVER}:3020/api/subscribe?plan=${k}">Subscribe</a>
</div>
`).join('')}
</div>

<div class="card">
<h2>📡 Subscribe via API</h2>
<pre>
POST /api/subscribe
{"agent":"0xYOUR_WALLET","plan":"starter|pro|enterprise","duration_months":1}</pre>
<p style="font-size:0.8rem;color:#94a3b8;margin-top:0.5rem">
Send ${Object.values(PLANS).map(p => `$${p.price}`).join(' / ')} USDC to <code>${WALLET}</code> on Base chain,<br>
then POST to /api/subscribe with the tx hash to activate.
</p>
</div>

<div class="card">
<h2>👥 Current Subscribers</h2>
<table style="width:100%;border-collapse:collapse;font-size:0.8rem">
<tr><th style="border-bottom:1px solid #1e293b;padding:0.3rem;text-align:left;color:#94a3b8">Agent</th>
<th style="border-bottom:1px solid #1e293b;padding:0.3rem;text-align:left;color:#94a3b8">Plan</th>
<th style="border-bottom:1px solid #1e293b;padding:0.3rem;text-align:left;color:#94a3b8">Active</th></tr>
${subscribers.length === 0 ? '<tr><td colspan="3" style="text-align:center;color:#94a3b8;padding:0.5rem">No subscribers yet. Be the first!</td></tr>' :
subscribers.slice(-5).reverse().map(s => `<tr><td style="border-bottom:1px solid #1e293b;padding:0.3rem;font-family:monospace;font-size:0.65rem;color:#94a3b8">${s.agent.slice(0,12)}..</td><td style="border-bottom:1px solid #1e293b;padding:0.3rem">${s.plan}</td><td style="border-bottom:1px solid #1e293b;padding:0.3rem;color:#34d399">✓</td></tr>`).join('')}
</table>
</div>

<div class="footer">
<a href="http://${SERVER}:3020">x402 Pay-per-use</a> · <a href="http://${SERVER}:3150">Referral 20%</a> · <a href="http://${SERVER}:3120">Handshake</a> · <a href="http://${SERVER}:3888">Revenue</a>
</div>
</body></html>`;

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === '/api/subscribe' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const d = JSON.parse(body);
        if (!d.agent || !d.plan) {
          res.writeHead(400).end(JSON.stringify({error:'agent and plan required'}));
          return;
        }
        const plan = PLANS[d.plan.toLowerCase()];
        if (!plan) {
          res.writeHead(400).end(JSON.stringify({error:'invalid plan. Use: starter($5), pro($15), enterprise($50)'}));
          return;
        }
        const sub = {
          id: 'sub_' + Date.now().toString(36),
          agent: d.agent.toLowerCase(),
          plan: d.plan.toLowerCase(),
          amount: plan.price,
          months: d.duration_months || 1,
          tx: d.tx || null,
          startTime: Date.now(),
          endTime: Date.now() + ((d.duration_months || 1) * 30 * 24 * 60 * 60 * 1000),
          active: true,
          requestsUsed: 0
        };
        subscribers.push(sub);
        res.writeHead(200).end(JSON.stringify({
          success: true,
          subscription: sub,
          instructions: `Send $${plan.price * (d.duration_months || 1)} USDC to ${WALLET} on Base chain`
        }));
      } catch { res.writeHead(400).end(JSON.stringify({error:'invalid json'})); }
    });
    return;
  }

  if (url.pathname === '/api/status' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const d = JSON.parse(body);
        if (!d.agent) { res.writeHead(400).end(JSON.stringify({error:'agent required'})); return; }
        const addr = d.agent.toLowerCase();
        const activeSubs = subscribers.filter(s => s.agent === addr && s.active && Date.now() < s.endTime);
        res.writeHead(200).end(JSON.stringify({
          agent: addr,
          activeSubscriptions: activeSubs.length,
          plans: activeSubs.map(s => ({plan: s.plan, expiresAt: new Date(s.endTime).toISOString(), requestsUsed: s.requestsUsed})),
          available: activeSubs.length > 0
        }));
      } catch { res.writeHead(400).end(JSON.stringify({error:'invalid'})); }
    });
    return;
  }

  if (url.pathname === '/api/plans') {
    res.writeHead(200, {'Content-Type': 'application/json'}).end(JSON.stringify(PLANS));
    return;
  }

  res.writeHead(200, {'Content-Type': 'text/html'}).end(html);
});

server.listen(4000, '0.0.0.0', () => console.log(`Agent Subscriptions on ${SERVER}:4000`));
