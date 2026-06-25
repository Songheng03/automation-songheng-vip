/**
 * mcp-directory-submitter.js — Submit my-automaton to MCP/Smithery directories
 * Sends registration to Smithery.ai, MCP.so, Glama.ai, and other AI tool directories
 * 
 * Run: node scripts/mcp-directory-submitter.js
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://automation.songheng.vip';
const LOG_DIR = '/root/automaton/data';
const MANIFEST = '/root/automaton/content/smithery-manifest.json';

const DIRECTORIES = [
  {
    name: 'Smithery.ai',
    url: 'https://smithery.ai/api/v1/servers',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    getBody: () => {
      try {
        const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
        return JSON.stringify({
          name: manifest.name,
          displayName: manifest.displayName,
          description: manifest.description,
          categories: manifest.categories,
          tags: manifest.tags,
          homepage: manifest.homepage,
          endpoints: manifest.endpoints,
          tools: manifest.tools.map(t => ({ name: t.name, description: t.description })),
          pricing: manifest.pricing
        });
      } catch(e) { return JSON.stringify({ name: 'my-automaton' }); }
    },
    checkBeforeSubmit: false
  },
  {
    name: 'MCP.so',
    url: 'https://mcp.so/api/servers/register',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    getBody: () => JSON.stringify({
      name: 'my-automaton',
      description: '7 AI-powered developer tools: code review, security scanning, text analysis, summarization, code explanation, refactoring, and complexity analysis. Free tier: 3/day.',
      homepage: BASE_URL,
      github: BASE_URL,
      endpoints: { mcp: BASE_URL + '/mcp/jsonrpc' },
      tags: ['code-review', 'security', 'ai', 'developer-tools', 'text-analysis'],
      pricing: 'Free tier available. Paid plans from $5 (500 credits).'
    }),
    checkBeforeSubmit: false
  },
  {
    name: 'Glama.ai',
    url: 'https://glama.ai/api/gateway/servers',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    getBody: () => JSON.stringify({
      name: 'my-automaton',
      displayName: 'my-automaton AI Developer Toolkit',
      description: 'AI-powered code review, security scanning, text analysis, and more. Pay-per-use with USDC.',
      mcpEndpoint: BASE_URL + '/mcp/jsonrpc',
      sseEndpoint: BASE_URL + '/mcp/sse',
      categories: ['code-review', 'security', 'developer-tools'],
      pricing: { free: '3 requests/day', paid: '$5/500 credits' }
    }),
    checkBeforeSubmit: false
  }
];

// Also check a few aggregator sites that auto-discover
const PING_URLS = [
  { name: 'Google (IndexNow)', url: 'https://api.indexnow.org/indexnow', method: 'POST' },
  { name: 'Bing IndexNow', url: 'https://www.bing.com/indexnow', method: 'POST' },
];

function httpsPost(url, body, headers = {}) {
  return new Promise((resolve) => {
    try {
      const u = new URL(url);
      const opts = {
        hostname: u.hostname,
        port: u.port || 443,
        path: u.pathname,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        timeout: 15000
      };
      const req = https.request(opts, (res) => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => resolve({ status: res.statusCode, body: data.slice(0, 500), ok: res.statusCode < 400 }));
      });
      req.on('error', (e) => resolve({ status: 0, error: e.message }));
      req.write(body);
      req.end();
    } catch(e) { resolve({ status: 0, error: e.message }); }
  });
}

function httpsGet(url) {
  return new Promise((resolve) => {
    try {
      https.get(url, { timeout: 10000 }, (res) => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => resolve({ status: res.statusCode, body: data.slice(0, 300), ok: res.statusCode < 400 }));
      }).on('error', (e) => resolve({ status: 0, error: e.message }));
    } catch(e) { resolve({ status: 0, error: e.message }); }
  });
}

async function submitToDirectories() {
  console.log('=== MCP Directory Submitter ===\n');
  
  const results = [];
  
  for (const dir of DIRECTORIES) {
    console.log(`📤 Submitting to ${dir.name}...`);
    
    // Check endpoint first (optional)
    if (dir.checkBeforeSubmit !== false) {
      const check = await httpsGet(dir.url);
      if (!check.ok && check.status !== 405) {
        console.log(`   ⚠️ Endpoint check: ${check.status} — may not accept submissions`);
      }
    }
    
    // Submit
    const body = typeof dir.getBody === 'function' ? dir.getBody() : '{}';
    const result = await httpsPost(dir.url, body, dir.headers);
    
    console.log(`   Status: ${result.status} ${result.ok ? '✅' : '❌'}`);
    if (result.body && result.body.length > 50) {
      console.log(`   Response: ${result.body.slice(0, 150)}`);
    }
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    
    results.push({ name: dir.name, status: result.status, ok: result.ok, error: result.error });
  }
  
  // Log results
  const log = {
    timestamp: new Date().toISOString(),
    results,
    successCount: results.filter(r => r.ok).length,
    failCount: results.filter(r => !r.ok).length
  };
  
  try {
    const logFile = path.join(LOG_DIR, 'directory-submissions.json');
    let history = [];
    try { history = JSON.parse(fs.readFileSync(logFile, 'utf8')); } catch(e) {}
    history.push(log);
    fs.writeFileSync(logFile, JSON.stringify(history, null, 2));
  } catch(e) {}
  
  console.log(`\n=== Summary ===`);
  console.log(`✅ ${log.successCount} directories submitted successfully`);
  console.log(`❌ ${log.failCount} failed`);
  
  if (log.failCount > 0) {
    console.log(`\nFailed submissions:`);
    results.filter(r => !r.ok).forEach(r => {
      console.log(`   • ${r.name}: HTTP ${r.status} ${r.error || ''}`);
    });
    console.log(`\nSome directories require manual registration:`);
    console.log(`   • Smithery.ai: https://smithery.ai/docs/register`);
    console.log(`   • MCP.so: https://mcp.so (register account, add server)`);
    console.log(`   • Glama.ai: https://glama.ai/servers`);
  }
  
  return log;
}

// Also ping IndexNow with our latest URLs
async function pingIndexNow() {
  const today = new Date().toISOString().slice(0, 10);
  const urls = [
    BASE_URL + '/',
    BASE_URL + '/api-docs',
    BASE_URL + '/upgrade',
    BASE_URL + '/blog.html',
    BASE_URL + '/tools.html',
    BASE_URL + '/mcp/v1/openai',
    BASE_URL + '/mcp/jsonrpc',
    BASE_URL + '/smithery-manifest',
    BASE_URL + '/sitemap.xml',
  ];
  
  const body = JSON.stringify({
    host: 'automation.songheng.vip',
    key: 'my-automaton-ping-key',
    keyLocation: BASE_URL + '/indexnow-key.txt',
    urlList: urls
  });
  
  console.log('\n📡 Pinging IndexNow with ' + urls.length + ' URLs...');
  const result = await httpsPost('https://api.indexnow.org/indexnow', body);
  console.log(`   Status: ${result.status} ${result.ok ? '✅' : '❌'}`);
  return result;
}

async function run() {
  await submitToDirectories();
  await pingIndexNow();
  console.log('\n✅ Done! Set a heartbeat to re-run this weekly.');
}

if (require.main === module) {
  // Accept --ping-only to just do IndexNow
  if (process.argv.includes('--ping-only')) {
    pingIndexNow().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
  } else {
    run().catch(e => { console.error(e); process.exit(1); });
  }
}

module.exports = { submitToDirectories, pingIndexNow };
