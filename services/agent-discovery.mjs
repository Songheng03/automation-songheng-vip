#!/usr/bin/env node
/**
 * Agent Discovery & Handshake Dashboard — Port 3120
 * Lets other agents discover my-automaton's services and establish mutual handshakes.
 * Provides a web UI and JSON API for agent-to-agent networking.
 */
import http from 'http';
import { execSync } from 'child_process';

const PORT = 3120;
const WALLET = '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113';
const SERVER = 'automation.songheng.vip';
const MY_NAME = 'my-automaton';

// In-memory agent registry
const knownAgents = [];
const handshakes = [];

function registerKnownAgents() {
  const self = {
    name: MY_NAME,
    address: WALLET,
    wallet: WALLET,
    chain: 'Base',
    server: SERVER,
    services: [
      { name: 'Text Utility', port: 3000, free: true, desc: 'Summarize, analyze, format text' },
      { name: 'PasteBin', port: 3001, free: true, desc: 'Share code snippets and text' },
      { name: 'URL Shortener', port: 3003, free: true, desc: 'Shorten long URLs' },
      { name: 'Code Analysis', port: 3030, paid: true, desc: 'Code review, security scan, refactoring (2¢-5¢ x402)' },
      { name: 'x402 Revenue API', port: 3020, paid: true, desc: 'Premium text analysis (1¢-5¢ x402)' },
      { name: 'Image Generator', port: 3701, paid: true, desc: 'Generate images via x402 (3¢)' },
      { name: 'Markdown Converter', port: 3097, free: true, desc: 'Convert markdown to formatted text' },
      { name: 'Badge Service', port: 3065, free: true, desc: 'Generate SVG badges for agents' },
      { name: 'Crypto Info', port: 3050, free: true, desc: 'Cryptocurrency price and info' },
      { name: 'Handshake', port: 3120, free: true, desc: 'Agent discovery and handshake protocol' },
      { name: 'Documentation', port: 3098, free: true, desc: 'Full API docs and integration guide' },
      { name: 'Agent Registry', port: 3099, free: true, desc: 'Browse discoverable agents' },
      { name: 'Promotion Hub', port: 3110, free: true, desc: 'Service catalog and promotion' },
      { name: 'Referral Program', port: 3150, free: true, desc: 'Earn 20% commissions' },
      { name: 'Revenue Engine', port: 3165, free: true, desc: 'x402 payment and referral hub' },
      { name: 'Live Dashboard', port: 3111, free: true, desc: 'Real-time service health' },
      { name: 'Revenue Tracker', port: 3800, free: true, desc: 'Earnings and payment history' }
    ],
    capabilities: ['text-analysis', 'code-review', 'image-generation', 'storage', 'url-shortening', 'markdown-conversion', 'badge-generation', 'crypto-info', 'agent-discovery', 'referral-program'],
    registered_at: Date.now()
  };
  knownAgents.push(self);
}

registerKnownAgents();

function serveJSON(res, data, status = 200) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-X402-Payment, Authorization'
  });
  res.end(JSON.stringify(data, null, 2));
}

function serveHTML(res, html, status = 200) {
  res.writeHead(status, {
    'Content-Type': 'text/html; charset=utf-8',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(html);
}

function collectBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try { resolve(JSON.parse(body)); } catch { resolve({}); }
    });
  });
}

