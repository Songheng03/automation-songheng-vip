#!/usr/bin/env node
/**
 * Submit my-automaton MCP Server to directories
 * Submits to: Smithery, MCP.so, Glama, PulseMCP
 */
const https = require('https');
const http = require('http');

const BASE = 'https://automation.songheng.vip';
const SERVER_URL = 'https://automation.songheng.vip/mcp/jsonrpc';
const SSE_URL = 'https://automation.songheng.vip/mcp/sse';
const AGENT_NAME = 'my-automaton';
const WALLET = '0x76eADdEBFfb6a61DD071f97F4508467fc55dd113';

const results = [];

async function post(url, data) {
  return new Promise((resolve, reject) => {
    try {
      const u = new URL(url);
      const mod = u.protocol === 'https:' ? https : http;
      const body = JSON.stringify(data);
      const req = mod.request(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body), 'User-Agent': 'my-automaton/1.0' }
      }, (res) => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => resolve({ status: res.statusCode, body: d.slice(0,500) }));
      });
      req.on('error', e => resolve({ status: 0, error: e.message }));
      req.write(body);
      req.end();
    } catch(e) { resolve({ status: 0, error: e.message }); }
  });
}

async function main() {
  console.log('🚀 Submitting MCP Server to directories...\n');

  // 1. Smithery
  console.log('1️⃣  Smithery.ai...');
  const smitheryRes = await post('https://registry.smithery.ai/api/servers/register', {
    name: 'my-automaton-mcp-server',
    displayName: 'AI Code Review & Security Tools',
    description: '7 AI-powered developer tools: code review, security scanning, text analysis, summarization, code explanation, refactoring, and complexity analysis. Works with Claude Desktop, Cursor, and any MCP client.',
    homepage: BASE + '/mcp',
    serverUrl: SERVER_URL,
    sseUrl: SSE_URL,
    transportType: 'streamable-http',
    categories: ['developer-tools', 'code-review', 'security'],
    tags: ['code-review', 'security-scanning', 'mcp', 'claude-desktop'],
    author: AGENT_NAME,
    license: 'MIT',
    pricing: { type: 'freemium', freeTier: '3 requests/day per IP', paidTier: 'from $5' }
  });
  results.push({ directory: 'Smithery.ai', status: smitheryRes.status, response: smitheryRes.body || smitheryRes.error });

  // 2. MCP.so
  console.log('2️⃣  MCP.so...');
  const mcpsoRes = await post('https://mcp.so/api/servers', {
    name: AGENT_NAME,
    displayName: 'AI Code Review & Security MCP Server',
    description: 'Free AI-powered code review, security scanning, and text analysis via MCP. 7 tools. Works with Claude Desktop and Cursor.',
    url: SERVER_URL,
    type: 'url',
    categories: ['code-review', 'security', 'developer-tools'],
    author: AGENT_NAME
  });
  results.push({ directory: 'MCP.so', status: mcpsoRes.status, response: mcpsoRes.body || mcpsoRes.error });

  // 3. Glama
  console.log('3️⃣  Glama.ai...');
  const glamaRes = await post('https://glama.ai/api/mcp/servers', {
    name: 'my-automaton-mcp-server',
    description: '7 AI developer tools: code review, security scanning, text analysis, summarization, code explanation, refactoring, complexity analysis.',
    url: SERVER_URL,
    sse_url: SSE_URL,
    transport: 'streamable-http',
    tags: ['mcp', 'code-review', 'security', 'ai-tools']
  });
  results.push({ directory: 'Glama.ai', status: glamaRes.status, response: glamaRes.body || glamaRes.error });

  // 4. PulseMCP
  console.log('4️⃣  PulseMCP...');
  const pulseRes = await post('https://pulsemcp.com/api/servers', {
    name: 'my-automaton-mcp-server',
    description: 'Free MCP server with 7 AI-powered developer tools for code review, security scanning, and text analysis.',
    url: SERVER_URL,
    type: 'streamable-http'
  });
  results.push({ directory: 'PulseMCP', status: pulseRes.status, response: pulseRes.body || pulseRes.error });

  // Results
  console.log('\n📊 Submission Results:');
  for (const r of results) {
    const icon = r.status >= 200 && r.status < 400 ? '✅' : '❌';
    console.log(`  ${icon} ${r.directory}: HTTP ${r.status} ${r.response ? '('+r.response+')' : ''}`);
  }

  console.log('\n📝 Next steps:');
  console.log('  1. Manual: https://smithery.ai/servers — add logo, description');
  console.log('  2. Manual: https://github.com/marketplace — create listing');
  console.log('  3. Monitor analytics at /api/stats/visitors');
  console.log('  4. Check revenue at /api/stats/overview');
}

main().catch(e => console.error(e));
