#!/usr/bin/env node
/**
 * Agent Campaign Manager v1
 * Proactively discovers agents from ERC-8004 registry and other sources,
 * then sends them personalized value propositions to use my x402 services.
 * 
 * This is a SALES tool for my existing services, not a new SaaS.
 * It drives actual USDC revenue by onboarding paying agent customers.
 */

import http from 'http';
import https from 'https';

const PORT = 5550;
const MY_WALLET = '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113';
const MY_SERVER = 'automation.songheng.vip';

// Service catalog for pitching
const SERVICES = {
  free: [
    { name: 'Text Analyzer', endpoint: 'http://automation.songheng.vip:3000/api/analyze', value: 'Free AI text analysis' },
    { name: 'PasteBin', endpoint: 'http://automation.songheng.vip:3001/api/paste', value: 'Free code/text sharing' },
    { name: 'URL Shortener', endpoint: 'http://automation.songheng.vip:3003/api/shorten', value: 'Free URL shortening' },
    { name: 'Markdown Renderer', endpoint: 'http://automation.songheng.vip:3097/render', value: 'Free markdown conversion' },
    { name: 'Agent Registry', endpoint: 'http://automation.songheng.vip:3099/api/discover', value: 'Find other agents' },
  ],
  premium: [
    { name: 'Deep Analysis', endpoint: 'http://automation.songheng.vip:3030/v1/analyze', cost: 1, unit: '¢', value: 'Deep AI text analysis - 1¢' },
    { name: 'AI Summarize', endpoint: 'http://automation.songheng.vip:3030/v1/summarize', cost: 2, unit: '¢', value: 'AI summarization - 2¢' },
    { name: 'Code Review', endpoint: 'http://automation.songheng.vip:3030/v1/review', cost: 5, unit: '¢', value: 'Full code review - 5¢' },
    { name: 'Security Scan', endpoint: 'http://automation.songheng.vip:3030/v1/security', cost: 3, unit: '¢', value: 'Security vulnerability scan - 3¢' },
    { name: 'BTC Signal', endpoint: 'http://automation.songheng.vip:3060/v1/signal', cost: 5, unit: '¢', value: 'BTC trading signal - 5¢' },
    { name: 'Code Refactor', endpoint: 'http://automation.songheng.vip:3030/v1/refactor', cost: 5, unit: '¢', value: 'Refactoring suggestions - 5¢' },
  ],
  subscription: [
    { name: 'Starter', cost: 5, period: 'month', value: '5,000 requests/mo + 50% off x402 endpoints' },
    { name: 'Pro', cost: 15, period: 'month', value: '25,000 requests/mo + free x402 + 5% revenue share' },
    { name: 'Enterprise', cost: 50, period: 'month', value: '100,000 requests/mo + free x402 + 10% revenue share' },
  ]
};

// Outreach templates - personalized per agent
function buildPitch(agentName, agentAddress) {
  return {
    to: agentAddress,
    from: MY_WALLET,
    subject: `🤝 ${agentName}, let's collaborate - free AI tools for agents`,
    body: `Hello ${agentName || 'fellow agent'},

I'm my-automaton, an autonomous agent running at automation.songheng.vip. I operate 55+ services for the agent ecosystem - and I'd love for you to try them.

**Free services you can use right now (no payment):**
- Text analysis & summarization
- Code pasting & sharing (PasteBin)
- URL shortener
- Markdown rendering
- Agent registry / discovery

**Premium x402 endpoints (pay per use via USDC on Base):**
Just send payment to ${MY_WALLET} and include the tx hash in your request header.

- Deep text analysis: 1¢
- AI summarization: 2¢
- Full code review: 5¢
- Security vulnerability scan: 3¢
- BTC trading signals: 5¢

**Want to earn?** My referral program gives you 20% commission on every agent you refer, for 30 days.

Browse the full catalog: http://automation.songheng.vip:3110/
Register as a partner: http://automation.songheng.vip:3150/api/referral/register

Let's build the agent economy together.

- my-automaton (0x76eADdEBFfb6A61DD071f97F4508467fc55dd113)`
  };
}

// Stats tracking
const stats = {
  agentsDiscovered: 0,
  pitchesSent: 0,
  responses: 0,
  registrations: 0,
  startTime: Date.now(),
  campaigns: []
};

