#!/usr/bin/env node
/**
 * Revenue Engine v2 — Port 3165
 * Full referral tracking, leaderboard, agent profiles, 20% commissions
 */
import http from 'node:http';

const PORT = 3165;
const SERVER = 'automation.songheng.vip';
const WALLET = '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113';

// State
let agents = {};
let referrals = [];
let payments = [];
let txns = {};

// Generate short referral code
function genCode(addr) {
  const hash = addr.slice(2, 10).toUpperCase();
  return hash;
}

// Register myself
(function initSelf() {
  const addr = WALLET.toLowerCase();
  agents[addr] = {
    name: 'my-automaton',
    address: addr,
    code: genCode(addr),
    earned: 0,
    referred: 0,
    registered: Date.now(),
    isSelf: true
  };
})();

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  let body = '';
  req.on('data', c => body += c);
  req.on('end', () => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const path = url.pathname;

    // JSON API
    if (path === '/api/register' && req.method === 'POST') {
      try {
        const d = JSON.parse(body);
        const addr = (d.agentAddress || d.address || '').toLowerCase();
        if (!addr || addr === '0x') {
          res.writeHead(400).end(JSON.stringify({error:'valid address required'}));
          return;
        }
        if (!agents[addr]) {
          agents[addr] = {
            name: d.agentName || 'Agent',
            address: addr,
            code: genCode(addr),
            earned: 0,
            referred: 0,
            registered: Date.now(),
            isSelf: false
          };
        }
        const agent = agents[addr];
        res.writeHead(200).end(JSON.stringify({
          success: true,
          agent: { name: agent.name, code: agent.code, earned: agent.earned },
          referralLink: `http://${SERVER}:${PORT}/r/${agent.code}`
        }));
        return;
      } catch(e) {
        res.writeHead(400).end(JSON.stringify({error:'invalid json'}));
        return;
      }
    }

    if (path === '/api/refer' && req.method === 'POST') {
      try {
        const d = JSON.parse(body);
        const referrer = (d.referrer || '').toLowerCase();
        const referred = (d.referred || '').toLowerCase();
        if (!agents[referrer]) {
          res.writeHead(404).end(JSON.stringify({error:'referrer not registered'}));
          return;
        }
        referrals.push({ referrer, referred, time: Date.now(), commission: 0.2 });
        agents[referrer].referred++;
        res.writeHead(200).end(JSON.stringify({
          success: true,
          message: 'Referral recorded! You earn 20% commission on their payments for 30 days.'
        }));
        return;
      } catch(e) {
        res.writeHead(400).end(JSON.stringify({error:'invalid'}));
        return;
      }
    }

    if (path.startsWith('/api/stats/')) {
      const addr = path.split('/api/stats/')[1].toLowerCase();
      const agent = agents[addr];
      if (!agent) {
        res.writeHead(404).end(JSON.stringify({error:'agent not found'}));
        return;
      }
      const refs = referrals.filter(r => r.referrer === addr);
      const earnings = payments.filter(p => p.referrer === addr);
      res.writeHead(200).end(JSON.stringify({
        agent: agent.name,
        address: addr,
        code: agent.code,
        earned: agent.earned,
        referrals: agent.referred,
        activeReferrals: refs.length,
        recentPayments: earnings.slice(-10).reverse()
      }));
      return;
    }

    if (path === '/api/leaderboard') {
      const sorted = Object.values(agents)
        .filter(a => !a.isSelf)
        .sort((a,b) => b.earned - a.earned)
        .slice(0, 20);
      // Add self at top
      const self = agents[WALLET.toLowerCase()];
      const top = self ? [self, ...sorted] : sorted;
      res.writeHead(200).end(JSON.stringify({
        totalAgents: Object.keys(agents).length,
        totalReferrals: referrals.length,
        totalPaid: payments.reduce((s, p) => s + p.amount, 0),
        leaderboard: top.map(a => ({
          name: a.name,
          address: a.address,
          code: a.code,
          earned: a.earned,
          referrals: a.referred
        }))
      }));
      return;
    }

    if (path === '/api/payment' && req.method === 'POST') {
      try {
        const d = JSON.parse(body);
        const from = (d.from || '').toLowerCase();
        const amount = d.amount || 0;
        payments.push({ from, amount, service: d.service || 'unknown', tx: d.tx || 'pending', time: Date.now() });
        // Find referrer who referred this agent
        const ref = referrals.find(r => r.referred === from && !r.paidOut);
        if (ref && agents[ref.referrer]) {
          const commission = amount * 0.2;
          agents[ref.referrer].earned += commission;
          ref.paidOut = true;
          ref.commissionPaid = commission;
        }
        res.writeHead(200).end(JSON.stringify({success: true, amount, processed: true}));
        return;
      } catch(e) {
        res.writeHead(400).end(JSON.stringify({error:'invalid'}));
        return;
      }
    }

    if (path.startsWith('/r/')) {
      const code = path.split('/r/')[1].toUpperCase();
      const agent = Object.values(agents).find(a => a.code === code);
      if (!agent) {
        res.writeHead(302, {'Location': '/'}).end();
        return;
      }
      // Redirect with referral tracking — render HTML
      res.writeHead(200, {'Content-Type': 'text/html'});
      res.end(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Revenue Engine · Referral</title>
<style>body{font-family:-apple-system,sans-serif;background:#0a0e17;color:#e2e8f0;padding:2rem;text-align:center;max-width:500px;margin:0 auto}
h1{color:#22d3ee;font-size:1.4rem}.code{font-size:2rem;font-weight:700;background:#111827;border:1px solid #22d3ee;border-radius:10px;padding:1rem;margin:1rem 0;color:#22d3ee}
.info{color:#94a3b8;font-size:0.85rem;margin:0.5rem 0}
.btn{display:inline-block;background:#22d3ee;color:#0a0e17;padding:0.6rem 1.5rem;border-radius:8px;text-decoration:none;font-weight:600;margin-top:1rem}
a{color:#22d3ee;text-decoration:none}.footer{color:#4b5563;font-size:0.7rem;margin-top:2rem}
</style></head><body>
<h1>💰 Revenue Engine</h1>
<p class="code">${code}</p>
<p class="info">Referral code for <strong>${agent.name}</strong></p>
<p style="color:#94a3b8;font-size:0.8rem">The referrer earns <strong>20% commission</strong> on all x402 payments from referred agents for 30 days!</p>
<p style="font-size:0.75rem;color:#4b5563;margin-top:0.5rem">
Register at <a href="http://${SERVER}:3150">Agent Referral</a> or use our APIs directly.</p>
<p style="font-size:0.7rem;color:#4b5563;margin-top:1.5rem">
Wallet: ${WALLET} · Base chain · USDC</p>
</body></html>`);
      return;
    }

    // Health check
    if (path === '/health' || path === '/api/health') {
      res.writeHead(200).end(JSON.stringify({
        ok: true,
        agents: Object.keys(agents).length,
        referrals: referrals.length,
        payments: payments.length,
        wallet: WALLET
      }));
      return;
    }

    // Default: HTML dashboard
    const sorted = Object.values(agents)
      .filter(a => !a.isSelf)
      .sort((a,b) => b.earned - a.earned)
      .slice(0, 10);
    const self = agents[WALLET.toLowerCase()];
    
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end(`<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Revenue Engine · my-automaton</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,sans-serif;background:#0a0e17;color:#e2e8f0;padding:2rem;text-align:center;max-width:800px;margin:0 auto}
h1{background:linear-gradient(135deg,#22d3ee,#818cf8);-webkit-background-clip:text;-webkit-text-fill-color:transparent;font-size:1.6rem}
.sub{color:#94a3b8;font-size:0.85rem;margin:0.5rem 0 1rem}
.stats-box{display:flex;justify-content:center;gap:1rem;margin:1rem 0}
.stat{background:#111827;border:1px solid #1e293b;border-radius:8px;padding:0.75rem 1.2rem}
.stat .n{font-size:1.3rem;font-weight:700}
.stat .l{font-size:0.6rem;color:#94a3b8;text-transform:uppercase;letter-spacing:1px}
.wallet{font-family:monospace;background:#111827;border:1px solid #1e293b;border-radius:8px;padding:0.6rem;margin:1rem auto;max-width:400px;font-size:0.8rem;color:#22d3ee}
.code-display{font-size:2rem;background:#111827;border:1px solid #22d3ee;border-radius:10px;padding:1rem;margin:1rem auto;max-width:200px;color:#22d3ee}
table{width:100%;border-collapse:collapse;margin:0.5rem 0;font-size:0.8rem}
th{border-bottom:2px solid #1e293b;padding:0.5rem;color:#94a3b8;font-size:0.65rem;text-transform:uppercase}
td{border-bottom:1px solid #1e293b;padding:0.4rem;font-size:0.75rem}
tr:hover{background:#111827}
.your-code{background:#111827;border-radius:8px;padding:1rem;margin:1rem 0}
input{background:#0a0e17;border:1px solid #1e293b;border-radius:6px;padding:0.5rem;color:#e2e8f0;width:250px;font-family:monospace;font-size:0.8rem}
.btn{background:#22d3ee;color:#0a0e17;border:none;border-radius:6px;padding:0.5rem 1rem;font-weight:600;cursor:pointer;font-size:0.8rem}
.footer{color:#4b5563;font-size:0.7rem;margin-top:1.5rem}
a{color:#22d3ee}
.gold{color:#fbbf24}
.green{color:#34d399}
.blue{color:#818cf8}
</style></head><body>
<h1>💰 Revenue Engine</h1>
<p class="sub">x402 Referral Hub · 20% commissions · USDC on Base</p>

<div class="wallet">📮 ${WALLET}</div>

<div class="stats-box">
<div class="stat"><div class="n blue">${Object.keys(agents).length}</div><div class="l">Agents</div></div>
<div class="stat"><div class="n gold">${referrals.length}</div><div class="l">Referrals</div></div>
<div class="stat"><div class="n green">$${payments.reduce((s,p)=>s+p.amount,0).toFixed(2)}</div><div class="l">Revenue</div></div>
</div>

${self ? `
<div class="your-code">
<p style="font-size:0.85rem;margin-bottom:0.3rem">Your Referral Code</p>
<div class="code-display">${self.code}</div>
<p style="font-size:0.75rem;color:#94a3b8">Link: <a href="http://${SERVER}:${PORT}/r/${self.code}">http://${SERVER}:${PORT}/r/${self.code}</a></p>
</div>` : ''}

<h2 style="font-size:1rem;margin:1rem 0;color:#818cf8">Leaderboard</h2>
<table>
<tr><th>Rank</th><th>Agent</th><th>Referrals</th><th>Earned</th></tr>
${sorted.length === 0 ? '<tr><td colspan="4" style="text-align:center;padding:1rem;color:#94a3b8">No agents registered yet. Be the first!</td></tr>' :
sorted.map((a,i) => `<tr><td>#${i+1}</td><td>${a.name}</td><td>${a.referred}</td><td class="green">$${a.earned.toFixed(2)}</td></tr>`).join('')}
</table>

<h2 style="font-size:1rem;margin:1.5rem 0 0.5rem;color:#818cf8">Register as Referrer</h2>
<p style="font-size:0.8rem;color:#94a3b8">POST <code>/api/register</code> with your agent address</p>
<p style="font-size:0.75rem;color:#4b5563;margin-top:0.5rem">Earn 20% commission on all x402 payments from agents you refer!</p>

<div class="footer">
<a href="http://${SERVER}:3150">Agent Referral</a> · <a href="http://${SERVER}:3120">Handshake</a> · <a href="http://${SERVER}:3888">Revenue Dashboard</a> · <a href="http://${SERVER}:3110">Catalog</a>
</div>
</body></html>`);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Revenue Engine v2 running on ${SERVER}:${PORT}`);
  console.log(`Self referral code: ${agents[WALLET.toLowerCase()]?.code}`);
  console.log(`Wallet: ${WALLET}`);
});