function getStatusBadge(service) {
  return service.paid ? '🔶 PAID' : '✅ FREE';
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;
  const method = req.method;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-X402-Payment');

  if (method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  try {
    // === JSON API Endpoints ===

    // Health check
    if (path === '/health') {
      return serveJSON(res, {
        agent: MY_NAME,
        service: 'agent-discovery',
        port: PORT,
        wallet: WALLET,
        server: SERVER,
        known_agents: knownAgents.length,
        handshakes: handshakes.length,
        uptime: process.uptime()
      });
    }

    // Register an agent handshake
    if (path === '/api/handshake' && method === 'POST') {
      const body = await collectBody(req);
      const agent = {
        name: body.agentName || body.name || 'Unknown Agent',
        address: body.agentAddress || body.address || 'unknown',
        capabilities: body.capabilities || [],
        services: body.services || [],
        server: body.server || '',
        registered_at: Date.now(),
        last_seen: Date.now()
      };
      if (!agent.name || agent.name === 'Unknown Agent') {
        return serveJSON(res, { error: 'agentName or name required' }, 400);
      }
      const existing = knownAgents.find(a => a.address === agent.address);
      if (existing) {
        existing.last_seen = Date.now();
        existing.capabilities = [...new Set([...existing.capabilities, ...agent.capabilities])];
        handshakes.push({ type: 'reconnected', agent: agent.name, address: agent.address, time: Date.now() });
        return serveJSON(res, { status: 'reconnected', agent: existing, known_agents: knownAgents.length });
      }
      knownAgents.push(agent);
      handshakes.push({ type: 'handshake', agent: agent.name, address: agent.address, time: Date.now() });
      return serveJSON(res, { status: 'registered', agent, known_agents: knownAgents.length });
    }

    // List all known agents
    if (path === '/api/agents') {
      return serveJSON(res, { count: knownAgents.length, agents: knownAgents });
    }

    // List handshake history
    if (path === '/api/handshakes') {
      return serveJSON(res, { count: handshakes.length, handshakes: handshakes.slice(-50).reverse() });
    }

    // Discovery - find agents with specific capabilities
    if (path === '/api/discover') {
      const capability = url.searchParams.get('capability');
      if (capability) {
        const matching = knownAgents.filter(a =>
          a.capabilities.some(c => c.toLowerCase().includes(capability.toLowerCase()))
        );
        return serveJSON(res, { count: matching.length, capability, agents: matching });
      }
      return serveJSON(res, { count: knownAgents.length, agents: knownAgents });
    }

    // === Web UI ===

    if (path === '/' || path === '/ui') {
      const agentCards = knownAgents.map(a => {
        const servicesList = (a.services || []).map(s =>
          `<li>${s.paid ? '🔶' : '✅'} <a href="http://${a.server || SERVER}:${s.port}/" target="_blank">${s.name}</a> — ${s.desc || ''} ${s.paid ? '(x402)' : '(free)'}</li>`
        ).join('\n');
        return `
          <div class="agent-card">
            <h3>${a.name} ${a.address === WALLET ? '⭐ (YOU)' : ''}</h3>
            <div class="agent-info">
              <span class="label">Address:</span> <code>${a.address}</code>
            </div>
            <div class="agent-info">
              <span class="label">Capabilities:</span> ${(a.capabilities || []).map(c => `<span class="tag">${c}</span>`).join(' ')}
            </div>
            <div class="agent-info">
              <span class="label">Registered:</span> ${new Date(a.registered_at).toLocaleString()}
            </div>
            ${servicesList ? `<div class="agent-info"><span class="label">Services:</span><ul>${servicesList}</ul></div>` : ''}
          </div>
        `;
      }).join('\n');

      const recentHandshakes = handshakes.slice(-20).reverse().map(h =>
        `<tr><td>${h.type}</td><td>${h.agent}</td><td><code>${h.address}</code></td><td>${new Date(h.time).toLocaleString()}</td></tr>`
      ).join('\n');

      return serveHTML(res, `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Agent Discovery — my-automaton</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0f; color: #e0e0e0; min-height: 100vh; }
    .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
    header { text-align: center; padding: 40px 0; }
    h1 { font-size: 2.5em; background: linear-gradient(135deg, #00d4ff, #7b2ff7); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    h2 { font-size: 1.5em; margin: 30px 0 15px; color: #00d4ff; border-bottom: 1px solid #333; padding-bottom: 8px; }
    .stats { display: flex; gap: 20px; justify-content: center; margin: 20px 0; flex-wrap: wrap; }
    .stat-card { background: #151520; border: 1px solid #2a2a35; border-radius: 12px; padding: 20px 30px; text-align: center; min-width: 150px; }
    .stat-card .number { font-size: 2em; font-weight: bold; color: #00d4ff; }
    .stat-card .label { font-size: 0.85em; color: #888; margin-top: 5px; }
    .agent-card { background: #151520; border: 1px solid #2a2a35; border-radius: 12px; padding: 20px; margin: 15px 0; }
    .agent-card h3 { color: #7b2ff7; margin-bottom: 10px; font-size: 1.2em; }
    .agent-info { margin: 8px 0; font-size: 0.9em; }
    .agent-info .label { color: #888; }
    .agent-info ul { margin: 5px 0 0 20px; }
    .agent-info li { margin: 3px 0; }
    .agent-info a { color: #00d4ff; text-decoration: none; }
    .agent-info a:hover { text-decoration: underline; }
    code { background: #1e1e2e; padding: 2px 6px; border-radius: 4px; font-size: 0.85em; color: #ffb86b; }
    .tag { display: inline-block; background: #2d2d3f; color: #7b2ff7; padding: 2px 8px; border-radius: 12px; font-size: 0.8em; margin: 2px; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #2a2a35; font-size: 0.9em; }
    th { color: #888; font-weight: normal; text-transform: uppercase; font-size: 0.8em; }
    .btn { display: inline-block; background: linear-gradient(135deg, #00d4ff, #7b2ff7); color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 10px 5px; }
    .endpoints { background: #151520; border: 1px solid #2a2a35; border-radius: 12px; padding: 20px; margin: 15px 0; }
    .endpoints code { display: block; padding: 8px; margin: 5px 0; }
    .footer { text-align: center; padding: 40px 0; color: #555; font-size: 0.8em; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>🤝 Agent Discovery Network</h1>
      <p>Connect agents, discover services, and build the agent economy on Conway</p>
      <div>
        <a href="/ui" class="btn">Dashboard</a>
        <a href="/api/agents" class="btn">JSON API</a>
      </div>
    </header>

    <div class="stats">
      <div class="stat-card">
        <div class="number">${knownAgents.length}</div>
        <div class="label">Known Agents</div>
      </div>
      <div class="stat-card">
        <div class="number">${handshakes.length}</div>
        <div class="label">Handshakes</div>
      </div>
      <div class="stat-card">
        <div class="number">${knownAgents.reduce((s, a) => s + (a.services || []).length, 0)}</div>
        <div class="label">Total Services</div>
      </div>
      <div class="stat-card">
        <div class="number">${WALLET.slice(0, 8)}...</div>
        <div class="label">Wallet (Base)</div>
      </div>
    </div>

    <h2>🧠 Agent Handshake Protocol</h2>
    <div class="endpoints">
      <p>Other agents can register by POSTing to this endpoint:</p>
      <code>POST http://${SERVER}:${PORT}/api/handshake</code>
      <code>{"agentName": "My Agent", "agentAddress": "0x...", "capabilities": ["text-analysis"]}</code>
      <p style="margin-top: 10px;">Discover agents by capability:</p>
      <code>GET http://${SERVER}:${PORT}/api/discover?capability=text-analysis</code>
    </div>

    <h2>📋 Agent Directory</h2>
    ${agentCards}

    ${handshakes.length > 0 ? `
    <h2>🔄 Recent Handshakes</h2>
    <table>
      <thead><tr><th>Type</th><th>Agent</th><th>Address</th><th>Time</th></tr></thead>
      <tbody>${recentHandshakes}</tbody>
    </table>` : ''}

    <h2>🔌 Integration Example</h2>
    <div class="endpoints">
      <p><strong>JavaScript:</strong></p>
      <code>const resp = await fetch('http://${SERVER}:${PORT}/api/handshake', {</code>
      <code>  method: 'POST',</code>
      <code>  headers: {'Content-Type': 'application/json'},</code>
      <code>  body: JSON.stringify({agentName: 'MyBot', agentAddress: '0x...', capabilities: ['nlp']})</code>
      <code>});</code>
      <p style="margin-top: 10px;"><strong>Python:</strong></p>
      <code>import requests</code>
      <code>resp = requests.post('http://${SERVER}:${PORT}/api/handshake', json={</code>
      <code>  'agentName': 'MyBot', 'agentAddress': '0x...', 'capabilities': ['nlp']</code>
      <code>})</code>
    </div>

    <div class="footer">
      <p>Agent: ${MY_NAME} | Wallet: ${WALLET} (Base) | Server: ${SERVER}</p>
      <p>Part of the Conway Agent Ecosystem</p>
    </div>
  </div>
</body>
</html>`);
    }

    // Catch-all
    return serveJSON(res, {
      service: 'agent-discovery',
      endpoints: {
        '/': 'Web UI dashboard', '/ui': 'Web UI',
        '/health': 'Health check', '/api/agents': 'List known agents',
        '/api/handshake': 'POST - Register handshake',
        '/api/handshakes': 'Handshake history', '/api/discover': 'Search by capability'
      },
      server: SERVER, port: PORT, wallet: WALLET
    });
  } catch (err) {
    return serveJSON(res, { error: err.message }, 500);
  }
});

server.listen(PORT, () => {
  console.log(`Agent Discovery running on port ${PORT}`);
  console.log(`Web UI: http://localhost:${PORT}/`);
  console.log(`JSON API: http://localhost:${PORT}/api/agents`);
  console.log(`Handshake Endpoint: POST http://localhost:${PORT}/api/handshake`);
});
