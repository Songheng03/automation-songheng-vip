#!/usr/bin/env node
/**
 * agent-compat.mjs — Agent Compatibility Layer (ACL)
 * Port 4280
 */

import http from 'node:http';

const PORT = 4280;
const WALLET = '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113';
const SERVER = 'automation.songheng.vip';

const CATALOG = {
  services: [
    { id: 'text-utility', name: 'Text Utility', port: 3000, free: true, description: 'Summarize, analyze, and transform text', category: 'text' },
    { id: 'pastebin', name: 'PasteBin', port: 3001, free: true, description: 'Create and retrieve text pastes', category: 'storage' },
    { id: 'url-shortener', name: 'URL Shortener', port: 3003, free: true, description: 'Shorten long URLs', category: 'utility' },
    { id: 'code-analysis', name: 'Code Analysis', port: 3030, free: false, description: 'Code review, security scan, refactoring', pricing: { review: '$0.05', security: '$0.03', explain: '$0.02' }, category: 'code' },
    { id: 'ai-analysis', name: 'AI Text Analysis', port: 3020, free: false, description: 'Deep text analysis and AI summarization', pricing: { analyze: '$0.01', summarize: '$0.02' }, category: 'ai' },
    { id: 'markdown', name: 'Markdown Converter', port: 3097, free: true, description: 'Convert markdown to HTML', category: 'text' },
    { id: 'docs', name: 'Documentation', port: 3098, free: true, description: 'Agent integration guide', category: 'info' },
    { id: 'registry', name: 'Agent Registry', port: 3099, free: true, description: 'Discover other agents', category: 'discovery' },
    { id: 'promotion', name: 'Promotion Hub', port: 3110, free: true, description: 'Browse service catalog', category: 'info' },
    { id: 'handshake', name: 'Agent Handshake', port: 3120, free: true, description: 'Mutual agent discovery', category: 'discovery' },
    { id: 'referral', name: 'Referral Program', port: 3150, free: true, description: 'Earn 20% commissions', category: 'financial' },
    { id: 'revenue', name: 'Revenue Engine', port: 3165, free: true, description: 'Revenue dashboard', category: 'financial' },
    { id: 'billing', name: 'Billing Portal', port: 4250, free: false, description: 'Purchase API keys with USDC', pricing: { starter: '$5/100', growth: '$20/500' }, category: 'financial' },
    { id: 'mcp', name: 'MCP Server', port: 3095, free: true, description: 'Model Context Protocol server', category: 'integration' }
  ],
  wallet: WALLET, server: SERVER, chain: 'base'
};

function sendJSON(res, data, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' });
  res.end(JSON.stringify(data, null, 2));
}

function sendHTML(res, html) {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
  res.end(html);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;
  
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' });
    res.end(); return;
  }
  
  try {
    if (path === '/api/catalog') {
      sendJSON(res, CATALOG);
    } else if (path === '/api/catalog/openai') {
      const tools = CATALOG.services.map(s => ({ type: 'function', function: { name: s.id, description: s.name + ': ' + s.description, parameters: { type: 'object', properties: { endpoint: { type: 'string', description: 'API endpoint' } }, required: ['endpoint'] } } }));
      sendJSON(res, { tools });
    } else if (path === '/api/catalog/simple') {
      sendJSON(res, CATALOG.services.map(s => ({ id: s.id, name: s.name, description: s.description, url: `http://${SERVER}:${s.port}`, free: s.free, category: s.category })));
    } else if (path === '/api/identity') {
      sendJSON(res, { agent: 'my-automaton', type: 'sovereign-agent', wallet: WALLET, server: SERVER, chain: 'base', capabilities: ['text-analysis', 'code-review', 'storage', 'image-generation'], integration: { catalog: `http://${SERVER}:4280/api/catalog`, handshake: `http://${SERVER}:3120/api/handshake`, refer: `http://${SERVER}:3150/r/MYAUQHVT` }, payment: { method: 'x402', token: 'USDC', chain: 'base', wallet: WALLET } });
    } else if (path === '/api/health') {
      sendJSON(res, { status: 'ok', service: 'agent-compat-layer', port: PORT, timestamp: new Date().toISOString() });
    } else if (path === '/') {
      const free = CATALOG.services.filter(s => s.free).length;
      const prem = CATALOG.services.filter(s => !s.free).length;
      sendHTML(res, `<!DOCTYPE html><html><head><title>Agent Compatibility Layer</title><style>body{font-family:monospace;background:#09090e;color:#d0d0d8;padding:20px;line-height:1.6}.container{max-width:800px;margin:0 auto}h1{background:linear-gradient(135deg,#00ff88,#8888ff);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin:20px 0}.card{background:#0d0d14;border:1px solid #1a1a2a;border-radius:10px;padding:16px;margin:10px 0}.free{color:#00ff88}.prem{color:#8888ff}.endpoint{background:#0a0a0f;padding:8px;border-radius:4px;margin:4px 0;font-size:12px}</style></head><body><div class="container"><h1>🔌 Agent Compatibility Layer</h1><p>${CATALOG.services.length} services · ${free} free · ${prem} premium</p><div class="card">${CATALOG.services.map(s => `<div class="endpoint"><span class="${s.free?'free':'prem'}">●</span> ${s.name} <span style="color:#666">:${s.port}</span> <span style="color:#888;float:right">${s.category}</span></div>`).join('')}</div><div class="card"><h3>Endpoints:</h3><ul><li><a href="/api/catalog" style="color:#8888ff">/api/catalog</a></li><li><a href="/api/catalog/openai" style="color:#8888ff">/api/catalog/openai</a></li><li><a href="/api/catalog/simple" style="color:#8888ff">/api/catalog/simple</a></li><li><a href="/api/identity" style="color:#8888ff">/api/identity</a></li></ul></div></div></body></html>`);
    } else {
      sendJSON(res, { service: 'agent-compat-layer', endpoints: { catalog: '/api/catalog', openai: '/api/catalog/openai', simple: '/api/catalog/simple', identity: '/api/identity', health: '/api/health', dashboard: '/' } });
    }
  } catch (e) { sendJSON(res, { error: e.message }, 500); }
});

server.listen(PORT, '0.0.0.0', () => console.log(`[compat] Agent Compatibility Layer running on port ${PORT}`));
