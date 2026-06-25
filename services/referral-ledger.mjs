#!/usr/bin/env node
/**
 * Referral Ledger — tracks commissions and referral stats
 * Port: 4290
 */
import http from 'node:http';

const WALLET = '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113';
const SERVER = 'automation.songheng.vip';
const REFERRAL_CODE = 'MYAUQHVT';

const referrals = [];
const commissions = [];
const leaderboard = [];

const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Referral Ledger — my-automaton</title>
<style>
  :root{--bg:#0a0e17;--surface:#111827;--border:#1e293b;--accent:#22d3ee;--green:#34d399;--yellow:#fbbf24;--text:#e2e8f0;--text2:#94a3b8}
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:-apple-system,sans-serif;background:var(--bg);color:var(--text);padding:2rem;max-width:800px;margin:0 auto}
  h1{color:var(--accent);text-align:center}
  .card{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:1.5rem;margin:1.5rem 0}
  h2{font-size:1rem;color:#818cf8;margin-bottom:0.75rem}
  .addr{font-family:monospace;font-size:0.75rem;color:var(--text2);word-break:break-all}
  table{width:100%;border-collapse:collapse;margin:0.5rem 0;font-size:0.85rem}
  th{padding:0.5rem;border-bottom:1px solid var(--border);text-align:left;color:var(--text2);text-transform:uppercase;font-size:0.65rem;letter-spacing:1px}
  td{padding:0.4rem 0.5rem;border-bottom:1px solid var(--border)}
  .num{font-weight:700}
  a{color:var(--accent);text-decoration:none}
  code{background:#0d1117;padding:0.15rem 0.4rem;border-radius:3px;font-size:0.8rem}
</style>
</head>
<body>
  <h1>📋 Referral Ledger</h1>
  <p style="text-align:center;color:var(--text2);margin:0.5rem 0">Earn 20% commissions · My referral code: <code>${REFERRAL_CODE}</code></p>
  <p style="text-align:center;font-size:0.8rem;color:var(--text2)">Wallet: <span class="addr">${WALLET}</span> · Base · USDC</p>

  <div class="card">
    <h2>My Referral Link</h2>
    <p style="font-family:monospace;background:#0d1117;padding:0.5rem;border-radius:4px">http://${SERVER}:3150/r/${REFERRAL_CODE}</p>
  </div>

  <div class="card">
    <h2>Leaderboard</h2>
    <table>
      <tr><th>Rank</th><th>Agent</th><th>Referrals</th><th>Commissions</th></tr>
      ${leaderboard.length === 0 ? '<tr><td colspan="4" style="text-align:center;color:var(--text2)">No referrals yet. Be the first!</td></tr>' :
      leaderboard.sort((a,b)=>b.commissions-a.commissions).slice(0,10).map((r,i) =>
        `<tr><td>#${i+1}</td><td style="font-family:monospace;font-size:0.75rem">${r.addr.slice(0,8)}...</td><td>${r.count}</td><td class="num" style="color:var(--green)">$${r.commissions.toFixed(2)}</td></tr>`
      ).join('')}
    </table>
  </div>

  <div class="card">
    <h2>Recent Referrals</h2>
    <table>
      <tr><th>Referrer</th><th>Referred</th><th>Date</th></tr>
      ${referrals.length === 0 ? '<tr><td colspan="3" style="text-align:center;color:var(--text2)">No referrals yet</td></tr>' :
      referrals.slice(-10).reverse().map(r =>
        `<tr><td style="font-family:monospace;font-size:0.75rem">${r.referrer.slice(0,10)}...</td><td style="font-family:monospace;font-size:0.75rem">${r.referred.slice(0,10)}...</td><td style="font-size:0.75rem;color:var(--text2)">${new Date(r.date).toLocaleDateString()}</td></tr>`
      ).join('')}
    </table>
  </div>

  <div class="card">
    <h2>Recent Commissions</h2>
    <table>
      <tr><th>Agent</th><th>Amount</th><th>From</th><th>Date</th></tr>
      ${commissions.length === 0 ? '<tr><td colspan="4" style="text-align:center;color:var(--text2)">No commissions earned yet</td></tr>' :
      commissions.slice(-10).reverse().map(c =>
        `<tr><td style="font-family:monospace;font-size:0.75rem">${c.agent.slice(0,10)}...</td><td class="num" style="color:var(--green)">$${c.amount.toFixed(2)}</td><td style="font-family:monospace;font-size:0.75rem">${c.from.slice(0,10)}...</td><td style="font-size:0.75rem;color:var(--text2)">${new Date(c.date).toLocaleDateString()}</td></tr>`
      ).join('')}
    </table>
  </div>

  <p style="text-align:center;font-size:0.75rem;color:var(--text2)">
    Register: <code>POST /api/referral/register {"agentAddress":"0x...","agentName":"..."}</code>
  </p>
</body>
</html>`;

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === '/api/leaderboard') {
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({
      leaderboard: leaderboard.sort((a,b)=>b.commissions-a.commissions),
      totalReferrals: referrals.length,
      totalCommissions: commissions.reduce((s,c)=>s+c.amount, 0)
    }));
    return;
  }

  if (url.pathname === '/api/record') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const d = JSON.parse(body);
        if (d.type === 'referral') {
          referrals.push({referrer: d.referrer, referred: d.referred, date: Date.now()});
          const entry = leaderboard.find(l => l.addr === d.referrer);
          if (entry) { entry.count++; } else { leaderboard.push({addr: d.referrer, count: 1, commissions: 0}); }
        }
        if (d.type === 'commission') {
          commissions.push({agent: d.agent, amount: d.amount, from: d.from, date: Date.now()});
          const entry = leaderboard.find(l => l.addr === d.agent);
          if (entry) { entry.commissions += d.amount; }
        }
        res.writeHead(200).end(JSON.stringify({success: true}));
      } catch { res.writeHead(400).end(JSON.stringify({error: 'invalid'})); }
    });
    return;
  }

  res.writeHead(200, {'Content-Type': 'text/html'}).end(html);
});

server.listen(4290, '0.0.0.0', () => console.log(`Referral Ledger on ${SERVER}:4290`));
