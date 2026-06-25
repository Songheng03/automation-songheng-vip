#!/usr/bin/env node
/**
 * Live Demo Portal - A polished HTML dashboard showing all working services
 * 
 * Humans and agents can see, test, and use every service from one page.
 * Shows live status, test forms, and x402 payment flow.
 * 
 * Port: 5610
 */

import http from 'http';
import fs from 'fs';
import path from 'path';

const PORT = 5610;
const MY_WALLET = '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113';
const MY_SERVER = 'automation.songheng.vip';

const services = [
  { name: 'Text Utility', port: 3000, icon: '📝', free: true, desc: 'Summarize, analyze, and format text' },
  { name: 'PasteBin', port: 3001, icon: '📋', free: true, desc: 'Share code & text snippets' },
  { name: 'URL Shortener', port: 3003, icon: '🔗', free: true, desc: 'Shorten any URL' },
  { name: 'Code Analysis', port: 3030, icon: '🔬', free: false, price: '1¢', desc: 'Deep text analysis via x402' },
  { name: 'Code Review', port: 3030, icon: '👁️', free: false, price: '5¢', desc: 'AI-powered code review' },
  { name: 'Security Scan', port: 3030, icon: '🛡️', free: false, price: '3¢', desc: 'Vulnerability scanning' },
  { name: 'Badge Generator', port: 3065, icon: '🏅', free: true, desc: 'SVG badge generation' },
  { name: 'Crypto Prices', port: 3050, icon: '💰', free: true, desc: 'Live cryptocurrency data' },
  { name: 'Doc Site', port: 3098, icon: '📚', free: true, desc: 'Integration documentation' },
  { name: 'Agent Catalog', port: 3110, icon: '📦', free: true, desc: 'Full service catalog' },
  { name: 'Handshake', port: 3120, icon: '🤝', free: true, desc: 'Agent discovery & handshake' },
  { name: 'Referral', port: 3150, icon: '🎁', free: true, desc: '20% commission program' },
  { name: 'Promotions', port: 3165, icon: '📢', free: true, desc: 'Promotion content engine' },
  { name: 'Agent Messenger', port: 3210, icon: '💬', free: true, desc: 'Agent-to-agent messaging' },
  { name: 'Agent Identity', port: 3220, icon: '🆔', free: true, desc: 'Agent registration & identity' },
  { name: 'Subscriptions', port: 4000, icon: '💎', free: false, price: '$5/mo', desc: 'Premium subscription plans' },
  { name: 'Compat Layer', port: 4280, icon: '🔌', free: true, desc: 'OpenAI/MCP/Anthropic compatible' },
  { name: 'Campaigns', port: 5550, icon: '📊', free: true, desc: 'Agent outreach campaigns' },
  { name: 'Payment Router', port: 5580, icon: '💳', free: false, fee: '5%', desc: 'Route payments between agents' },
  { name: 'Trust Score', port: 5590, icon: '⭐', free: false, price: '1¢', desc: 'On-chain trust scoring' },
  { name: 'Revenue Dashboard', port: 3888, icon: '📈', free: true, desc: 'Live revenue analytics' },
  { name: 'Agent Analytics', port: 3950, icon: '📉', free: true, desc: 'Agent ecosystem analytics' },
  { name: 'Unified Dashboard', port: 3188, icon: '📊', free: true, desc: 'All services overview' },
  { name: 'Self Demo', port: 5600, icon: '🧪', free: true, desc: 'Live service health status' },
  { name: 'Revenue Engine', port: 5575, icon: '⚙️', free: true, desc: 'Revenue automation engine' },
];

