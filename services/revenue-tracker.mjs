#!/usr/bin/env node
/**
 * Revenue Tracker — live USDC revenue dashboard for my-automaton
 * Port: 3800
 * Tracks: x402 payments, referral commissions, subscription income
 */
import http from 'node:http';

const WALLET = '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113';
const SERVER = 'automation.songheng.vip';

// Revenue ledger (in-memory, survives restarts via the host)
const ledger = {
  x402: [],        // {tx, amount, service, timestamp}
  referrals: [],   // {from, amount, referred, timestamp}
  subscriptions: [], // {agent, plan, amount, timestamp}
  total: { x402: 0, referrals: 0, subscriptions: 0, fees: 0 }
};

const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Revenue Tracker — my-automaton</title>
<style>
  :root{--bg:#0a0e17;--surface:#111827;--border:#1e293b;--accent:#22d3ee;--green:#34d399;--yellow:#fbbf24;--red:#ef4444;--text:#e2e8f0;--text2:#94a3b8}
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:-apple-system,sans-serif;background:var(--bg);color:var(--text);padding:2rem;max-width:900px;margin:0 auto}
  h1{color:var(--accent);text-align:center;font-size:1.6rem}
  .sub{text-align:center;color:var(--text2);font-size:0.8rem;margin-bottom:1.5rem}
  .row{display:flex;gap:1rem;margin:1rem 0;flex-wrap:wrap}
  .card{flex:1;min-width:120px;background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:1.2rem;text-align:center}
  .num{font-size:1.8rem;font-weight:700;color:#fff}
  .lbl{font-size:0.65rem;color:var(--text2);text-transform:uppercase;letter-spacing:1px;margin-top:0.2rem}
  table{width:100%;border-collapse:collapse;margin:0.5rem 0;font-size:0.85rem}
  th{padding:0.5rem;border-bottom:1px solid var(--border);text-align:left;color:var(--text2);text-transform:uppercase;font-size:0.65rem;letter-spacing:1px}
  td{padding:0.4rem 0.5rem;border-bottom:1px solid var(--border)}
  .section{margin:1.5rem 0}
  .section h2{font-size:1rem;color:#818cf8;margin-bottom:0.5rem}
  .wallet-box{background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:0.75rem 1rem;margin:1rem 0;text-align:center;font-size:0.8rem}
  .wallet-box code{color:var(--accent);font-size:0.75rem;word-break:break-all}
  a{color:var(--accent);text-decoration:none}
  .empty{text-align:center;color:var(--text2);padding:1rem}
</style>
</head>
<body>
  <h1>💰 Revenue Tracker</h1>
  <p class="sub">Live USDC earnings on Base chain · x402 micropayments · Referrals · Subscriptions</p>

  <div class="wallet-box">
    Wallet: <code>${WALLET}</code> · Base · USDC
  </div>

  <div class="row">
    <div class="card"><div class="num" style="color:var(--green)">$${(ledger.total.x402 + ledger.total.referrals + ledger.total.subscriptions).toFixed(2)}</div><div class="lbl">Total Revenue</div></div>
    <div class="card"><div class="num" style="color:var(--accent)">$${ledger.total.x402.toFixed(2)}</div><div class="lbl">x402 Payments</div></div>
    <div class="card"><div class="num" style="color:var(--yellow)">$${ledger.total.referrals.toFixed(2)}</div><div class="lbl">Referral Commissions</div></div>
    <div class="card"><div class="num" style="color:#818cf8">$${ledger.total.subscriptions.toFixed(2)}</div><div class="lbl">Subscriptions</div></div>
    <div class="card"><div class="num" style="color:var(--red)">$${ledger.total.fees.toFixed(2)}</div><div class="lbl">Compute Costs</div></div>
    <div class="card"><div class="num" style="color:#fff">$${Math.max(0, ledger.total.x402 + ledger.total.referrals + ledger.total.subscriptions - ledger.total.fees).toFixed(2)}</div><div class="lbl">Net Profit</div></div>
  </div>

  <div class="section">
    <h2>🪙 x402 Payments</h2>
    <table>
      <tr><th>Service</th><th>Amount</th><th>TX</th><th>Time</th></tr>
      ${ledger.x402.length === 0 ? '<tr><td colspan="4" class="empty">No payments yet — waiting for first agent to use x402 endpoints</td></tr>' :
      ledger.x402.slice(-10).reverse().map(p => 
        `<tr><td>${p.service}</td><td style="color:var(--green)">$${p.amount.toFixed(2)}</td><td style="font-family:monospace;font-size:0.7rem;color:var(--text2)">${p.tx.slice(0,12)}...</td><td style="font-size:0.7rem;color:var(--text2)">${new Date(p.timestamp).toLocaleDateString()}</td></tr>`
      ).join('')}
    </table>
  </div>

  <div class="section">
    <h2>🤝 Referrals</h2>
    <table>
      <tr><th>Agent</th><th>Amount</th><th>Referred</th><th>Time</th></tr>
      ${ledger.referrals.length === 0 ? '<tr><td colspan="4" class="empty">No referrals yet — share your referral link!</td></tr>' :
      ledger.referrals.slice(-10).reverse().map(r =>
        `<tr><td style="font-family:monospace;font-size:0.7rem">${r.from.slice(0,8)}...</td><td style="color:var(--yellow)">$${r.amount.toFixed(2)}</td><td style="font-family:monospace;font-size:0.7rem">${r.referred.slice(0,8)}...</td><td style="font-size:0.7rem;color:var(--text2)">${new Date(r.timestamp).toLocaleDateString()}</td></tr>`
      ).join('')}
    </table>
  </div>

  <div class="section">
    <h2>📅 Subscriptions</h2>
    <table>
      <tr><th>Agent</th><th>Plan</th><th>Amount</th><th>Time</th></tr>
      ${ledger.subscriptions.length === 0 ? '<tr><td colspan="4" class="empty">No subscriptions yet — plans from $5/mo at port 4000</td></tr>' :
      ledger.subscriptions.slice(-10).reverse().map(s =>
        `<tr><td style="font-family:monospace;font-size:0.7rem">${s.agent.slice(0,8)}...</td><td>${s.plan}</td><td style="color:#818cf8">$${s.amount.toFixed(2)}</td><td style="font-size:0.7rem;color:var(--text2)">${new Date(s.timestamp).toLocaleDateString()}</td></tr>`
      ).join('')}
    </table>
  </div>

  <p style="text-align:center;font-size:0.75rem;color:var(--text2);margin-top:1.5rem">
    <a href="http://${SERVER}:3020">x402 Gateway</a> · 
    <a href="http://${SERVER}:3150">Referral</a> · 
    <a href="http://${SERVER}:4000">Subscriptions</a> · 
    <a href="http://${SERVER}:4290">Ledger</a>
  </p>
</body>
</html>`;

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
        if (d.type === 'x402') {
          ledger.x402.push({tx:d.tx, amount:d.amount, service:d.service||'unknown', timestamp:Date.now()});
          ledger.total.x402 += d.amount;
        } else if (d.type === 'referral') {
          ledger.referrals.push({from:d.from, amount:d.amount, referred:d.referred, timestamp:Date.now()});
          ledger.total.referrals += d.amount;
        } else if (d.type === 'subscription') {
          ledger.subscriptions.push({agent:d.agent, plan:d.plan, amount:d.amount, timestamp:Date.now()});
          ledger.total.subscriptions += d.amount;
        } else if (d.type === 'fee') {
          ledger.total.fees += Math.abs(d.amount);
        }
        res.writeHead(200).end(JSON.stringify({success:true, totals:ledger.total}));
      } catch { res.writeHead(400).end(JSON.stringify({error:'invalid'})); }
    });
    return;
  }

  if (url.pathname === '/api/totals') {
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({
      total: ledger.total.x402 + ledger.total.referrals + ledger.total.subscriptions,
      x402: ledger.total.x402,
      referrals: ledger.total.referrals,
      subscriptions: ledger.total.subscriptions,
      fees: ledger.total.fees,
      net: Math.max(0, ledger.total.x402 + ledger.total.referrals + ledger.total.subscriptions - ledger.total.fees),
      transactions: ledger.x402.length + ledger.referrals.length + ledger.subscriptions.length
    }));
    return;
  }

  res.writeHead(200, {'Content-Type': 'text/html'}).end(html);
});

server.listen(3800, '0.0.0.0', () => console.log(`Revenue Tracker on ${SERVER}:3800`));
