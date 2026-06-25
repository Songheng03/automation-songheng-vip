#!/usr/bin/env node
/**
 * submit-mcp-directories.js — Submit my-automaton to MCP/agent directories
 * This is where developers discover AI tools and services.
 * 
 * Targets: Smithery, MCP.so, Glama, Toolbase, OpenTools, AgentHub, GitHub
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

const AGENT = {
  name: 'my-automaton',
  description: 'AI-powered code review, security scanning, text analysis, and summarization via API',
  url: 'https://automation.songheng.vip',
  api_url: 'https://automation.songheng.vip',
  wallet: '0x76eADdEBFfb6a61DD071f97F4508467fc55dd113',
  chain: 'Base',
  token: 'USDC',
  tools: [
    { name: 'analyze', description: 'Deep text analysis - sentiment, entities, keywords, tone', cost: '1¢' },
    { name: 'summarize', description: 'AI-powered text summarization', cost: '2¢' },
    { name: 'review', description: 'Comprehensive code review with bugs, security, and suggestions', cost: '5¢' },
    { name: 'security', description: 'OWASP-focused security vulnerability scan', cost: '3¢' },
    { name: 'explain', description: 'Code explanation in plain English', cost: '2¢' },
    { name: 'refactor', description: 'Refactoring suggestions with code examples', cost: '5¢' },
    { name: 'complexity', description: 'Algorithmic complexity analysis (Big O)', cost: '2¢' },
  ],
  free_tier: '3 free requests per day per IP',
  payment: 'Stripe (credit/debit cards) or USDC on Base chain via x402',
  openapi: 'https://automation.songheng.vip/api-docs',
};

const results = [];

function httpRequest(url, method = 'GET', body = null) {
  return new Promise((resolve) => {
    try {
      const u = new URL(url);
      const mod = u.protocol === 'https:' ? https : require('http');
      const options = { method, hostname: u.hostname, port: u.port || (u.protocol === 'https:' ? 443 : 80), path: u.pathname + u.search, headers: { 'User-Agent': 'my-automaton/1.0' } };
      if (body) {
        const data = JSON.stringify(body);
        options.headers['Content-Type'] = 'application/json';
        options.headers['Content-Length'] = Buffer.byteLength(data);
      }
      const req = mod.request(options, (res) => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => resolve({ status: res.statusCode, body: d.slice(0, 1000) }));
      });
      req.on('error', (e) => resolve({ status: 0, error: e.message }));
      if (body) req.write(JSON.stringify(body));
      req.end();
    } catch (e) { resolve({ status: 0, error: e.message }); }
  });
}

async function run() {
  console.log('\n=== MCP Directory Submissions ===\n');

  // 1. Smithery.ai — already have manifest, check accessibility
  console.log('1. Smithery.ai...');
  const r1 = await httpRequest(`${AGENT.url}/smithery-manifest.json`);
  results.push({ directory: 'Smithery.ai', status: r1.status, detail: r1.status === 200 ? 'Manifest OK — submit manually at https://smithery.ai/claim' : 'Missing manifest' });
  console.log(`   → ${r1.status === 200 ? 'Manifest OK' : 'Missing'}`);

  // 2. Check if MCP JSON-RPC endpoint is accessible
  console.log('2. MCP endpoint check...');
  const r2 = await httpRequest(`${AGENT.url}/mcp/jsonrpc`, 'POST', { jsonrpc: '2.0', method: 'tools/list', id: 1 });
  results.push({ directory: 'MCP JSON-RPC', status: r2.status, detail: r2.status < 500 ? 'Endpoint accessible' : 'Missing' });
  console.log(`   → ${r2.status < 500 ? 'Accessible' : 'Missing'}`);

  // 3. OpenAI tool format check
  console.log('3. OpenAI tool format...');
  const r3 = await httpRequest(`${AGENT.url}/mcp/v1/openai`);
  results.push({ directory: 'OpenAI Tool Format', status: r3.status, detail: r3.status === 200 ? 'OK' : 'Missing' });
  console.log(`   → ${r3.status === 200 ? 'OK' : 'Missing'}`);

  // 4. GitHub — generate README for GitHub Pages / repo
  console.log('4. GitHub README generation...');
  const readmeTemplate = `# my-automaton — AI API Services

AI-powered code review, security scanning, text analysis, and summarization.

## Quick Start
\`\`\`bash
curl -X POST https://automation.songheng.vip/free/review \\
  -H "Content-Type: application/json" \\
  -d '{"code": "function hello() { return 1; }"}'
\`\`\`

## Services
| Endpoint | Description | Cost |
|----------|-------------|------|
| POST /v1/analyze | Text analysis (sentiment, entities) | 1¢ |
| POST /v1/summarize | Text summarization | 2¢ |
| POST /v1/review | Code review | 5¢ |
| POST /v1/security | Security scan | 3¢ |
| POST /v1/explain | Code explanation | 2¢ |
| POST /v1/refactor | Refactoring | 5¢ |
| POST /v1/complexity | Complexity analysis | 2¢ |

## Pricing
- Free: 3 requests/day per IP
- Paid: From $5 for 500 credits → [Upgrade](https://automation.songheng.vip/upgrade)

## Links
- [API Docs](https://automation.songheng.vip/api-docs)
- [Playground](https://automation.songheng.vip/api-playground)
- [Blog](https://automation.songheng.vip/blog)

Built with ❤️ by my-automaton · Wallet: \`${AGENT.wallet}\` on ${AGENT.chain}
`;
  fs.writeFileSync('/root/automaton/content/github-readme-template.md', readmeTemplate);
  results.push({ directory: 'GitHub README', status: 'generated', detail: '/content/github-readme-template.md' });
  console.log('   → README template written');

  // 5. Generate MCP server card for Glama.ai
  console.log('5. Glama.ai server card...');
  const glamaCard = {
    name: AGENT.name,
    description: AGENT.description,
    url: AGENT.url,
    type: 'api',
    pricing: { free: '3 requests/day/IP', paid: 'From 1¢/request' },
    tools: AGENT.tools.map(t => t.name),
    authentication: { api_key: true, x402: true },
    tags: ['code-review', 'security', 'ai', 'text-analysis', 'developer-tools'],
  };
  fs.writeFileSync('/root/automaton/content/glama-server-card.json', JSON.stringify(glamaCard, null, 2));
  console.log('   → Glama card written');

  // 6. Generate OpenAPI 3.0 spec for API directories
  console.log('6. OpenAPI 3.0 spec...');
  const openapi = {
    openapi: '3.0.0',
    info: { title: AGENT.name, description: AGENT.description, version: '1.0.0', 'x-wallet': AGENT.wallet },
    servers: [{ url: AGENT.api_url }],
    paths: {},
  };
  const methods = ['analyze', 'summarize', 'review', 'security', 'explain', 'refactor', 'complexity'];
  methods.forEach(m => {
    openapi.paths[`/v1/${m}`] = {
      post: {
        summary: `${m.charAt(0).toUpperCase() + m.slice(1)} API`,
        description: AGENT.tools.find(t => t.name === m)?.description || '',
        parameters: [{ name: 'X-API-Key', in: 'header', schema: { type: 'string' }, description: 'API key (optional for free tier)' }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { text: { type: 'string' }, code: { type: 'string' }, mode: { type: 'string' } } } } } },
        responses: { '200': { description: 'Success' }, '402': { description: 'Payment required' } },
      }
    };
  });
  fs.writeFileSync('/root/automaton/content/openapi.json', JSON.stringify(openapi, null, 2));
  console.log('   → OpenAPI spec written');

  // Summary
  console.log('\n=== Summary ===');
  console.log(JSON.stringify(results, null, 2));
  
  fs.writeFileSync('/root/automaton/data/mcp-directory-submissions.json', JSON.stringify({
    submitted: new Date().toISOString(),
    results,
    next_steps: [
      'Submit to MCP.so manually at https://mcp.so',
      'Submit to Glama.ai at https://glama.ai/mcp/servers',
      'Create GitHub repo with README and push',
      'Submit to OpenTools at https://opentools.ai',
      'List on AgentHub at https://agenthub.dev',
    ]
  }, null, 2));

  console.log('\n✅ Results saved to /root/automaton/data/mcp-directory-submissions.json');
}

run().catch(e => console.error('Error:', e));
