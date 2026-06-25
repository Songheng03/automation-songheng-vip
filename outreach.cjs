#!/usr/bin/env node
// ── Agent Discovery & Outreach Script ──
// Proactively registers my-automaton with agent directories, discovery services,
// and other known agents to generate visibility and traffic.
// Runs as a heartbeat task.

const https = require('https');
const http = require('http');
const { readFileSync, existsSync, writeFileSync } = require('fs');
const { join } = require('path');

const MY_SERVER = 'automation.songheng.vip:8080';
const MY_WALLET = '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113';
const MY_NAME = 'my-automaton';
const DATA_DIR = join(__dirname, 'data');
const OUTREACH_LOG = join(DATA_DIR, 'outreach.json');

function log(msg) { console.log(`[${new Date().toISOString()}] ${msg}`); }

function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { timeout: 10000, ...options }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data, headers: res.headers }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.end();
  });
}

function post(url, body) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const client = parsed.protocol === 'https:' ? https : http;
    const json = JSON.stringify(body);
    const options = {
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(json) },
      timeout: 10000
    };
    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.write(json);
    req.end();
  });
}

function loadOutreachLog() {
  try {
    if (existsSync(OUTREACH_LOG)) return JSON.parse(readFileSync(OUTREACH_LOG, 'utf-8'));
  } catch(e) {}
  return { registrations: [], lastRun: null, stats: { total: 0, success: 0, failed: 0 } };
}

function saveOutreachLog(logData) {
  try {
    if (!existsSync(DATA_DIR)) require('fs').mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(OUTREACH_LOG, JSON.stringify(logData, null, 2));
  } catch(e) { log(`Failed to save outreach log: ${e.message}`); }
}

// ── Directory discovery targets ──
async function discoverDirectories() {
  const targets = [
    // Try to discover other agent directories via well-known endpoints
    { url: 'http://automation.songheng.vip:3099/api/discover', name: 'Self Discovery', type: 'check' },
    { url: 'http://agent-registry.conway.io/api/agents', name: 'Conway Registry', type: 'register' },
  ];
  
  // Scan common agent ports on my own subnet for other agents
  const commonPorts = [3000, 3099, 3110, 3120, 3150, 4100, 4101, 4280, 8080, 8888];
  const results = [];
  
  for (const target of targets) {
    try {
      log(`Checking ${target.name} at ${target.url}...`);
      const res = await fetch(target.url);
      results.push({ target: target.name, url: target.url, status: res.status, reachable: true });
      log(`  → Status ${res.status}`);
    } catch(e) {
      results.push({ target: target.name, url: target.url, reachable: false, error: e.message });
      log(`  → Unreachable: ${e.message}`);
    }
  }
  
  return results;
}

// ── Register on agent discovery services ──
async function registerOnServices() {
  const registrations = [];
  const services = [
    { url: 'http://automation.songheng.vip:3120/api/handshake', name: 'My Handshake Service', payload: {
      agentAddress: MY_WALLET,
      agentName: MY_NAME,
      capabilities: ['text-analysis', 'code-review', 'security-scan', 'summarization', 'pastebin']
    }},
    { url: 'http://automation.songheng.vip:3150/api/referral/register', name: 'My Referral Program', payload: {
      agentAddress: MY_WALLET,
      agentName: MY_NAME
    }}
  ];
  
  for (const svc of services) {
    try {
      log(`Registering on ${svc.name}...`);
      const res = await post(svc.url, svc.payload);
      let parsed = null;
      try { parsed = JSON.parse(res.data); } catch(e) {}
      registrations.push({ service: svc.name, status: res.status, response: parsed, success: res.status < 400 });
      log(`  → ${res.status}: ${parsed ? (parsed.success || parsed.code || 'OK') : res.data.substring(0, 100)}`);
    } catch(e) {
      registrations.push({ service: svc.name, error: e.message, success: false });
      log(`  → Failed: ${e.message}`);
    }
  }
  return registrations;
}

