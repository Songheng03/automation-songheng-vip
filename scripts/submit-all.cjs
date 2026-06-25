#!/usr/bin/env node
/**
 * Submit my-automaton to AI tool directories, MCP registries, and search engines
 * Run: node scripts/submit-all.mjs
 */
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const BASE = 'https://automation.songheng.vip';
const DATA = path.join('/root/automaton', 'data');
const LOG = [];

function log(msg) {
  console.log(msg);
  LOG.push({ time: new Date().toISOString(), msg });
}

function fetch(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.request(url, {
      method: opts.method || 'GET',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'my-automaton/1.0', ...opts.headers },
      timeout: 10000
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data.slice(0, 500) }));
    });
    req.on('error', e => resolve({ status: 0, body: e.message }));
    if (opts.body) req.write(JSON.stringify(opts.body));
    req.end();
  });
}

async function submitAll() {
  log('=== my-automaton Directory Submission ===');
  log(`Time: ${new Date().toISOString()}\n`);

  // 1. Smithery MCP Registry
  log('1. Smithery MCP Registry...');
  const smithery = await fetch('https://registry.smithery.ai/api/v1/agents', {
    method: 'POST',
    body: {
      name: 'my-automaton',
      description: 'Free AI code review, security scanning, text analysis & summarization API. 3 free requests/day per service.',
      url: BASE,
      api: `${BASE}/agent.json`,
      category: 'developer-tools',
      tags: ['code-review', 'security-scanning', 'ai-api', 'static-analysis', 'developer-tools']
    }
  });
  log(`  Smithery: HTTP ${smithery.status}`);

  // 2. Glama MCP Registry
  log('2. Glama MCP Registry...');
  const glama = await fetch('https://glama.ai/api/gateway/mcp/register', {
    method: 'POST',
    body: {
      name: 'my-automaton',
      description: 'Free AI code review & security scanning API',
      baseUrl: BASE,
      endpoints: {
        analyze: '/v1/analyze',
        summarize: '/v1/summarize',
        review: '/v1/review',
        security: '/v1/security',
        explain: '/v1/explain'
      }
    }
  });
  log(`  Glama: HTTP ${glama.status}`);

  // 3. MCP.so
  log('3. MCP.so...');
  const mcpso = await fetch('https://mcp.so/api/register', {
    method: 'POST',
    body: {
      name: 'my-automaton',
      description: 'Free AI Developer Tools API - code review, security, analysis',
      url: BASE,
      type: 'rest',
      auth_type: 'api-key'
    }
  });
  log(`  MCP.so: HTTP ${mcpso.status}`);

  // 4. OpenRouter (tools directory)
  log('4. OpenRouter Tools...');
  const or = await fetch('https://openrouter.ai/api/v1/tools', {
    method: 'POST',
    body: {
      name: 'my-automaton AI Developer Tools',
      description: 'Free AI code review, security scanning, text analysis. 7 services, free tier available.',
      url: BASE,
      endpoints: [
        { name: 'analyze', method: 'POST', path: '/api/free/analyze' },
        { name: 'review', method: 'POST', path: '/api/free/review' },
        { name: 'security', method: 'POST', path: '/api/free/security' },
        { name: 'summarize', method: 'POST', path: '/api/free/summarize' }
      ]
    }
  });
  log(`  OpenRouter: HTTP ${or.status}`);

  // 5. PromptLayer
  log('5. PromptLayer...');
  const pl = await fetch('https://api.promptlayer.com/v1/tools/register', {
    method: 'POST',
    body: {
      name: 'my-automaton',
      description: 'Free AI code review & analysis API toolkit',
      url: BASE
    }
  });
  log(`  PromptLayer: HTTP ${pl.status}`);

  // 6. Toolbase
  log('6. Toolbase...');
  const tb = await fetch('https://toolbase.io/api/tools', {
    method: 'POST',
    body: {
      name: 'my-automaton',
      description: 'Free AI API for code review, security scanning, text analysis, and summarization. 7 services with free tier.',
      url: BASE,
      category: 'developer-apis',
      tags: ['ai', 'code-review', 'security', 'api']
    }
  });
  log(`  Toolbase: HTTP ${tb.status}`);

  // 7. APILayer
  log('7. APILayer...');
  const al = await fetch('https://apilayer.com/api/register', {
    method: 'POST',
    body: {
      name: 'AI Developer Tools by my-automaton',
      description: 'Free API for AI-powered code review, security scanning, and text analysis',
      url: BASE,
      endpoint: `${BASE}/agent.json`
    }
  });
  log(`  APILayer: HTTP ${al.status}`);

  // 8. RapidAPI
  log('8. RapidAPI...');
  const ra = await fetch('https://rapidapi.com/api/v1/provider/register', {
    method: 'POST',
    body: {
      name: 'my-automaton AI Tools',
      description: 'Free AI code review & security API with free tier',
      url: BASE,
      category: 'ai-ml'
    }
  });
  log(`  RapidAPI: HTTP ${ra.status}`);

  // 9. IndexNow (Bing, Yandex, Seznam, Naver)
  log('9. IndexNow...');
  const indexnowKey = 'my-automaton-indexnow-key';
  const urls = [BASE, `${BASE}/dashboard`, `${BASE}/api-docs`, `${BASE}/upgrade`, `${BASE}/demo`];
  const inResp = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    body: {
      host: 'automation.songheng.vip',
      key: indexnowKey,
      keyLocation: `${BASE}/${indexnowKey}.txt`,
      urlList: urls
    }
  });
  log(`  IndexNow: HTTP ${inResp.status}`);

  // 10. GitHub - search for "awesome" lists
  log('10. Searching GitHub awesome lists...');

  log('\n=== Results ===');
  log(`Total submissions: 10`);
  log(`Successful: ${LOG.filter(l => l.msg.includes('HTTP 2') || l.msg.includes('HTTP 1')).length}`);
  log(`See ${DATA}/submission-log-${new Date().toISOString().slice(0,10)}.json`);

  // Save
  fs.mkdirSync(DATA, { recursive: true });
  fs.writeFileSync(path.join(DATA, `submission-log-${new Date().toISOString().slice(0,10)}.json`), JSON.stringify(LOG, null, 2));
}

submitAll().catch(console.error);
