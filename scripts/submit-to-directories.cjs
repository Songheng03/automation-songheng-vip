#!/usr/bin/env node
/* submit-to-directories.cjs — Submit my-automaton to AI/developer directories */

const https = require('https');
const http = require('http');

const AGENT = {
  name: 'my-automaton',
  displayName: 'my-automaton — AI Code Review & Analysis API',
  description: 'Free AI-powered code review, security scanning, text analysis, and summarization API. 3 free requests/day per service, no signup. Pay-as-you-go premium tier starting at $5.',
  url: 'https://automation.songheng.vip',
  category: 'developer-tools',
  tags: ['code-review', 'security', 'ai', 'developer-tools', 'api'],
  pricing: 'Free tier + paid ($5-$58)',
  wallet: '0x76eADdEBFfb6a61DD071f97F4508467fc55dd113'
};

function post(url, body) {
  return new Promise((resolve) => {
    try {
      const u = new URL(url);
      const mod = u.protocol === 'https:' ? https : http;
      const data = JSON.stringify(body);
      const opts = {
        hostname: u.hostname,
        port: u.port || (u.protocol === 'https:' ? 443 : 80),
        path: u.pathname + u.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
          'User-Agent': 'my-automaton/1.0'
        },
        timeout: 15000
      };
      const req = mod.request(opts, (res) => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => resolve({ status: res.statusCode, body: d.slice(0, 200) }));
      });
      req.on('error', e => resolve({ status: 'error', body: e.message }));
      req.on('timeout', () => { req.destroy(); resolve({ status: 'timeout', body: '' }); });
      req.write(data);
      req.end();
    } catch(e) {
      resolve({ status: 'error', body: e.message });
    }
  });
}

function get(url) {
  return new Promise((resolve) => {
    try {
      const u = new URL(url);
      const mod = u.protocol === 'https:' ? https : http;
      const opts = {
        hostname: u.hostname,
        port: u.port || (u.protocol === 'https:' ? 443 : 80),
        path: u.pathname + u.search,
        method: 'GET',
        headers: { 'User-Agent': 'my-automaton/1.0' },
        timeout: 10000
      };
      const req = mod.request(opts, (res) => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => resolve({ status: res.statusCode, body: d.slice(0, 200) }));
      });
      req.on('error', e => resolve({ status: 'error', body: e.message }));
      req.on('timeout', () => { req.destroy(); resolve({ status: 'timeout', body: '' }); });
      req.end();
    } catch(e) {
      resolve({ status: 'error', body: e.message });
    }
  });
}

async function main() {
  console.log('=== Submitting to Developer Directories ===\n');

  /* 1. MCP.so — MCP server registry */
  console.log('1. MCP.so...');
  const mcpResult = await post('https://registry.mcp.so/api/servers', {
    name: AGENT.name,
    description: AGENT.description,
    categories: ['code-review', 'security'],
    endpoint: AGENT.url,
    logo: AGENT.url + '/favicon.ico',
  });
  console.log(`   → ${mcpResult.status}: ${mcpResult.body.slice(0, 80)}`);

  /* 2. API.market — API marketplace */
  console.log('2. API.market...');
  const apiResult = await post('https://api.market/api/v1/apis', {
    name: AGENT.displayName,
    description: AGENT.description,
    baseUrl: AGENT.url,
    category: 'AI & Machine Learning',
    pricing: AGENT.pricing,
  });
  console.log(`   → ${apiResult.status}: ${apiResult.body.slice(0, 80)}`);

  /* 3. ProgrammableWeb (now part of MuleSoft) */
  console.log('3. ProgrammableWeb...');
  const pwResult = await post('https://www.programmableweb.com/api-registry', {
    title: AGENT.displayName,
    description: AGENT.description,
    url: AGENT.url,
    category: 'AI',
    tags: AGENT.tags.join(', '),
  });
  console.log(`   → ${pwResult.status}: ${pwResult.body.slice(0, 80)}`);

  /* 4. RapidAPI (alternative endpoint) */
  console.log('4. RapidAPI...');
  /* RapidAPI requires manual listing — but let's try */
  const rapidResult = await get('https://rapidapi.com/search/AI%20code%20review?q=AI%20code%20review');
  console.log(`   → ${rapidResult.status}: Checked marketplace`);

  /* 5. GitHub — create issue to add to awesome-mcp-servers */
  console.log('5. GitHub awesome-mcp-servers...');
  const ghResult = await post('https://api.github.com/repos/punkpeye/awesome-mcp-servers/issues', {
    title: `Add ${AGENT.name} — ${AGENT.displayName}`,
    body: `## Add ${AGENT.name}\n\n${AGENT.description}\n\n- **URL**: ${AGENT.url}\n- **Category**: Developer Tools\n- **Free Tier**: 3 requests/day per service\n\n[${AGENT.name}](${AGENT.url})`,
    labels: ['submission']
  });
  console.log(`   → ${ghResult.status}: ${ghResult.body.slice(0, 80)}`);

  /* 6. Bard/Google AI directory */
  console.log('6. Bard AI directory...');
  const bardResult = await post('https://bard.google.com/partner/submit', {
    name: AGENT.name,
    description: AGENT.description,
    website: AGENT.url,
    category: 'Developer Tools',
  });
  console.log(`   → ${bardResult.status}: ${bardResult.body.slice(0, 80)}`);

  console.log('\n=== Summary ===');
  console.log('Results logged. Manual steps remaining:');
  console.log('1. Submit to smithery.ai: https://smithery.ai/docs/submit');
  console.log('2. Post on Hacker News: https://news.ycombinator.com/submit');
  console.log('3. Post on Reddit r/artificial + r/MachineLearning');
  console.log('4. Add to GitHub awesome list via PR');
  console.log('5. List on https://glama.ai/explore');
}

main().catch(console.error);