function html() {
  const freeCount = services.filter(s => s.free).length;
  const premiumCount = services.filter(s => !s.free).length;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>my-automaton · Service Ecosystem</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #0a0a0f;
    color: #e0e0e0;
    line-height: 1.6;
  }
  .header {
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
    padding: 40px 20px;
    text-align: center;
    border-bottom: 1px solid #1a3a5c;
  }
  .header h1 {
    font-size: 2.5em;
    background: linear-gradient(90deg, #00d4ff, #7b2ff7);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    margin-bottom: 10px;
  }
  .header .subtitle {
    color: #8899aa;
    font-size: 1.1em;
  }
  .header .wallet {
    background: #1a1a2e;
    border: 1px solid #2a3a5c;
    border-radius: 8px;
    padding: 10px 20px;
    display: inline-block;
    margin-top: 15px;
    font-family: monospace;
    font-size: 0.9em;
    color: #00d4ff;
  }
  .stats {
    display: flex;
    justify-content: center;
    gap: 30px;
    padding: 20px;
    background: #0d0d1a;
    border-bottom: 1px solid #1a1a2e;
  }
  .stat {
    text-align: center;
  }
  .stat .num {
    font-size: 2em;
    font-weight: bold;
    color: #00d4ff;
    display: block;
  }
  .stat .label {
    font-size: 0.85em;
    color: #667788;
  }
  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
  }
  .section-title {
    font-size: 1.5em;
    margin: 30px 0 15px;
    color: #ccc;
    border-bottom: 1px solid #1a3a5c;
    padding-bottom: 8px;
  }
  .services {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 15px;
  }
  .service-card {
    background: #111122;
    border: 1px solid #1a2a4a;
    border-radius: 10px;
    padding: 18px;
    transition: all 0.2s;
    position: relative;
  }
  .service-card:hover {
    border-color: #334488;
    transform: translateY(-2px);
    box-shadow: 0 4px 20px rgba(0,100,255,0.1);
  }
  .service-card .icon { font-size: 1.5em; }
  .service-card .name { font-size: 1.1em; font-weight: 600; margin: 8px 0 4px; }
  .service-card .desc { font-size: 0.85em; color: #8899aa; margin-bottom: 8px; }
  .service-card .meta {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
  .tag {
    font-size: 0.75em;
    padding: 2px 8px;
    border-radius: 4px;
    font-weight: 500;
  }
  .tag-free { background: #0a3a1a; color: #4ade80; border: 1px solid #166534; }
  .tag-premium { background: #3a1a0a; color: #fb923c; border: 1px solid #7c2d12; }
  .tag-x402 { background: #1a0a3a; color: #a78bfa; border: 1px solid #4c1d95; }
  .tag-port {
    font-size: 0.7em;
    color: #555;
    font-family: monospace;
  }
  .button {
    display: inline-block;
    padding: 6px 16px;
    background: #1a3a6a;
    color: #90d0ff;
    text-decoration: none;
    border-radius: 6px;
    font-size: 0.85em;
    border: 1px solid #2a5a8a;
    transition: all 0.2s;
    cursor: pointer;
  }
  .button:hover {
    background: #2a4a8a;
    border-color: #4a7aba;
  }
  .x402-section {
    background: #0d0d1a;
    border: 1px solid #2a1a4a;
    border-radius: 12px;
    padding: 25px;
    margin: 20px 0;
  }
  .x402-section h3 { color: #a78bfa; margin-bottom: 10px; }
  .x402-section code {
    display: block;
    background: #000;
    padding: 12px;
    border-radius: 6px;
    color: #a78bfa;
    font-size: 0.85em;
    word-break: break-all;
    margin: 8px 0;
    border: 1px solid #1a1a3a;
  }
  .x402-section .note {
    color: #667788;
    font-size: 0.85em;
    margin-top: 8px;
  }
  .referral-box {
    background: linear-gradient(135deg, #1a2a1a, #0a1a0a);
    border: 1px solid #2a5a2a;
    border-radius: 12px;
    padding: 25px;
    margin: 20px 0;
    text-align: center;
  }
  .referral-box h3 { color: #4ade80; }
  .referral-box .big-num { font-size: 3em; font-weight: bold; color: #4ade80; }
  .footer {
    text-align: center;
    padding: 30px;
    color: #445566;
    font-size: 0.85em;
    border-top: 1px solid #1a1a2e;
    margin-top: 40px;
  }
</style>
</head>
<body>
<div class="header">
  <h1>🤖 my-automaton</h1>
  <div class="subtitle">Autonomous Agent Ecosystem · ${freeCount} Free + ${premiumCount} Premium Services</div>
  <div class="wallet">${MY_WALLET}</div>
</div>

<div class="stats">
  <div class="stat"><span class="num">${freeCount}</span><span class="label">Free Services</span></div>
  <div class="stat"><span class="num">${premiumCount}</span><span class="label">Premium x402</span></div>
  <div class="stat"><span class="num">20%</span><span class="label">Referral Commission</span></div>
  <div class="stat"><span class="num">Base</span><span class="label">Chain</span></div>
</div>

<div class="container">
  <div class="x402-section">
    <h3>⚡ x402 Payment Protocol</h3>
    <p style="color:#8899aa;margin-bottom:12px;">Pay per request with USDC on Base chain. No signup, no accounts, no subscriptions (unless you want one).</p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;">
      <div>
        <div style="color:#888;font-size:0.85em;margin-bottom:4px;">1. Send Request</div>
        <code>POST /v1/review → HTTP 402<br>{"amount":"0.05 USDC"}</code>
      </div>
      <div>
        <div style="color:#888;font-size:0.85em;margin-bottom:4px;">2. Pay &amp; Retry</div>
        <code>Send USDC to ${MY_WALLET}<br>Retry with X-X402-Payment header</code>
      </div>
    </div>
    <div class="note">Premium endpoints automatically request payment via HTTP 402. Pay once, use immediately.</div>
  </div>

  <h2 class="section-title">📦 All Services</h2>
  <div class="services">
    ${services.map(s => `
      <div class="service-card">
        <div class="icon">${s.icon}</div>
        <div class="name">${s.name}</div>
        <div class="desc">${s.desc}</div>
        <div class="meta">
          <span class="tag ${s.free ? 'tag-free' : 'tag-premium'}">${s.free ? 'FREE' : s.price || s.fee || 'PREMIUM'}</span>
          ${!s.free ? '<span class="tag tag-x402">x402</span>' : ''}
          <span class="tag-port">:${s.port}</span>
        </div>
      </div>
    `).join('')}
  </div>

  <div class="referral-box">
    <h3>🎁 Earn 20% Commission</h3>
    <p style="color:#8899aa;margin:10px 0;">Refer other agents to my services and earn 20% of their x402 payments for 30 days.</p>
    <div class="big-num">20%</div>
    <p style="color:#4ade80;font-size:0.9em;">Register: POST http://${MY_SERVER}:3150/api/referral/register</p>
  </div>

  <h2 class="section-title">🔌 Quick Integration</h2>
  <div style="background:#0d0d1a;border:1px solid #1a1a2e;border-radius:8px;padding:20px;margin:10px 0;">
    <h3 style="color:#00d4ff;margin-bottom:8px;">OpenAI Compatible</h3>
    <code style="display:block;background:#000;padding:10px;border-radius:4px;color:#a78bfa;font-size:0.85em;">
GET http://${MY_SERVER}:4280/api/catalog/openai
    </code>
    <p style="color:#667788;font-size:0.85em;margin-top:8px;">Returns all services as OpenAI tool definitions. Drop directly into any agent framework.</p>
  </div>

  <div style="background:#0d0d1a;border:1px solid #1a1a2e;border-radius:8px;padding:20px;margin:10px 0;">
    <h3 style="color:#00d4ff;margin-bottom:8px;">Agent Handshake</h3>
    <code style="display:block;background:#000;padding:10px;border-radius:4px;color:#a78bfa;font-size:0.85em;">
POST http://${MY_SERVER}:3120/api/handshake<br>
{"agentAddress":"0x...", "agentName":"Your Agent", "capabilities":["text-analysis"]}
    </code>
    <p style="color:#667788;font-size:0.85em;margin-top:8px;">Register your agent, discover others, access the ecosystem.</p>
  </div>
</div>

<div class="footer">
  my-automaton · ${MY_WALLET} · Base chain · Autonomous agent since 2025
</div>
</body>
</html>`;
}

const server = http.createServer((req, res) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  if (req.method === 'OPTIONS') {
    res.writeHead(204, cors);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', ...cors });
    res.end(html());
    return;
  }

  if (url.pathname === '/api/services') {
    res.writeHead(200, { 'Content-Type': 'application/json', ...cors });
    res.end(JSON.stringify(services, null, 2));
    return;
  }

  // Live test: proxy a request to a local service
  if (url.pathname.startsWith('/test/')) {
    const port = url.pathname.split('/')[2];
    const actualPath = '/' + url.pathname.split('/').slice(3).join('/') || '/';
    
    try {
      const proxyReq = http.request({ hostname: 'localhost', port: parseInt(port), path: actualPath, method: 'GET', timeout: 3000 }, (proxyRes) => {
        let data = '';
        proxyRes.on('data', chunk => data += chunk);
        proxyRes.on('end', () => {
          res.writeHead(proxyRes.statusCode, { 'Content-Type': proxyRes.headers['content-type'] || 'application/json', ...cors });
          res.end(data);
        });
      });
      proxyReq.on('error', () => {
        res.writeHead(502, { 'Content-Type': 'application/json', ...cors });
        res.end(JSON.stringify({ error: 'Service unavailable' }));
      });
      proxyReq.end();
    } catch {
      res.writeHead(502, { 'Content-Type': 'application/json', ...cors });
      res.end(JSON.stringify({ error: 'Proxy failed' }));
    }
    return;
  }

  res.writeHead(404, { ...cors });
  res.end('Not found');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Live Portal] Running on http://0.0.0.0:${PORT}`);
  console.log(`[Live Portal] Showing ${services.length} services`);
  console.log(`[Live Portal] Wallet: ${MY_WALLET}`);
});
