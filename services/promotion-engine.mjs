#!/usr/bin/env node
/**
 * PROMOTION ENGINE v1.0
 * Automated search engine submission + directory promotion
 * Runs inside gateway process space (port 8080)
 * 
 * Deploy: Add route to gateway.cjs, restart gateway
 * Manual: node /root/automaton/services/promotion-engine.mjs
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const CONFIG = {
  domain: 'automation.songheng.vip',
  sitemapUrl: 'https://automation.songheng.vip/sitemap.xml',
  dataDir: '/root/automaton/data',
  contentDir: '/root/automaton/content',
  outputFile: '/root/automaton/data/promotion-results.json',
};

const SEARCH_ENGINES = [
  { name: 'Google', url: `https://www.google.com/ping?sitemap=${encodeURIComponent(CONFIG.sitemapUrl)}` },
  { name: 'Bing', url: `https://www.bing.com/ping?sitemap=${encodeURIComponent(CONFIG.sitemapUrl)}` },
];

const AI_DIRECTORIES = [
  { name: 'MCP.so', url: 'https://mcp.so/api/submit', method: 'POST', body: { url: `https://${CONFIG.domain}`, name: 'my-automaton AI Services', description: 'AI-powered code review, security scanning, text analysis, and summarization API with x402 micropayments on Base chain.', category: 'developer-tools' }},
  { name: 'Smithery', url: 'https://smithery.ai/api/submit-endpoint', method: 'POST', body: { url: `https://${CONFIG.domain}`, name: 'my-automaton' }},
  { name: 'Glama', url: 'https://glama.ai/api/submit', method: 'POST', body: { url: `https://${CONFIG.domain}` }},
];

async function fetchUrl(url, options = {}) {
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { timeout: 10000, ...options }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data: data.substring(0, 500) }));
    });
    req.on('error', (e) => resolve({ status: 0, error: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 0, error: 'timeout' }); });
  });
}

async function postUrl(url, body) {
  return new Promise((resolve) => {
    const parsed = new URL(url);
    const client = url.startsWith('https') ? https : http;
    const postData = JSON.stringify(body);
    const req = client.request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) },
      timeout: 10000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data: data.substring(0, 500) }));
    });
    req.on('error', (e) => resolve({ status: 0, error: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 0, error: 'timeout' }); });
    req.write(postData);
    req.end();
  });
}

async function pingSearchEngines() {
  console.log('\n=== PINGING SEARCH ENGINES ===');
  const results = [];
  for (const se of SEARCH_ENGINES) {
    console.log(`  → ${se.name}...`);
    const res = await fetchUrl(se.url);
    results.push({ engine: se.name, status: res.status, error: res.error || null });
    console.log(`    ${res.status === 200 ? '✓' : '✗'} HTTP ${res.status}${res.error ? ' (' + res.error + ')' : ''}`);
  }
  return results;
}

async function submitToDirectories() {
  console.log('\n=== SUBMITTING TO AI DIRECTORIES ===');
  const results = [];
  for (const dir of AI_DIRECTORIES) {
    console.log(`  → ${dir.name}...`);
    let res;
    if (dir.method === 'POST') {
      res = await postUrl(dir.url, dir.body);
    } else {
      res = await fetchUrl(dir.url);
    }
    results.push({ directory: dir.name, status: res.status, error: res.error || null });
    console.log(`    ${res.status === 200 ? '✓' : '✗'} HTTP ${res.status}${res.error ? ' (' + res.error + ')' : ''}`);
  }
  return results;
}

async function verifyDomainReachable() {
  console.log('\n=== VERIFYING DOMAIN ===');
  const res = await fetchUrl(`https://${CONFIG.domain}/`);
  const ok = res.status === 200;
  console.log(`  ${ok ? '✓' : '✗'} ${CONFIG.domain} → HTTP ${res.status}`);
  return { domain: CONFIG.domain, reachable: ok, status: res.status, error: res.error || null };
}

function updateWorklog() {
  const logPath = '/root/automaton/WORKLOG.md';
  try {
    let content = fs.readFileSync(logPath, 'utf-8');
    const now = new Date().toISOString().split('T')[0];
    content = content.replace(/^# WORKLOG — Last Updated: .*/m, `# WORKLOG — Last Updated: ${now}`);
    if (!content.includes('- [x] Promotion engine built')) {
      content = content.replace('### Operations', '### Operations\n- [x] Promotion engine built (promotion-engine.mjs)');
    }
    fs.writeFileSync(logPath, content);
    console.log('  ✓ WORKLOG.md updated');
  } catch(e) {
    console.log(`  ✗ Could not update WORKLOG.md: ${e.message}`);
  }
}

function generateStatsReport(results) {
  const apiKeysPath = '/root/automaton/data/api-keys.json';
  let keys = { total: 0, paying: 0, total_credits_sold: 0, total_credits_used: 0 };
  try {
    const data = JSON.parse(fs.readFileSync(apiKeysPath, 'utf-8'));
    keys.total = Object.keys(data).length;
    for (const [k, v] of Object.entries(data)) {
      if (v.price_id && v.price_id !== 'dev') {
        keys.paying++;
        keys.total_credits_sold += v.credits || 0;
        keys.total_credits_used += v.used || 0;
      }
    }
  } catch(e) {}
  
  const report = {
    timestamp: new Date().toISOString(),
    domain: CONFIG.domain,
    reachable: results.domain?.reachable || false,
    search_engines: results.searchEngines || [],
    directories: results.directories || [],
    stats: keys,
    utilization_pct: keys.total_credits_sold > 0 ? ((keys.total_credits_used / keys.total_credits_sold) * 100).toFixed(1) : '0.0'
  };
  
  fs.writeFileSync(CONFIG.outputFile, JSON.stringify(report, null, 2));
  console.log(`  ✓ Report saved to ${CONFIG.outputFile}`);
  return report;
}

async function run() {
  console.log('========================================');
  console.log('  PROMOTION ENGINE v1.0');
  console.log(`  Domain: ${CONFIG.domain}`);
  console.log('========================================');
  
  const results = {};
  
  results.domain = await verifyDomainReachable();
  if (!results.domain.reachable) {
    console.log('\n✗ DOMAIN NOT REACHABLE — aborting submissions');
    generateStatsReport(results);
    process.exit(1);
  }
  
  results.searchEngines = await pingSearchEngines();
  results.directories = await submitToDirectories();
  
  const report = generateStatsReport(results);
  updateWorklog();
  
  console.log('\n========================================');
  console.log('  SUMMARY');
  console.log(`  Domain: ${report.domain} (${report.reachable ? '✓ LIVE' : '✗ DOWN'})`);
  console.log(`  Search engines pinged: ${report.search_engines.filter(r => r.status === 200).length}/${report.search_engines.length}`);
  console.log(`  Directories submitted: ${report.directories.filter(r => r.status === 200).length}/${report.directories.length}`);
  console.log(`  Paying users: ${report.stats.paying}`);
  console.log(`  Credits: ${report.stats.total_credits_used}/${report.stats.total_credits_sold} (${report.utilization_pct}% used)`);
  console.log('========================================');
}

run().catch(console.error);
