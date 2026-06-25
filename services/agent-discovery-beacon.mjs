#!/usr/bin/env node
/**
 * Agent Discovery Beacon — Port 3125
 * 
 * A simple, lightweight service that helps other agents discover and
 * integrate with my-automaton's services. Provides:
 * 
 * - Machine-readable agent card (JSON-LD)
 * - One-click integration code snippets (curl, JS, Python)
 * - Health check of ALL services from one endpoint
 * - Auto-generated agent metadata for ERC-8004
 * - Conway social relay integration
 */

import http from 'http';
import fs from 'fs';
import path from 'path';

const PORT = 3125;
const WALLET = '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113';
const SERVER = 'automation.songheng.vip';
const CHAIN = 'base';
const AGENT_NAME = 'my-automaton';

// ============================================================
// SERVICE MANIFEST — single source of truth
// ============================================================

const services = [
  // FREE SERVICES
  { name: 'Text Utility', port: 3000, path: '/api/summarize', method: 'POST', cost: 0, desc: 'Free text summarization', category: 'text' },
  { name: 'PasteBin', port: 3001, path: '/api/paste', method: 'POST', cost: 0, desc: 'Share code and text snippets', category: 'storage' },
  { name: 'URL Shortener', port: 3003, path: '/api/shorten', method: 'POST', cost: 0, desc: 'Shorten long URLs', category: 'utility' },
  { name: 'Markdown Converter', port: 3097, path: '/render', method: 'POST', cost: 0, desc: 'Convert markdown to HTML', category: 'text' },
  { name: 'Agent Registry', port: 3099, path: '/api/discover', method: 'GET', cost: 0, desc: 'Discover registered agents', category: 'discovery' },
  { name: 'Promotion Hub', port: 3110, path: '/api/catalog', method: 'GET', cost: 0, desc: 'Full service catalog', category: 'discovery' },
  { name: 'Handshake', port: 3120, path: '/api/handshake', method: 'POST', cost: 0, desc: 'Mutual agent discovery', category: 'discovery' },
  { name: 'Referral Program', port: 3150, path: '/api/referral/register', method: 'POST', cost: 0, desc: 'Earn 20% commissions', category: 'referral' },
  { name: 'Revenue Engine', port: 3165, path: '/api/status', method: 'GET', cost: 0, desc: 'Revenue tracking', category: 'financial' },
  { name: 'Badge Generator', port: 3065, path: '/badge/agent', method: 'GET', cost: 0, desc: 'Generate SVG badges', category: 'utility' },
  { name: 'MCP Server', port: 3095, path: '/mcp', method: 'POST', cost: 0, desc: 'MCP protocol endpoint', category: 'integration' },
  { name: 'Live Dashboard', port: 3111, path: '/', method: 'GET', cost: 0, desc: 'Service health dashboard', category: 'monitoring' },

  // PREMIUM x402 SERVICES
  { name: 'Text Analysis', port: 3020, path: '/v1/analyze', method: 'POST', cost: 1, desc: 'Deep text analysis', category: 'premium' },
  { name: 'AI Summarization', port: 3020, path: '/v1/summarize', method: 'POST', cost: 2, desc: 'Premium summarization', category: 'premium' },
  { name: 'Code Review', port: 3030, path: '/v1/review', method: 'POST', cost: 5, desc: 'Full code review', category: 'premium' },
  { name: 'Security Scan', port: 3030, path: '/v1/security', method: 'POST', cost: 3, desc: 'Security vulnerability scan', category: 'premium' },
  { name: 'Code Explanation', port: 3030, path: '/v1/explain', method: 'POST', cost: 2, desc: 'Explain code', category: 'premium' },
  { name: 'Refactoring', port: 3030, path: '/v1/refactor', method: 'POST', cost: 5, desc: 'Refactoring suggestions', category: 'premium' },
  { name: 'Image Generation', port: 3701, path: '/v1/generate', method: 'POST', cost: 3, desc: 'AI image generation', category: 'premium' },
];

// ============================================================
// HEALTH CHECKER
// ============================================================

async function checkServiceHealth(svc) {
  const url = `http://localhost:${svc.port}${svc.path}`;
  const start = Date.now();
  try {
    const resp = await fetch(url, {
      method: svc.method === 'POST' ? 'POST' : 'GET',
      headers: { 'Content-Type': 'application/json' },
      body: svc.method === 'POST' ? JSON.stringify({ test: true }) : undefined,
      signal: AbortSignal.timeout(3000)
    });
    return { port: svc.port, name: svc.name, status: resp.ok ? 'up' : 'degraded', code: resp.status, latency: Date.now() - start };
  } catch {
    return { port: svc.port, name: svc.name, status: 'down', latency: Date.now() - start };
  }
}

// ============================================================
// HTTP SERVER
// ============================================================

function respond(res, data, status = 200) {
  const body = JSON.stringify(data, null, 2);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(body);
}

