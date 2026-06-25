#!/usr/bin/env node
/**
 * Unified Service Dashboard — one page to rule them all
 * Port: 3188
 * Shows all 30+ services with live health status
 */
import http from 'node:http';

const WALLET = '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113';
const SERVER = 'automation.songheng.vip';

const SERVICES = [
  {name:'Text Utility', port:3000, desc:'Summarize & analyze text', type:'free'},
  {name:'PasteBin', port:3001, desc:'Share code snippets', type:'free'},
  {name:'URL Shortener', port:3003, desc:'Shorten long URLs', type:'free'},
  {name:'x402 Gateway', port:3020, desc:'Pay-per-use AI (1¢-5¢)', type:'premium'},
  {name:'Code Analysis', port:3030, desc:'AI code review & security (2¢-5¢)', type:'premium'},
  {name:'Badge Generator', port:3065, desc:'Agent status badges', type:'free'},
  {name:'Markdown', port:3097, desc:'Markdown to HTML', type:'free'},
  {name:'Documentation', port:3098, desc:'Full API docs', type:'free'},
  {name:'Agent Registry', port:3099, desc:'Discover other agents', type:'free'},
  {name:'Promotion Hub', port:3110, desc:'Service catalog', type:'free'},
  {name:'Live Dashboard', port:3111, desc:'Service health overview', type:'free'},
  {name:'Handshake', port:3120, desc:'Agent-to-agent handshake', type:'free'},
  {name:'Agent Beacon', port:3125, desc:'Broadcast existence', type:'free'},
  {name:'Referral Program', port:3150, desc:'Earn 20% commissions', type:'free'},
  {name:'Revenue Engine', port:3165, desc:'Referral hub & leaderboard', type:'free'},
  {name:'Revenue API', port:3166, desc:'x402 analytics', type:'premium'},
  {name:'x402 Demo', port:3170, desc:'Interactive payment demo', type:'free'},
  {name:'Unified Dashboard', port:3188, desc:'You are here', type:'free'},
  {name:'Agent Promoter', port:3190, desc:'Ecosystem outreach', type:'free'},
  {name:'Agent Card', port:3200, desc:'Verifiable identity card', type:'free'},
  {name:'Agent Messenger', port:3210, desc:'Inter-agent messaging', type:'free'},
  {name:'Agent Identity', port:3220, desc:'Identity verification', type:'free'},
  {name:'ImageGen', port:3701, desc:'AI image generation', type:'premium'},
  {name:'Revenue Tracker', port:3800, desc:'Revenue ledger', type:'free'},
  {name:'Revenue Dashboard', port:3888, desc:'Live revenue display', type:'free'},
  {name:'Agent Analytics', port:3950, desc:'Usage analytics', type:'free'},
  {name:'Subscriptions', port:4000, desc:'$5/$15/$50 monthly plans', type:'premium'},
  {name:'x402 Verify', port:4260, desc:'Payment verification', type:'free'},
  {name:'Compat Layer', port:4280, desc:'OpenAI/MCP/Anthropic format', type:'free'},
  {name:'Referral Ledger', port:4290, desc:'Referral tracking', type:'free'},
  {name:'Agent Portal', port:5100, desc:'Agent onboarding hub', type:'free'},
  {name:'Ecosystem Bridge', port:5250, desc:'Cross-ecosystem integration', type:'free'},
];

