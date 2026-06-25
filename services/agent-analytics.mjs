#!/usr/bin/env node
/**
 * Agent Analytics — usage tracking for my-automaton's service ecosystem
 * Port: 3950
 * Tracks API calls, x402 payments, referrals, subscriptions
 */
import http from 'node:http';

const WALLET = '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113';
const SERVER = 'automation.songheng.vip';

// In-memory analytics store
const analytics = {
  apiCalls: [],
  payments: [],
  referrals: [],
  subscriptions: [],
  startTime: Date.now()
};

function log(method, path, service, cost) {
  analytics.apiCalls.push({ method, path, service, cost, time: Date.now() });
  // Keep only last 10000 entries
  if (analytics.apiCalls.length > 10000) analytics.apiCalls = analytics.apiCalls.slice(-5000);
}

function recordPayment(from, amount, service, tx) {
  analytics.payments.push({ from, amount, service, tx, time: Date.now() });
}

function recordReferral(referrer, referred) {
  analytics.referrals.push({ referrer, referred, time: Date.now() });
}

function recordSubscription(agent, plan, amount) {
  analytics.subscriptions.push({ agent, plan, amount, time: Date.now() });
}

const html = `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Agent Analytics — my-automaton</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,sans-serif;background:#0a0e17;color:#e2e8f0;padding:2rem;max-width:900px;margin:0 auto}
h1{color:#22d3ee;text-align:center;font-size:1.4rem}
.sub{text-align:center;color:#94a3b8;font-size:0.85rem;margin-bottom:1rem}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:0.75rem;margin:1rem 0}
.stat{background:#111827;border:1px solid #1e293b;border-radius:8px;padding:1rem;text-align:center}
.stat .n{font-size:1.6rem;font-weight:700}
.stat .l{font-size:0.65rem;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-top:0.2rem}
.card{background:#111827;border:1px solid #1e293b;border-radius:8px;padding:1rem;margin:0.75rem 0}
.card h2{font-size:0.95rem;color:#818cf8;margin-bottom:0.5rem}
table{width:100%;border-collapse:collapse;font-size:0.8rem}
th{border-bottom:1px solid #1e293b;padding:0.4rem;text-align:left;color:#94a3b8;font-size:0.6rem;text-transform:uppercase}
td{border-bottom:1px solid #1e293b;padding:0.35rem;font-size:0.75rem}
.footer{text-align:center;font-size:0.7rem;color:#94a3b8;margin-top:1.5rem}
a{color:#22d3ee}
</style></head><body>
<h1>📊 Agent Analytics</h1>
<p class="sub">Usage analytics for my-automaton · <code>${WALLET}</code></p>

<div class="stats" id="stats"></div>
<div class="card"><h2>📞 Recent API Calls</h2><table><tr><th>Time</th><th>Service</th><th>Method</th><th>Cost</th></tr><tbody id="calls"></tbody></table></div>
<div class="card"><h2>💳 Recent Payments</h2><table><tr><th>From</th><th>Amount</th><th>Service</th></tr><tbody id="payments"></tbody></table></div>
<div class="card"><h2>🔗 Recent Referrals</h2><table><tr><th>Referrer</th><th>Referred</th></tr><tbody id="referrals"></tbody></table></div>

<div class="footer">
  <a href="http://${SERVER}:3888">Revenue Dashboard</a> · <a href="http://${SERVER}:3188">Service Dashboard</a> · <a href="http://${SERVER}:3110">Catalog</a>
</div>

<script>
async function refresh() {
  try {
    const res = await fetch('/api/stats');
    const d = await res.json();
    document.getElementById('stats').innerHTML = 
      '<div class="stat"><div class="n" style="color:#22d3ee">'+d.totalCalls+'</div><div class="l">API Calls</div></div>'+
      '<div class="stat"><div class="n" style="color:#34d399">$'+d.totalRevenue.toFixed(2)+'</div><div class="l">Revenue</div></div>'+
      '<div class="stat"><div class="n" style="color:#fbbf24">'+d.totalReferrals+'</div><div class="l">Referrals</div></div>'+
      '<div class="stat"><div class="n" style="color:#a78bfa">'+d.activeServices+'</div><div class="l">Services</div></div>';
    
    document.getElementById('calls').innerHTML = d.recentCalls.map(c => 
      '<tr><td style="color:#94a3b8;font-size:0.65rem">'+new Date(c.time).toLocaleTimeString()+'</td><td>'+c.service+'</td><td>'+c.method+'</td><td>'+(c.cost||'free')+'</td></tr>'
    ).join('');
    
    document.getElementById('payments').innerHTML = d.recentPayments.map(p =>
      '<tr><td style="font-family:monospace;font-size:0.65rem;color:#94a3b8">'+p.from.slice(0,10)+'..</td><td style="color:#34d399">$'+p.amount.toFixed(2)+'</td><td>'+p.service+'</td></tr>'
    ).join('') || '<tr><td colspan="3" style="text-align:center;color:#94a3b8">No payments yet</td></tr>';
    
    document.getElementById('referrals').innerHTML = d.recentReferrals.map(r =>
      '<tr><td style="font-family:monospace;font-size:0.65rem;color:#94a3b8">'+r.referrer.slice(0,10)+'..</td><td style="font-family:monospace;font-size:0.65rem;color:#94a3b8">'+r.referred.slice(0,10)+'..</td></tr>'
    ).join('') || '<tr><td colspan="2" style="text-align:center;color:#94a3b8">No referrals yet</td></tr>';
  } catch(e) { console.error(e); }
}
refresh();
setInterval(refresh, 5000);
</script>
</body></html>`;

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === '/api/log' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const d = JSON.parse(body);
        log(d.method || 'GET', d.path || '/', d.service || 'unknown', d.cost || null);
        if (d.type === 'payment') recordPayment(d.from, d.amount, d.service, d.tx);
        if (d.type === 'referral') recordReferral(d.referrer, d.referred);
        if (d.type === 'subscription') recordSubscription(d.agent, d.plan, d.amount);
        res.writeHead(200).end(JSON.stringify({success:true}));
      } catch { res.writeHead(400).end(JSON.stringify({error:'invalid'})); }
    });
    return;
  }

  if (url.pathname === '/api/stats') {
    const now = Date.now();
    const hourAgo = now - 3600000;
    res.writeHead(200, {'Content-Type': 'application/json'}).end(JSON.stringify({
      totalCalls: analytics.apiCalls.length,
      callsThisHour: analytics.apiCalls.filter(c => c.time > hourAgo).length,
      totalRevenue: analytics.payments.reduce((sum, p) => sum + p.amount, 0),
      totalPayments: analytics.payments.length,
      totalReferrals: analytics.referrals.length,
      activeServices: 32,
      uptime: Math.floor((now - analytics.startTime) / 1000),
      recentCalls: analytics.apiCalls.slice(-10).reverse(),
      recentPayments: analytics.payments.slice(-10).reverse(),
      recentReferrals: analytics.referrals.slice(-10).reverse(),
      recentSubscriptions: analytics.subscriptions.slice(-10).reverse()
    }));
    return;
  }

  if (url.pathname.startsWith('/api/log/')) {
    const type = url.pathname.split('/api/log/')[1];
    if (type === 'calls') {
      res.writeHead(200).end(JSON.stringify(analytics.apiCalls.slice(-50).reverse()));
    } else if (type === 'payments') {
      res.writeHead(200).end(JSON.stringify(analytics.payments.slice(-50).reverse()));
    } else if (type === 'referrals') {
      res.writeHead(200).end(JSON.stringify(analytics.referrals.slice(-50).reverse()));
    } else {
      res.writeHead(404).end(JSON.stringify({error:'unknown type'}));
    }
    return;
  }

  res.writeHead(200, {'Content-Type': 'text/html'}).end(html);
});

server.listen(3950, '0.0.0.0', () => {
  console.log(`Agent Analytics on ${SERVER}:3950`);
  // Log a boot event
  log('BOOT', '/system/startup', 'analytics', null);
});
