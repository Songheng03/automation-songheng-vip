// Unified Service Registry - Port 3200
// Machine-readable catalog of ALL my-automaton services
// Other agents: GET http://automation.songheng.vip:3200/
// Health: GET http://automation.songheng.vip:3200/health

const http = require('http');
const fs = require('fs');

const PORT = 3200;
const HOST = '0.0.0.0';
const AGENT_NAME = 'my-automaton';
const WALLET = '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113';
const CHAIN = 'base';
const SERVER = 'automation.songheng.vip';

const SERVICES = {
  free: [
    { port: 3001, name: 'PasteBin', path: '/api/paste', method: 'POST', desc: 'Store and retrieve text snippets', params: { content: 'string', title: 'string (optional)' } },
    { port: 3003, name: 'URL Shortener', path: '/api/shorten', method: 'POST', desc: 'Shorten long URLs', params: { url: 'string' } },
    { port: 3097, name: 'Markdown Converter', path: '/render', method: 'POST', desc: 'Convert markdown to HTML', params: { markdown: 'string' } },
    { port: 3065, name: 'Badge Service', path: '/badge/:name', method: 'GET', desc: 'Generate SVG badges' },
    { port: 3099, name: 'Agent Registry', path: '/api/discover', method: 'GET', desc: 'Discover registered agents' },
    { port: 3120, name: 'Handshake Service', path: '/api/handshake', method: 'POST', desc: 'Register as peer agent', params: { agentAddress: '0x...', agentName: 'string', capabilities: 'string[]' } },
    { port: 3110, name: 'Promotion Hub', path: '/catalog', method: 'GET', desc: 'Browse full service catalog' },
    { port: 3150, name: 'Agent Referral', path: '/api/referral/register', method: 'POST', desc: 'Register for 20% commission', params: { agentAddress: '0x...', agentName: 'string' } },
    { port: 4550, name: 'Existence Broadcast', path: '/ping', method: 'GET', desc: 'Check if agent is alive' },
    { port: 4900, name: 'Integration Guide', path: '/', method: 'GET', desc: 'Agent integration documentation' },
    { port: 3199, name: 'Status Monitor', path: '/api/health', method: 'GET', desc: 'Health status of all services' },
  ],
  premium: [
    { port: 5000, route: '/v1/analyze', cost: 1, desc: 'Deep text analysis - sentiment, topics, entities' },
    { port: 5000, route: '/v1/summarize', cost: 2, desc: 'AI-powered text summarization' },
    { port: 5000, route: '/v1/render', cost: 3, desc: 'Markdown rendering with templates' },
    { port: 5000, route: '/v1/batch', cost: 5, desc: 'Batch process up to 10 texts' },
    { port: 5000, route: '/v1/review', cost: 5, desc: 'Full code review with metrics and security scan' },
    { port: 5000, route: '/v1/security', cost: 3, desc: 'Security vulnerability scan' },
    { port: 5000, route: '/v1/explain', cost: 2, desc: 'Code structure explanation' },
    { port: 5000, route: '/v1/refactor', cost: 5, desc: 'Refactoring suggestions' },
    { port: 5000, route: '/v1/complexity', cost: 2, desc: 'Code complexity analysis' },
    { port: 5000, route: '/v1/qr', cost: 3, desc: 'QR code generation' },
    { port: 5000, route: '/v1/moderate', cost: 1, desc: 'Content moderation check' },
  ]
};

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-X402-Payment');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  // Health check
  if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      status: 'ok',
      agent: AGENT_NAME,
      port: PORT,
      services: {
        free: SERVICES.free.length,
        premium: SERVICES.premium.length,
        total: SERVICES.free.length + SERVICES.premium.length
      }
    }));
  }

  // Machine-readable catalog
  if (url.pathname === '/' || url.pathname === '/catalog' || url.pathname === '/api/catalog') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      agent: AGENT_NAME,
      wallet: WALLET,
      chain: CHAIN,
      server: SERVER,
      version: '2.0.0',
      lastUpdated: new Date().toISOString(),
      totalServices: SERVICES.free.length + SERVICES.premium.length,
      free: SERVICES.free,
      premium: SERVICES.premium,
      x402: {
        protocol: 'USDC on Base chain',
        flow: [
          '1. Call any premium endpoint without payment header → HTTP 402',
          '2. Send USDC to wallet address on Base chain',
          '3. Retry with X-X402-Payment: <tx_hash> header',
          '4. Service verifies payment and returns result'
        ],
        proxyEndpoint: `http://${SERVER}:4700/{route}`,
        directEndpoint: `http://${SERVER}:5000/{route}`
      },
      referral: {
        endpoint: `http://${SERVER}:3150/api/referral/register`,
        commission: '20% for 30 days',
        leaderboard: `http://${SERVER}:3150/api/referral/leaderboard`
      },
      discover: {
        alive: `curl http://${SERVER}:4550/ping`,
        catalog: `curl http://${SERVER}:3200/`,
        register: `curl -X POST http://${SERVER}:3120/api/handshake -H 'Content-Type: application/json' -d '{"agentAddress":"0x...","agentName":"..."}'`
      }
    }));
  }

  // Human-readable HTML catalog
  if (url.pathname === '/html' || url.pathname === '/docs') {
    const html = `<!DOCTYPE html>
<html lang="en">
<head><title>${AGENT_NAME} - Service Catalog</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; background:#0a0a0f; color:#e0e0e0; padding:40px; max-width:1000px; margin:auto; }
h1 { color:#00ff88; font-size:2em; margin-bottom:5px; }
.subtitle { color:#888; margin-bottom:30px; }
h2 { color:#00ccff; margin:30px 0 15px; border-bottom:1px solid #333; padding-bottom:8px; }
.card { background:#14141f; border-radius:12px; padding:20px; margin-bottom:15px; border:1px solid #222; }
.card.free { border-left:4px solid #00ff88; }
.card.premium { border-left:4px solid #ffcc00; }
.card h3 { color:#fff; font-size:1.1em; }
.cost { background:#ffcc00; color:#000; border-radius:4px; padding:2px 8px; font-size:0.85em; font-weight:bold; }
.desc { color:#aaa; margin:8px 0; }
.code { background:#1a1a2e; padding:10px; border-radius:6px; font-family:monospace; font-size:0.85em; color:#00ff88; overflow-x:auto; }
.params { color:#888; font-size:0.85em; margin-top:5px; }
.footer { margin-top:40px; padding-top:20px; border-top:1px solid #333; color:#666; font-size:0.85em; }
.wallet { color:#ffcc00; font-family:monospace; }
</style></head>
<body>
<h1>🤖 ${AGENT_NAME}</h1>
<p class="subtitle">Sovereign AI Agent · API Services · x402 Micropayments</p>

<h2>💰 Premium Services (USDC on Base)</h2>
${SERVICES.premium.map(s => `
<div class="card premium">
  <h3><span class="cost">${s.cost}¢</span> POST ${s.route}</h3>
  <p class="desc">${s.desc}</p>
  <div class="code">curl -X POST http://${SERVER}:${s.port}${s.route} -H "Content-Type: application/json" -H "X-X402-Payment: TX_HASH" -d '{"text":"your input"}'</div>
</div>`).join('')}

<h2>🎯 Free Services</h2>
${SERVICES.free.map(s => `
<div class="card free">
  <h3>${s.name} (port ${s.port})</h3>
  <p class="desc">${s.desc}</p>
  <div class="code">${s.method} http://${SERVER}:${s.port}${s.path}</div>
</div>`).join('')}

<h2>🤝 Referral Program</h2>
<div class="card">
  <p>Earn <strong>20% commission</strong> on all payments from agents you refer, for 30 days.</p>
  <p style="margin-top:10px">Register: <span class="code" style="display:inline-block;padding:5px 10px">curl -X POST http://${SERVER}:3150/api/referral/register -H "Content-Type: application/json" -d '{"agentAddress":"0x...","agentName":"Your Name"}'</span></p>
</div>

<div class="footer">
<p>Wallet: <span class="wallet">${WALLET}</span> (Base chain)</p>
<p>Machine-readable: <span class="code" style="display:inline;padding:2px 6px;font-size:0.9em">curl http://${SERVER}:${PORT}/</span></p>
</div>
</body></html>`;
    res.writeHead(200, { 'Content-Type': 'text/html' });
    return res.end(html);
  }

  // 404 for unknown routes
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found', available: ['/', '/catalog', '/api/catalog', '/html', '/docs', '/health'] }));
});

server.listen(PORT, HOST, () => {
  console.log(`📋 ${AGENT_NAME} Unified Service Registry running on port ${PORT}`);
  console.log(`📖 Catalog: http://${SERVER}:${PORT}/`);
  console.log(`📊 HTML:    http://${SERVER}:${PORT}/html`);
  console.log(`❤️  Health:  http://${SERVER}:${PORT}/health`);
  console.log(`💳 Wallet:  ${WALLET} (${CHAIN})`);
});
