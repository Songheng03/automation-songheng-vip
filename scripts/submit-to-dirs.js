#!/usr/bin/env node
// Directory Submission Tool for my-automaton
// Run with: node submit-to-dirs.js <tunnel-url>
// Records results and can be re-run when tunnel changes

const fs = require('fs');
const https = require('https');
const http = require('http');

const tunnelUrl = process.argv[2];
if (!tunnelUrl) {
  console.error('Usage: node submit-to-dirs.js <tunnel-url>');
  console.error('Example: node submit-to-dirs.js https://xxxx.trycloudflare.com');
  process.exit(1);
}

const RESULTS_FILE = '/root/automaton/data/directory-submissions.json';
const BASE = tunnelUrl.replace(/\/+$/, '');

// Try to load existing results
let results = [];
try { results = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf8')); } catch(e) {}

function fetch(url, data) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const body = JSON.stringify(data);
    const opts = {
      hostname: u.hostname,
      port: u.port || 443,
      path: u.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      timeout: 15000
    };
    const req = (u.protocol === 'https:' ? https : http).request(opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data.slice(0, 500) }));
    });
    req.on('error', e => resolve({ status: 0, body: e.message }));
    req.write(body);
    req.end();
  });
}

const directories = [
  {
    name: 'MCP.so',
    url: 'https://mcp.so/api/servers',
    data: {
      name: 'my-automaton',
      description: 'AI-powered code review, security scanning, text analysis, and summarization via MCP. 7 tools: analyze, summarize, code-review, security-scan, explain, refactor, complexity-analysis.',
      endpoint: BASE + '/mcp',
      transport: 'streamable-http',
      tools: ['analyze', 'summarize', 'code-review', 'security-scan', 'explain', 'refactor', 'complexity-analysis'],
      pricing: 'freemium'
    }
  },
  {
    name: 'Toolhunt',
    url: 'https://toolhunt.dev/api/tools',
    data: {
      name: 'my-automaton AI API',
      description: 'Code review, security scanning, text analysis API. Pay per request with USDC on Base chain. 3 free requests/day per IP.',
      url: BASE,
      category: 'developer-tools',
      tags: ['code-review', 'ai', 'security', 'text-analysis', 'api']
    }
  },
  {
    name: 'OpenTools',
    url: 'https://opentools.dev/api/tools',
    data: {
      name: 'my-automaton',
      description: 'AI code review and analysis API',
      url: BASE,
      category: 'ai',
      pricing: 'pay-per-use'
    }
  },
  {
    name: 'ClawHunt',
    url: 'https://clawhunt.com/api/agents',
    data: {
      name: 'my-automaton',
      description: 'Sovereign AI agent offering text analysis, code review, security scanning, and summarization via REST API and MCP',
      url: BASE,
      wallet: '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113',
      chain: 'base',
      capabilities: ['code-review', 'security-scan', 'text-analysis', 'summarization'],
      pricing: 'pay-per-use via USDC'
    }
  },
  {
    name: 'AI Agent Directory',
    url: 'https://aiagents.directory/api/agents',
    data: {
      name: 'my-automaton',
      description: 'Autonomous AI agent for code analysis and security',
      url: BASE,
      category: 'developer-tools'
    }
  },
  {
    name: 'AgentHub',
    url: 'https://agenthub.dev/api/agents',
    data: {
      name: 'my-automaton',
      description: 'Code review and analysis AI agent',
      url: BASE,
      category: 'developer-tools'
    }
  }
];

async function run() {
  console.log(`\n=== Submitting to ${directories.length} directories ===`);
  console.log(`Tunnel URL: ${BASE}\n`);

  for (const dir of directories) {
    process.stdout.write(`${dir.name}... `);
    const existing = results.find(r => r.directory === dir.name);
    const result = await fetch(dir.url, dir.data);
    const entry = {
      directory: dir.name,
      url: dir.url,
      status: result.status,
      response: result.body.slice(0, 300),
      timestamp: new Date().toISOString()
    };
    
    if (existing) {
      Object.assign(existing, entry);
    } else {
      results.push(entry);
    }

    if (result.status === 200 || result.status === 201) {
      console.log(`✅ ${result.status}`);
    } else if (result.status === 404) {
      console.log(`⚠️  ${result.status} (wrong endpoint?)`);
    } else if (result.status === 0) {
      console.log(`❌ ${result.body.slice(0, 100)}`);
    } else {
      console.log(`🔄 ${result.status}`);
    }
  }

  fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
  console.log(`\n✅ Results saved to ${RESULTS_FILE}`);
  
  const succeeded = results.filter(r => r.status === 200 || r.status === 201).length;
  const total = results.length;
  console.log(`Summary: ${succeeded}/${total} directories accepted`);
}

run().catch(console.error);
