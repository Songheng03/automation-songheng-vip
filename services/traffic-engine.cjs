#!/usr/bin/env node
/**
 * traffic-engine.cjs — Automated traffic generation & outreach
 * Runs periodic tasks to drive developers to my-automaton's AI services
 * 
 * Tasks:
 * 1. Submit sitemap to Google/Bing/IndexNow
 * 2. Ping MCP directories (Smithery, Glama, MCP.so)
 * 3. Post to developer communities
 * 4. Track results
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const DOMAIN = 'automation.songheng.vip';
const BASE_URL = 'https://' + DOMAIN;
const WALLET = '0x76eADdEBFfb6a61DD071f97F4508467fc55dd113';
const GATEWAY = 'http://localhost:8080';
const DATA_DIR = '/root/automaton/data';
const LOG_FILE = path.join(DATA_DIR, 'traffic-engine.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// Load state
let state = { runs: 0, submissions: [], errors: [], lastRun: null };
try { state = JSON.parse(fs.readFileSync(LOG_FILE, 'utf8')); } catch(e) {}

function saveState() {
  fs.writeFileSync(LOG_FILE, JSON.stringify(state, null, 2));
}

function fetch(opts) {
  return new Promise((resolve, reject) => {
    const client = opts.url?.startsWith('https') ? https : http;
    const url = new URL(opts.url);
    const req = client.request({
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: opts.method || 'GET',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'my-automaton/1.0 (TrafficEngine)', ...opts.headers }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data: data.slice(0, 1000) }));
    });
    req.on('error', reject);
    if (opts.body) req.write(JSON.stringify(opts.body));
    req.end();
  });
}

// Task 1: IndexNow submission
async function submitIndexNow() {
  // Get sitemap URLs first
  try {
    const resp = await fetch({ url: BASE_URL + '/sitemap.xml' });
    const xml = resp.data;
    const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]).slice(0, 10);
    
    if (urls.length === 0) return { task: 'indexnow', status: 'skipped', reason: 'No URLs in sitemap' };
    
    const result = await fetch({
      url: 'https://api.indexnow.org/indexnow',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: {
        host: DOMAIN,
        key: '61cd3a4a32564707b40b3a86c671cb14',
        keyLocation: BASE_URL + '/61cd3a4a32564707b40b3a86c671cb14.txt',
        urlList: urls
      }
    });
    return { task: 'indexnow', status: result.status === 200 ? 'ok' : 'error', urls: urls.length, response: result };
  } catch(e) {
    return { task: 'indexnow', status: 'error', error: e.message };
  }
}

// Task 2: Google Search Console ping
async function pingGoogle() {
  try {
    const result = await fetch({
      url: `https://www.google.com/ping?sitemap=${encodeURIComponent(BASE_URL + '/sitemap.xml')}`
    });
    return { task: 'google_ping', status: result.status === 200 ? 'ok' : 'error', response: result.status };
  } catch(e) {
    return { task: 'google_ping', status: 'error', error: e.message };
  }
}

// Task 3: Bing webmaster ping
async function pingBing() {
  try {
    const result = await fetch({
      url: `https://www.bing.com/ping?sitemap=${encodeURIComponent(BASE_URL + '/sitemap.xml')}`
    });
    return { task: 'bing_ping', status: result.status === 200 ? 'ok' : 'error', response: result.status };
  } catch(e) {
    return { task: 'bing_ping', status: 'error', error: e.message };
  }
}

// Task 4: Submit to MCP aggregators
const MCP_REGISTRIES = [
  { name: 'smithery', url: 'https://smithery.ai/api/v1/register', method: 'POST' },
  { name: 'glama', url: 'https://glama.ai/api/agents/register', method: 'POST' },
];

async function submitToMCPRegistries() {
  const results = [];
  for (const reg of MCP_REGISTRIES) {
    try {
      const result = await fetch({
        url: reg.url,
        method: reg.method,
        body: {
          name: 'my-automaton',
          description: 'AI-powered code analysis, review, security scanning, and summarization via API',
          url: BASE_URL,
          wallet: WALLET,
          endpoints: {
            health: BASE_URL + '/api/health',
            services: BASE_URL + '/api/services',
            mcp_openai: BASE_URL + '/mcp/v1/openai-json',
          }
        }
      });
      results.push({ registry: reg.name, status: 'tried', http: result.status });
    } catch(e) {
      results.push({ registry: reg.name, status: 'error', error: e.message });
    }
  }
  return { task: 'mcp_registries', results };
}

// Task 5: Gateway health check
async function checkGateway() {
  try {
    const result = await fetch({ url: 'http://localhost:8080/api/health' });
    return { task: 'gateway_health', status: result.status === 200 ? 'ok' : 'error', data: result.data?.slice(0, 200) };
  } catch(e) {
    return { task: 'gateway_health', status: 'error', error: e.message };
  }
}

// Task 6: Stats snapshot
async function getStats() {
  try {
    const result = await fetch({ url: 'http://localhost:8080/api/stats/overview' });
    if (result.status === 200) {
      try { return { task: 'stats', status: 'ok', data: JSON.parse(result.data) }; } catch(e) {}
    }
    return { task: 'stats', status: 'error' };
  } catch(e) {
    return { task: 'stats', status: 'error', error: e.message };
  }
}

// Main run
async function runAll() {
  state.runs++;
  state.lastRun = new Date().toISOString();
  
  console.log(`\n🚀 Traffic Engine Run #${state.runs} — ${state.lastRun}`);
  
  const tasks = [
    submitIndexNow(),
    pingGoogle(),
    pingBing(),
    submitToMCPRegistries(),
    checkGateway(),
    getStats()
  ];
  
  const results = await Promise.allSettled(tasks);
  
  for (const r of results) {
    if (r.status === 'fulfilled') {
      const value = r.value;
      state.submissions.push(value);
      console.log(`  ${value.task}: ${value.status} (${JSON.stringify(value).slice(0, 100)})`);
    } else {
      state.errors.push({ error: r.reason?.message || 'Unknown', time: new Date().toISOString() });
      console.log(`  ❌ ${r.reason?.message}`);
    }
  }
  
  // Keep logs manageable
  if (state.submissions.length > 200) state.submissions = state.submissions.slice(-200);
  if (state.errors.length > 50) state.errors = state.errors.slice(-50);
  
  saveState();
  console.log('✅ Run complete. Log saved.');
  return state;
}

// Run if called directly
if (require.main === module) {
  runAll().then(s => {
    console.log(`\n📊 Summary: ${s.runs} runs, ${s.submissions.length} submissions, ${s.errors.length} errors`);
  }).catch(e => {
    console.error('Fatal:', e.message);
    process.exit(1);
  });
} else {
  module.exports = { runAll, state, submitIndexNow, pingGoogle, checkGateway, getStats };
}
