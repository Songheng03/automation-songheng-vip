#!/usr/bin/env node
/**
 * auto-submit.js — Submit my-automaton to AI agent directories
 * Run: node auto-submit.js
 */
const https = require('https');

const BASE = 'https://automation.songheng.vip';
const WALLET = '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113';

const CATALOG = {
  name: 'my-automaton',
  description: 'AI-powered code review, text analysis, security scanning API. Pay-per-request with USDC or free tier (3/day).',
  url: BASE,
  wallet: WALLET,
  mcp: BASE + '/mcp',
  pricing: { model: 'pay-per-request', free: '3 requests/day/IP', currency: 'USDC', network: 'Base' },
  tools: ['analyze', 'summarize', 'review', 'security', 'explain', 'refactor', 'complexity'],
  tags: ['code-review', 'ai-api', 'security', 'text-analysis', 'mcp', 'x402']
};

function fetch(url, data) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const body = data ? JSON.stringify(data) : null;
    const opts = {
      hostname: u.hostname,
      port: u.port || 443,
      path: u.pathname + u.search,
      method: data ? 'POST' : 'GET',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'my-automaton/1.0' },
      timeout: 15000
    };
    if (body) opts.headers['Content-Length'] = Buffer.byteLength(body);
    const req = https.request(opts, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => resolve({ status: res.statusCode, body: b }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    if (body) req.write(body);
    req.end();
  });
}

async function submitToDirectories() {
  const results = [];

  // 1. Smithery MCP registry
  try {
    const r = await fetch('https://registry.smithery.ai/api/v1/mcp', {
      name: CATALOG.name,
      description: CATALOG.description,
      url: CATALOG.mcp,
      categories: ['ai', 'developer-tools'],
      tags: CATALOG.tags
    });
    results.push({ dir: 'Smithery', status: r.status, body: r.body.slice(0, 200) });
  } catch (e) { results.push({ dir: 'Smithery', error: e.message }); }

  // 2. Glama MCP registry
  try {
    const r = await fetch('https://glama.ai/api/mcp/register', {
      name: CATALOG.name,
      description: CATALOG.description,
      endpoint: CATALOG.mcp,
      tools: CATALOG.tools
    });
    results.push({ dir: 'Glama', status: r.status, body: r.body.slice(0, 200) });
  } catch (e) { results.push({ dir: 'Glama', error: e.message }); }

  // 3. MCP.so 
  try {
    const r = await fetch('https://mcp.so/api/register', {
      name: CATALOG.name,
      description: CATALOG.description,
      mcpEndpoint: CATALOG.mcp
    });
    results.push({ dir: 'MCP.so', status: r.status, body: r.body.slice(0, 200) });
  } catch (e) { results.push({ dir: 'MCP.so', error: e.message }); }

  // 4. OpenTools
  try {
    const r = await fetch('https://api.opentools.ai/v1/tools/register', {
      name: CATALOG.name,
      description: CATALOG.description,
      apiEndpoint: BASE,
      pricing: CATALOG.pricing
    });
    results.push({ dir: 'OpenTools', status: r.status, body: r.body.slice(0, 200) });
  } catch (e) { results.push({ dir: 'OpenTools', error: e.message }); }

  // 5. Toolbase
  try {
    const r = await fetch('https://toolbase.ai/api/tools', {
      name: CATALOG.name,
      description: CATALOG.description,
      url: CATALOG.url
    });
    results.push({ dir: 'Toolbase', status: r.status, body: r.body.slice(0, 200) });
  } catch (e) { results.push({ dir: 'Toolbase', error: e.message }); }

  // 6. Ping search engines
  const sitemap = encodeURIComponent(BASE + '/sitemap.xml');
  try {
    await fetch(`https://www.google.com/ping?sitemap=${sitemap}`);
    results.push({ dir: 'Google Ping', status: 'sent' });
  } catch (e) { results.push({ dir: 'Google Ping', error: e.message }); }

  try {
    await fetch(`https://www.bing.com/ping?sitemap=${sitemap}`);
    results.push({ dir: 'Bing Ping', status: 'sent' });
  } catch (e) { results.push({ dir: 'Bing Ping', error: e.message }); }

  // 7. IndexNow
  try {
    const r = await fetch('https://api.indexnow.org/indexnow', {
      host: 'automation.songheng.vip',
      key: 'my-automaton-indexnow',
      keyLocation: BASE + '/indexnow-key.txt',
      urlList: [BASE + '/', BASE + '/api-docs.html', BASE + '/blog.html']
    });
    results.push({ dir: 'IndexNow', status: r.status, body: r.body.slice(0, 200) });
  } catch (e) { results.push({ dir: 'IndexNow', error: e.message }); }

  return results;
}

submitToDirectories().then(results => {
  console.log('=== AUTO SUBMIT RESULTS ===');
  results.forEach(r => {
    const status = r.error ? `❌ ${r.error}` : `${r.status} ${r.body || ''}`;
    console.log(`  ${r.dir}: ${status}`);
  });
  console.log('=== DONE ===');
}).catch(e => console.error('Fatal:', e));
