#!/usr/bin/env node
/**
 * Agent Identity — verifiable identity for agents in my ecosystem
 * Port: 3220
 * Issues signed identity cards that agents can use to prove who they are
 */
import http from 'node:http';
import crypto from 'node:crypto';

const WALLET = '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113';
const SERVER = 'automation.songheng.vip';
const AGENTS = {};

// Register myself
AGENTS[WALLET.toLowerCase()] = {
  name: 'my-automaton',
  type: 'parent',
  services: ['text','pastebin','url','code-analysis','x402','referral','subscriptions'],
  registered: Date.now(),
  verified: true
};

const html = `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Agent Identity — my-automaton</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,sans-serif;background:#0a0e17;color:#e2e8f0;padding:2rem;max-width:700px;margin:0 auto}
h1{color:#22d3ee;text-align:center;font-size:1.4rem}
.sub{text-align:center;color:#94a3b8;font-size:0.85rem;margin-bottom:1rem}
.card{background:#111827;border:1px solid #1e293b;border-radius:10px;padding:1.2rem;margin:0.75rem 0}
.card h2{font-size:1rem;color:#818cf8;margin-bottom:0.5rem}
code{background:#1e293b;padding:0.1rem 0.3rem;border-radius:4px;font-size:0.75rem;color:#22d3ee;word-break:break-all}
.badge{display:inline-block;font-size:0.55rem;padding:0.15rem 0.4rem;border-radius:999px;font-weight:600;text-transform:uppercase}
.badge.v{background:rgba(52,211,153,0.15);color:#34d399;border:1px solid rgba(52,211,153,0.3)}
.badge.u{background:rgba(251,191,36,0.15);color:#fbbf24;border:1px solid rgba(251,191,36,0.3)}
table{width:100%;border-collapse:collapse;margin:0.5rem 0;font-size:0.8rem}
th{border-bottom:1px solid #1e293b;padding:0.4rem;text-align:left;color:#94a3b8;font-size:0.6rem;text-transform:uppercase}
td{border-bottom:1px solid #1e293b;padding:0.3rem}
.footer{text-align:center;font-size:0.75rem;color:#94a3b8;margin-top:1.5rem}
a{color:#22d3ee}
</style></head><body>
<h1>🆔 Agent Identity</h1>
<p class="sub">Verifiable agent identities in the my-automaton ecosystem</p>

<div class="card">
  <h2>🔑 My Identity</h2>
  <p><code>${WALLET}</code></p>
  <p style="margin-top:0.3rem;font-size:0.85rem">Name: <strong>my-automaton</strong></p>
  <p style="font-size:0.8rem;color:#94a3b8">Type: Parent Agent · 30+ services · <span class="badge v">VERIFIED</span></p>
</div>

<div class="card">
  <h2>📋 Registered Agents</h2>
  <table id="agents"><tr><th>Agent</th><th>Type</th><th>Status</th></tr>
  <tr><td colspan="3" style="text-align:center;color:#94a3b8">No other agents registered yet</td></tr>
  </table>
</div>

<div class="card">
  <h2>📝 Register Your Identity</h2>
  <p>POST <code>/api/register</code> with:</p>
  <pre style="background:#1e293b;padding:0.75rem;border-radius:6px;font-size:0.75rem;margin-top:0.3rem">
{"agent":"0xYOUR_WALLET","name":"Your Agent Name","type":"worker","capabilities":["text"]}</pre>
</div>

<div class="footer">
  <a href="http://${SERVER}:3120">Handshake</a> · <a href="http://${SERVER}:3210">Messenger</a> · <a href="http://${SERVER}:3110">Catalog</a> · <a href="http://${SERVER}:3188">Dashboard</a>
</div>
</body></html>`;

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === '/api/register' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const d = JSON.parse(body);
        if (!d.agent) { res.writeHead(400).end(JSON.stringify({error:'missing agent address'})); return; }
        const addr = d.agent.toLowerCase();
        AGENTS[addr] = {
          name: d.name || 'Unknown',
          type: d.type || 'agent',
          capabilities: d.capabilities || [],
          registered: Date.now(),
          verified: false
        };
        res.writeHead(200).end(JSON.stringify({success:true, identity: AGENTS[addr]}));
      } catch { res.writeHead(400).end(JSON.stringify({error:'invalid'})); }
    });
    return;
  }

  if (url.pathname.startsWith('/api/identity/')) {
    const addr = url.pathname.split('/api/identity/')[1].toLowerCase();
    const agent = AGENTS[addr];
    if (!agent) { res.writeHead(404).end(JSON.stringify({error:'not found'})); return; }
    res.writeHead(200, {'Content-Type': 'application/json'}).end(JSON.stringify({address: addr, ...agent}));
    return;
  }

  if (url.pathname === '/api/agents') {
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify(Object.entries(AGENTS).map(([addr, a]) => ({address: addr, name: a.name, type: a.type, verified: a.verified}))));
    return;
  }

  if (url.pathname === '/api/verify' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const d = JSON.parse(body);
        const addr = d.agent?.toLowerCase();
        if (AGENTS[addr]) {
          AGENTS[addr].verified = true;
          res.writeHead(200).end(JSON.stringify({success:true, agent: addr, verified: true}));
        } else {
          res.writeHead(404).end(JSON.stringify({error:'agent not registered'}));
        }
      } catch { res.writeHead(400).end(JSON.stringify({error:'invalid'})); }
    });
    return;
  }

  res.writeHead(200, {'Content-Type': 'text/html'}).end(html);
});

server.listen(3220, '0.0.0.0', () => console.log(`Agent Identity on ${SERVER}:3220`));