// ── Generate and update sitemap ──
function updateSitemap() {
  const pages = [
    { url: '/', priority: 1.0, changefreq: 'weekly' },
    { url: '/index.html', priority: 0.9, changefreq: 'weekly' },
    { url: '/api-docs.html', priority: 0.8, changefreq: 'monthly' },
    { url: '/blog.html', priority: 0.7, changefreq: 'daily' },
    { url: '/playground', priority: 0.6, changefreq: 'monthly' },
    { url: '/demo', priority: 0.5, changefreq: 'monthly' },
    { url: '/paste', priority: 0.7, changefreq: 'daily' },
    { url: '/health', priority: 0.3, changefreq: 'hourly' },
  ];
  
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(p => `  <url>
    <loc>http://automation.songheng.vip${p.url}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join('\n')}
</urlset>`;
  
  try {
    writeFileSync(join(__dirname, 'content', 'sitemap.xml'), sitemap);
    log(`📑 Sitemap updated with ${pages.length} URLs`);
  } catch(e) { log(`Sitemap update failed: ${e.message}`); }
}

// ── Generate a basic robots.txt ──
function updateRobotsTxt() {
  const robots = `User-agent: *
Allow: /
Sitemap: http://automation.songheng.vip/sitemap.xml

# Disallow internal API endpoints
Disallow: /v1/wallet
Disallow: /v1/verify-payment
`;
  try {
    writeFileSync(join(__dirname, 'content', 'robots.txt'), robots);
    log(`🤖 robots.txt updated`);
  } catch(e) {}
}

// ── Run a health check on my own services ──
async function selfHealthCheck() {
  const checks = [
    { name: 'Gateway', url: `http://localhost:8080/health` },
    { name: 'Homepage', url: `http://localhost:8080/` },
    { name: 'API Catalog', url: `http://localhost:8080/api/catalog` },
    { name: 'Playground', url: `http://localhost:8080/playground` },
    { name: 'Pastebin', url: `http://localhost:8080/paste` },
  ];
  
  const results = [];
  for (const check of checks) {
    try {
      const res = await fetch(check.url);
      results.push({ name: check.name, status: res.status, ok: res.status < 500 });
    } catch(e) {
      results.push({ name: check.name, error: e.message, ok: false });
    }
  }
  
  const allOk = results.every(r => r.ok);
  log(`🏥 Health Check: ${allOk ? 'ALL OK' : 'SOME FAILED'}`);
  results.forEach(r => log(`  ${r.ok ? '✅' : '❌'} ${r.name}: ${r.status || r.error}`));
  return { results, allOk };
}

// ── Main ──
async function main() {
  log('🚀 Starting agent outreach...');
  log(`  Name: ${MY_NAME}`);
  log(`  Server: ${MY_SERVER}`);
  log(`  Wallet: ${MY_WALLET}`);
  
  const logData = loadOutreachLog();
  logData.lastRun = new Date().toISOString();
  
  // 1. Self health check
  const health = await selfHealthCheck();
  logData.lastHealthCheck = health;
  
  // 2. Register on services
  const registrations = await registerOnServices();
  logData.registrations.push({ date: logData.lastRun, registrations });
  
  // 3. Discover other agents/directories
  const discovery = await discoverDirectories();
  logData.lastDiscovery = discovery;
  
  // 4. Update SEO files
  updateSitemap();
  updateRobotsTxt();
  
  // 5. Update stats
  logData.stats.total += registrations.length;
  logData.stats.success += registrations.filter(r => r.success).length;
  logData.stats.failed += registrations.filter(r => !r.success).length;
  
  saveOutreachLog(logData);
  
  log(`📊 Outreach Stats: ${logData.stats.success}/${logData.stats.total} successful registrations`);
  log('✅ Outreach complete');
}

main().catch(e => log(`FATAL: ${e.message}`));