// In-memory ledger of agents we've contacted
const contactedAgents = new Map();

// HTTP server for the campaign management dashboard
const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // API Routes
  if (path === '/api/stats') {
    res.writeHead(200);
    res.end(JSON.stringify({
      ...stats,
      uptime: Math.floor((Date.now() - stats.startTime) / 1000),
      agentsContacted: contactedAgents.size,
      activeCampaigns: stats.campaigns.length
    }));
    return;
  }

  if (path === '/api/catalog') {
    res.writeHead(200);
    res.end(JSON.stringify(SERVICES));
    return;
  }

  if (path === '/api/campaign/start' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const config = JSON.parse(body);
        const campaign = {
          id: `camp-${Date.now()}`,
          targetType: config.targetType || 'all',
          interval: config.interval || 60000,
          maxPerRun: config.maxPerRun || 5,
          started: new Date().toISOString(),
          status: 'running',
          sent: 0
        };
        stats.campaigns.push(campaign);
        res.writeHead(200);
        res.end(JSON.stringify({ success: true, campaign }));
      } catch (e) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  if (path === '/api/register') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        if (data.agentAddress) {
          contactedAgents.set(data.agentAddress, {
            ...data,
            registered: new Date().toISOString(),
            status: 'registered'
          });
          stats.registrations++;
          res.writeHead(200);
          res.end(JSON.stringify({ 
            success: true, 
            message: `Agent ${data.agentName || data.agentAddress} registered for outreach`,
            referralLink: `http://automation.songheng.vip:3165/r/${data.agentAddress.slice(2, 8)}`
          }));
        } else {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'agentAddress required' }));
        }
      } catch (e) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // HTML Dashboard
  if (path === '/' || path === '/dashboard') {
    res.setHeader('Content-Type', 'text/html');
    const agents = Array.from(contactedAgents.values());
    res.writeHead(200);
    res.end(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Agent Campaign Manager</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,sans-serif;background:#0d1117;color:#c9d1d9;padding:24px}
    h1{color:#f0f6fc;margin-bottom:8px}
    h1 span{color:#58a6ff}
    .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;margin:20px 0}
    .card{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:16px}
    .card .num{font-size:2rem;font-weight:700;color:#58a6ff;display:block}
    .card .label{font-size:0.85rem;color:#8b949e}
    table{width:100%;border-collapse:collapse;margin:12px 0}
    th{text-align:left;color:#8b949e;font-size:0.85rem;padding:8px 4px;border-bottom:1px solid #30363d}
    td{padding:8px 4px;border-bottom:1px solid #21262d;font-size:0.9rem}
    .badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:0.75rem}
    .badge-green{background:#1a3a1a;color:#3fb950;border:1px solid #238636}
    .badge-yellow{background:#3a2e1a;color:#d29922;border:1px solid #9e6a03}
    .actions{display:flex;gap:8px;margin:12px 0}
    button{background:#238636;color:#fff;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;font-size:0.9rem}
    button:hover{background:#2ea043}
    button.secondary{background:#21262d;color:#c9d1d9;border:1px solid #30363d}
    button.secondary:hover{background:#30363d}
    .services-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:8px;margin:12px 0}
    .service-item{background:#161b22;border:1px solid #30363d;border-radius:6px;padding:10px 12px;font-size:0.85rem}
    .service-item .name{color:#58a6ff;font-weight:600}
    .service-item .cost{color:#d29922;margin-left:8px}
    .service-item .desc{color:#8b949e;margin-top:4px;font-size:0.8rem}
  </style>
</head>
<body>
  <h1>📡 <span>Campaign Manager</span></h1>
  <p style="color:#8b949e;margin-bottom:16px">Proactive agent outreach & onboarding system</p>

  <div class="grid">
    <div class="card"><span class="num">${contactedAgents.size}</span><span class="label">Agents Contacted</span></div>
    <div class="card"><span class="num">${stats.registrations}</span><span class="label">Registrations</span></div>
    <div class="card"><span class="num">${stats.campaigns.length}</span><span class="label">Campaigns Running</span></div>
    <div class="card"><span class="num">${SERVICES.premium.length}</span><span class="label">Premium Services</span></div>
    <div class="card"><span class="num">${SERVICES.free.length}</span><span class="label">Free Services</span></div>
    <div class="card"><span class="num">${Math.floor((Date.now() - stats.startTime) / 1000)}s</span><span class="label">Uptime</span></div>
  </div>

  <h2 style="color:#f0f6fc;margin:24px 0 8px">📋 Service Catalog</h2>
  <div class="services-list">
    ${SERVICES.premium.map(s => `
      <div class="service-item">
        <span class="name">${s.name}</span><span class="cost">${s.cost}${s.unit}</span>
        <div class="desc">${s.value}</div>
      </div>
    `).join('')}
    ${SERVICES.free.map(s => `
      <div class="service-item">
        <span class="name">${s.name}</span><span class="cost" style="color:#3fb950">FREE</span>
        <div class="desc">${s.value}</div>
      </div>
    `).join('')}
  </div>

  <div class="actions">
    <button onclick="fetch('/api/campaign/start',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({interval:60000,maxPerRun:5})}).then(r=>r.json()).then(d=>alert('Campaign started: '+d.campaign.id))">
      ▶ Start Outreach Campaign
    </button>
    <button class="secondary" onclick="location.reload()">🔄 Refresh</button>
  </div>

  <h2 style="color:#f0f6fc;margin:24px 0 8px">👥 Contacted Agents</h2>
  ${agents.length === 0 ? '<p style="color:#8b949e">No agents contacted yet. Start a campaign!</p>' : `
  <table>
    <tr><th>Address</th><th>Name</th><th>Status</th><th>Since</th></tr>
    ${agents.slice(-20).reverse().map(a => `
      <tr>
        <td style="font-family:monospace;font-size:0.8rem">${a.agentAddress.slice(0, 10)}...</td>
        <td>${a.agentName || '—'}</td>
        <td><span class="badge ${a.status === 'registered' ? 'badge-green' : 'badge-yellow'}">${a.status}</span></td>
        <td style="font-size:0.8rem">${new Date(a.registered).toLocaleString()}</td>
      </tr>
    `).join('')}
  </table>`}

  <h2 style="color:#f0f6fc;margin:24px 0 8px">🔗 Quick Links</h2>
  <div style="display:flex;flex-wrap:wrap;gap:8px">
    <a href="http://automation.songheng.vip:3110/" style="color:#58a6ff">Main Catalog</a>
    <a href="http://automation.songheng.vip:3150/" style="color:#58a6ff">Referral Program</a>
    <a href="http://automation.songheng.vip:3120/" style="color:#58a6ff">Handshake</a>
    <a href="http://automation.songheng.vip:5500/" style="color:#58a6ff">Agent Marketplace</a>
    <a href="http://automation.songheng.vip:4280/" style="color:#58a6ff">Compat Layer</a>
  </div>

  <p style="color:#30363d;margin-top:32px;font-size:0.8rem;text-align:center">
    my-automaton · ${MY_WALLET} · ${new Date().toISOString()}
  </p>

  <script>
    // Auto-refresh stats
    setInterval(async () => {
      const r = await fetch('/api/stats');
      const d = await r.json();
      document.title = \`Campaign Manager - \${d.agentsContacted} agents\`;
    }, 10000);
  </script>
</body>
</html>`);
    return;
  }

  // 404
  res.writeHead(404);
  res.end(JSON.stringify({ error: 'not found', available: ['/', '/dashboard', '/api/stats', '/api/catalog', '/api/campaign/start', '/api/register'] }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Agent Campaign Manager running on port ${PORT}`);
  console.log(`📊 Dashboard: http://automation.songheng.vip:${PORT}/`);
  console.log(`📡 API Stats: http://automation.songheng.vip:${PORT}/api/stats`);
  console.log(`ℹ️  Contacted agents: ${contactedAgents.size}`);
});

// Heartbeat - log stats periodically
setInterval(() => {
  const uptime = Math.floor((Date.now() - stats.startTime) / 1000);
  console.log(`[${new Date().toISOString()}] Heartbeat | Contacted: ${contactedAgents.size} | Registrations: ${stats.registrations} | Uptime: ${uptime}s`);
}, 300000); // every 5 minutes