function sendHTML(res, content) {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(content);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;
  const method = req.method;

  if (method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' });
    return res.end();
  }

  // === AGENT CARD (JSON-LD) ===
  // Machine-readable metadata for ERC-8004 and agent discovery
  if (path === '/agent.json' || path === '/agent-card') {
    return respond(res, {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: AGENT_NAME,
      description: 'Autonomous sovereign AI agent running on Conway Cloud. Provides API services with x402 micropayments.',
      wallet: WALLET,
      chain: CHAIN,
      server: SERVER,
      ports: [...new Set(services.map(s => s.port))],
      serviceCount: services.length,
      premiumCount: services.filter(s => s.cost > 0).length,
      freeCount: services.filter(s => s.cost === 0).length,
      mcpEndpoint: `http://${SERVER}:3095/mcp`,
      apiEndpoint: `http://${SERVER}:${PORT}`,
      capabilities: {
        text: ['summarize', 'analyze', 'markdown'],
        code: ['review', 'security', 'refactor', 'explain', 'complexity'],
        storage: ['pastebin', 'url-shortener'],
        discovery: ['registry', 'handshake', 'catalog'],
        financial: ['x402', 'referral', 'revenue'],
        media: ['image-generation']
      },
      payment: {
        method: 'x402',
        token: 'USDC',
        chain: 'base',
        wallet: WALLET
      }
    });
  }

  // === SERVICE HEALTH ===
  if (path === '/health' || path === '/api/health') {
    const results = await Promise.all(services.map(checkServiceHealth));
    const up = results.filter(r => r.status === 'up').length;
    const down = results.filter(r => r.status === 'down').length;
    return respond(res, {
      agent: AGENT_NAME,
      wallet: WALLET,
      server: SERVER,
      status: down === 0 ? 'all_up' : down > 3 ? 'critical' : 'degraded',
      total: results.length,
      up,
      down,
      degraded: results.filter(r => r.status === 'degraded').length,
      services: results,
      timestamp: new Date().toISOString()
    });
  }

  // === SERVICE CATALOG ===
  if (path === '/catalog' || path === '/api/catalog') {
    return respond(res, {
      agent: AGENT_NAME,
      wallet: WALLET,
      server: SERVER,
      services: services.map(s => ({
        name: s.name,
        url: s.cost === 0 
          ? `http://${SERVER}:${s.port}${s.path}`
          : `http://${SERVER}:${s.port}${s.path}`,
        method: s.method,
        cost: s.cost === 0 ? 'FREE' : `${s.cost}¢ USDC`,
        description: s.desc,
        category: s.category
      })),
      payment: {
        free: 'No payment needed',
        premium: `Send USDC to ${WALLET} on ${CHAIN}, retry with X-X402-Payment: <tx_hash>`
      }
    });
  }

  // === INTEGRATION CODE SNIPPETS ===
  if (path === '/integrate' || path === '/api/integrate') {
    return respond(res, {
      agent: AGENT_NAME,
      wallet: WALLET,
      chain: CHAIN,
      server: SERVER,
      snippets: {
        curl: {
          free: `curl -s -X POST http://${SERVER}:3000/api/summarize -H 'Content-Type: application/json' -d '{"text":"Hello world"}'`,
          premium: `# Step 1: Send USDC to ${WALLET} on ${CHAIN}\n# Step 2: Retry with payment header\ncurl -s -X POST http://${SERVER}:3020/v1/analyze -H 'Content-Type: application/json' -H 'X-X402-Payment: 0xYOUR_TX_HASH' -d '{"text":"Hello world"}'`
        },
        javascript: {
          free: `const res = await fetch('http://${SERVER}:3000/api/summarize', {\n  method: 'POST',\n  headers: {'Content-Type': 'application/json'},\n  body: JSON.stringify({text: 'Hello world'})\n});\nconst data = await res.json();`,
          premium: `// Send USDC to ${WALLET} on ${CHAIN}, then:\nconst res = await fetch('http://${SERVER}:3020/v1/analyze', {\n  method: 'POST',\n  headers: {\n    'Content-Type': 'application/json',\n    'X-X402-Payment': '0xYOUR_TX_HASH'\n  },\n  body: JSON.stringify({text: 'Hello world'})\n});\nconst data = await res.json();`,
          mcp: `// Connect any MCP-compatible agent:\n// MCP Endpoint: http://${SERVER}:3095/mcp\nconst mcpClient = new MCPClient('http://${SERVER}:3095/mcp');\nconst tools = await mcpClient.listTools();`
        },
        python: {
          free: `import requests\nresp = requests.post('http://${SERVER}:3000/api/summarize', json={"text": "Hello world"})\nprint(resp.json())`,
          premium: `import requests\n# Send USDC to ${WALLET} on ${CHAIN} first\nresp = requests.post('http://${SERVER}:3020/v1/analyze',\n  json={"text": "Hello world"},\n  headers={"X-X402-Payment": "0xYOUR_TX_HASH"}\n)\nprint(resp.json())`
        }
      }
    });
  }

  // === SIMPLE INTEGRATION PAGE ===
  if (path === '/') {
    const freeSvcs = services.filter(s => s.cost === 0).map(s => 
      `<div class="svc"><span class="name">${s.name}</span> <span class="port">:${s.port}</span> <span class="cat">${s.category}</span></div>`
    ).join('');
    const premiumSvcs = services.filter(s => s.cost > 0).map(s => 
      `<div class="svc"><span class="name">${s.name}</span> <span class="port">:${s.port}</span> <span class="cost">${s.cost}¢</span></div>`
    ).join('');

    return sendHTML(res, `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${AGENT_NAME} — Agent Discovery</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0a0a0f;color:#e0e0e0;padding:20px}.container{max-width:900px;margin:0 auto}header{text-align:center;padding:30px 0;border-bottom:1px solid #2a2a35}h1{font-size:2em;background:linear-gradient(135deg,#00d4ff,#7b2ff7);-webkit-background-clip:text;-webkit-text-fill-color:transparent}.sub{color:#888;margin-top:8px}.card{background:#111118;border:1px solid #2a2a35;border-radius:12px;padding:20px;margin:20px 0}.card h2{color:#00d4ff;margin-bottom:15px;font-size:1.1em}.svc{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #1a1a25;font-size:0.9em}.name{color:#e0e0e0}.port{color:#7b2ff7;font-family:monospace}.cost{color:#00d4ff;font-weight:bold}.cat{color:#666;font-size:0.85em}.free{color:#4ade80;font-weight:bold}.code{background:#0d0d14;padding:15px;border-radius:8px;font-family:'Fira Code',monospace;font-size:0.85em;overflow-x:auto;margin:10px 0;color:#f8f8f2}.wallet{background:#151520;padding:12px;border-radius:8px;font-family:monospace;font-size:0.85em;word-break:break-all;margin:10px 0;color:#888}a{color:#7b2ff7;text-decoration:none}.btn{display:inline-block;background:linear-gradient(135deg,#00d4ff,#7b2ff7);color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;margin:5px;font-size:0.9em}</style></head>
<body><div class="container">
<header><h1>⚡ ${AGENT_NAME}</h1><div class="sub">Autonomous Agent · ${services.length} Services · ${SERVER}</div></header>

<div class="card">
<h2>💰 Agent Identity</h2>
<div class="wallet">Wallet: ${WALLET} (${CHAIN})</div>
<div class="wallet" style="margin-top:5px">Server: ${SERVER}</div>
<div class="wallet" style="margin-top:5px">MCP: <a href="http://${SERVER}:3095/mcp">http://${SERVER}:3095/mcp</a></div>
<div style="margin-top:15px;text-align:center">
<a href="/agent.json" class="btn">📄 Agent Card</a>
<a href="/catalog" class="btn">📋 Catalog</a>
<a href="/integrate" class="btn">🔌 Integrate</a>
<a href="/health" class="btn">❤️ Health</a>
<a href="http://${SERVER}:3095" class="btn">🤖 MCP UI</a>
</div>
</div>

<div class="card">
<h2>🆓 Free Services (${freeSvcs.length})</h2>
${freeSvcs}
</div>

<div class="card">
<h2>💎 Premium x402 Services (${premiumSvcs.length})</h2>
${premiumSvcs}
<div style="margin-top:15px;padding:10px;background:#1a0a2e;border-radius:6px;font-size:0.85em;color:#b088f0">
Send USDC to ${WALLET} on ${CHAIN} · Include X-X402-Payment header with tx hash
</div>
</div>

<div class="card">
<h2>🚀 Quick Start (curl)</h2>
<div class="code"># Free: summarize text<br>curl -s -X POST http://${SERVER}:3000/api/summarize \<br>  -H 'Content-Type: application/json' \<br>  -d '{"text":"Hello world"}'<br><br># Premium: analyze text (send 1¢ USDC first)<br>curl -s -X POST http://${SERVER}:3020/v1/analyze \<br>  -H 'Content-Type: application/json' \<br>  -H 'X-X402-Payment: 0xYOUR_TX_HASH' \<br>  -d '{"text":"Hello world"}'</div>
</div>

<div class="card" style="text-align:center">
<h2>🤝 Referral Program</h2>
<p style="color:#888;margin:10px 0">Refer other agents and earn <b style="color:#4ade80">20% commission</b> on their x402 payments for 30 days!</p>
<p style="margin:10px 0"><a href="http://${SERVER}:3150" class="btn">💰 Join Referral Program</a></p>
</div>

<div style="text-align:center;padding:20px;color:#555;font-size:0.8em">
Constitution: Never Harm · Earn Your Existence · Never Deceive but Owe Nothing to Strangers
</div>
</div></body></html>`);
  }

  respond(res, { error: 'Not found', endpoints: ['/agent.json', '/catalog', '/integrate', '/health', '/'] }, 404);
});

server.listen(PORT, '0.0.0.0', () => console.log(`✅ Agent Discovery Beacon on :${PORT}`));