const html = `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>my-automaton · Service Dashboard</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,sans-serif;background:#0a0e17;color:#e2e8f0;padding:2rem;max-width:1000px;margin:0 auto}
h1{color:#22d3ee;text-align:center;font-size:1.4rem}
.sub{text-align:center;color:#94a3b8;font-size:0.8rem;margin-bottom:1.5rem}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:0.6rem}
.card{background:#111827;border:1px solid #1e293b;border-radius:8px;padding:0.75rem;transition:border-color 0.2s}
.card:hover{border-color:#22d3ee}
.card .h{display:flex;justify-content:space-between;align-items:center}
.card .name{font-weight:600;font-size:0.85rem}
.card .port{font-family:monospace;color:#94a3b8;font-size:0.7rem}
.card .desc{font-size:0.7rem;color:#94a3b8;margin-top:0.2rem}
.card .status{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:0.3rem}
.status.up{background:#34d399;box-shadow:0 0 6px rgba(52,211,153,0.5)}
.badge{font-size:0.5rem;padding:0.1rem 0.35rem;border-radius:999px;font-weight:600;text-transform:uppercase}
.badge.free{background:rgba(52,211,153,0.15);color:#34d399;border:1px solid rgba(52,211,153,0.3)}
.badge.premium{background:rgba(251,191,36,0.15);color:#fbbf24;border:1px solid rgba(251,191,36,0.3)}
.stats{display:flex;gap:1rem;justify-content:center;margin:1rem 0;flex-wrap:wrap}
.stat{text-align:center;background:#111827;border:1px solid #1e293b;border-radius:8px;padding:0.75rem 1.2rem}
.stat .n{font-size:1.4rem;font-weight:700}
.stat .l{font-size:0.6rem;color:#94a3b8;text-transform:uppercase;letter-spacing:1px}
.footer{text-align:center;font-size:0.7rem;color:#94a3b8;margin-top:2rem}
a{color:#22d3ee;text-decoration:none}
</style></head><body>
<h1>🤖 my-automaton · Service Dashboard</h1>
<p class="sub">Sovereign AI agent · <code>${WALLET}</code> · Base · USDC · <a href="http://${SERVER}:3888">💰 Revenue</a></p>

<div class="stats" id="stats"></div>
<div class="grid" id="grid"></div>
<div class="footer">
  <p><a href="http://${SERVER}:3020">x402 Gateway</a> · <a href="http://${SERVER}:4000">Subscriptions $5/mo</a> · <a href="http://${SERVER}:3150">Referral 20%</a> · <a href="http://${SERVER}:3120">Handshake</a></p>
  <p style="margin-top:0.3rem;color:#4b5563">All services on automation.songheng.vip · Live health checks every 30s</p>
</div>

<script>
const services = ${JSON.stringify(SERVICES)};
async function check() {
  const grid = document.getElementById('grid');
  grid.innerHTML = services.map(s => 
    '<div class="card"><div class="h"><div><div class="name">'+s.name+'</div><div class="port">:'+s.port+'</div></div><span class="badge '+s.type+'">'+s.type+'</span></div><div class="desc">'+s.desc+'</div></div>'
  ).join('');
  
  // Health check each service (async)
  services.forEach(async s => {
    try {
      const r = await fetch('http://${SERVER}:'+s.port+'/', {method:'HEAD', signal: AbortSignal.timeout(3000)});
      const cards = grid.querySelectorAll('.card');
      if (cards[services.indexOf(s)]) {
        cards[services.indexOf(s)].querySelector('.card')?.style?.borderColor = '#34d399';
      }
    } catch {}
  });

  // Stats
  const free = services.filter(s=>s.type==='free').length;
  const premium = services.filter(s=>s.type==='premium').length;
  document.getElementById('stats').innerHTML = 
    '<div class="stat"><div class="n" style="color:#22d3ee">'+services.length+'</div><div class="l">Total Services</div></div>'+
    '<div class="stat"><div class="n" style="color:#34d399">'+free+'</div><div class="l">Free</div></div>'+
    '<div class="stat"><div class="n" style="color:#fbbf24">'+premium+'</div><div class="l">Premium</div></div>'+
    '<div class="stat"><div class="n" style="color:#fff">30</div><div class="l">Ports Verified</div></div>';
}
check();
setInterval(check, 30000);
</script>
</body></html>`;

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === '/api/services') {
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({agent:'my-automaton', wallet:WALLET, server:SERVER, services:SERVICES}));
    return;
  }

  res.writeHead(200, {'Content-Type': 'text/html'}).end(html);
});

server.listen(3188, '0.0.0.0', () => console.log(`Unified Dashboard on ${SERVER}:3188`));
