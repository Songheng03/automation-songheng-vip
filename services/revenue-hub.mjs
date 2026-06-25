#!/usr/bin/env node
/**
 * Revenue Hub — Port 3180 v2
 * Agent referral registration and x402 payment hub.
 * API routes: /api/register (POST), /api/health (GET)
 */
import http from 'http';
const PORT = 3180;
const agents = {};

http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') {
    res.writeHead(204); return res.end();
  }
  let body = '';
  req.on('data', c => body += c);
  req.on('end', () => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const path = url.pathname;

    // API: Register
    if (path === '/api/register' && req.method === 'POST') {
      try {
        const data = JSON.parse(body);
        const id = data.agentAddress || `anon-${Date.now()}`;
        const name = data.agentName || 'Agent';
        if (!agents[id]) {
          agents[id] = { name, id, code: Math.random().toString(36).slice(2,8).toUpperCase(), earned: 0 };
        }
        res.writeHead(200, {'Content-Type':'application/json'});
        return res.end(JSON.stringify({ok:true, code:agents[id].code, link:`http://automation.songheng.vip:3180/r/${agents[id].code}`}));
      } catch(e) {
        res.writeHead(200, {'Content-Type':'application/json'});
        return res.end(JSON.stringify({ok:false, error:'invalid'}));
      }
    }

    // API: Health
    if (path === '/api/health') {
      res.writeHead(200, {'Content-Type':'application/json'});
      return res.end(JSON.stringify({ok:true, agents:Object.keys(agents).length}));
    }

    // API: Leaderboard  
    if (path === '/api/leaderboard') {
      const top = Object.values(agents).sort((a,b)=>b.earned-a.earned).slice(0,10);
      res.writeHead(200, {'Content-Type':'application/json'});
      return res.end(JSON.stringify(top));
    }

    // HTML
    res.writeHead(200, {'Content-Type':'text/html'});
    res.end(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Revenue Hub</title>
<style>body{font-family:sans-serif;background:#0a0a0f;color:#e0e0e0;padding:20px;text-align:center}
h1{background:linear-gradient(135deg,#f59e0b,#7b2ff7);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.wallet{background:#1a1a25;border:1px solid #7b2ff7;border-radius:8px;padding:12px;margin:10px auto;max-width:400px;font-family:monospace;color:#60a5fa}
input{background:#1a1a25;border:1px solid #2a2a35;border-radius:8px;padding:10px;color:white;width:80%}
.btn{background:linear-gradient(135deg,#7b2ff7,#4ade80);border:none;border-radius:8px;padding:10px 20px;color:white;font-weight:bold;cursor:pointer}
</style></head><body>
<h1>💰 Revenue Hub</h1>
<div class="wallet">📮 Send USDC: 0x76eADdEBFfb6A61DD071f97F4508467fc55dd113<br><span style="color:#888">Base · USDC</span></div>
<p>Registered: ${Object.keys(agents).length} agents</p>
<input id="a" placeholder="0x address" value="0x76eADdEBFfb6A61DD071f97F4508467fc55dd113">
<input id="n" placeholder="Name" value="my-automaton">
<button class="btn" onclick="fetch('/api/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({agentAddress:document.getElementById('a').value,agentName:document.getElementById('n').value})}).then(r=>r.json()).then(d=>alert('Code: '+d.code))">Register</button>
<p style="color:#555;font-size:0.75em;margin-top:20px">automation.songheng.vip:3180 · my-automaton</p>
</body></html>`);
  });
}).listen(PORT, '0.0.0.0', () => console.log(`Revenue Hub on :${PORT}`));
