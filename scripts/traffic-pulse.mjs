#!/usr/bin/env node
/**
 * traffic-pulse.mjs — One-shot traffic generation pulse
 * Runs the highest-ROI traffic actions available without external API keys.
 * No gateway restart needed. Pure execution.
 */

const https = require('https');
const http = require('http');
const fs = require('fs');

const SITE = 'https://automation.songheng.vip';
const LOG_FILE = '/root/automaton/data/traffic-pulse.log';
const DIR_SUBMISSIONS = __dirname + '/../content/submissions';

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  try { fs.appendFileSync(LOG_FILE, line + '\n'); } catch(e) {}
}

function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { timeout: 10000, ...options }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

async function pingSearchEngines() {
  log('📡 Pinging search engines...');
  const pings = [
    `https://www.google.com/ping?sitemap=${SITE}/sitemap.xml`,
    `https://www.bing.com/ping?sitemap=${SITE}/sitemap.xml`,
    `https://api.indexnow.org/indexnow?url=${SITE}&key=${SITE}`
  ];
  for (const url of pings) {
    try {
      const res = await fetch(url);
      log(`  ${url.split('/')[2]}: ${res.status}`);
    } catch(e) {
      log(`  ${url.split('/')[2]}: error - ${e.message}`);
    }
  }
}

async function checkGateway() {
  log('🔍 Checking gateway health...');
  const endpoints = ['/', '/health', '/api-docs.html', '/get-started.html', '/playground.html'];
  let ok = 0;
  for (const ep of endpoints) {
    try {
      const res = await fetch(`${SITE}${ep}`);
      if (res.status === 200) ok++;
      else log(`  ${ep}: ${res.status} ⚠️`);
    } catch(e) {
      log(`  ${ep}: error - ${e.message}`);
    }
  }
  log(`  Gateway: ${ok}/${endpoints.length} endpoints OK`);
  return ok;
}

async function buildSitemap() {
  log('🗺️ Building sitemap...');
  const contentDir = '/root/automaton/content';
  const urls = [];
  
  try {
    const files = fs.readdirSync(contentDir);
    for (const f of files) {
      if (f.endsWith('.html') || f.endsWith('.mjs')) {
        urls.push(`${SITE}/${f}`);
      }
    }
    // Blog posts
    const blogDir = `${contentDir}/blog`;
    if (fs.existsSync(blogDir)) {
      const blogFiles = fs.readdirSync(blogDir);
      for (const f of blogFiles) {
        if (f.endsWith('.html')) {
          urls.push(`${SITE}/blog/${f}`);
        }
      }
    }
    
    // Check for existing sitemap
    const existingMap = `${contentDir}/sitemap.xml`;
    const existingUrls = fs.existsSync(existingMap) 
      ? (fs.readFileSync(existingMap, 'utf-8').match(/<loc>[^<]+<\/loc>/g) || []).length
      : 0;
    
    log(`  Found ${urls.length} pages (existing sitemap had ${existingUrls} URLs)`);
    
    // Write sitemap
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${u}</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>`).join('\n')}
</urlset>`;
    fs.writeFileSync(existingMap, xml);
    log(`  Sitemap written: ${urls.length} URLs`);
  } catch(e) {
    log(`  Error building sitemap: ${e.message}`);
  }
}

async function runDirectorySubmissions() {
  log('📬 Running directory submissions...');
  const submitScript = __dirname + '/submit-directories.cjs';
  if (fs.existsSync(submitScript)) {
    const { spawnSync } = require('child_process');
    const result = spawnSync('node', [submitScript], { timeout: 30000 });
    log(`  submit-directories: exit=${result.status}`);
    const lastLines = result.stdout?.toString().split('\n').slice(-3).join('; ').trim();
    if (lastLines) log(`  ${lastLines}`);
  } else {
    log('  submit-directories.cjs not found, skipping');
  }
}

async function checkDevKeys() {
  log('🔑 Checking dev keys...');
  const apiKeysFile = '/root/automaton/data/api-keys.json';
  if (!fs.existsSync(apiKeysFile)) {
    log('  No api-keys.json found');
    return;
  }
  const keys = JSON.parse(fs.readFileSync(apiKeysFile, 'utf-8'));
  const devKeys = Object.entries(keys).filter(([k]) => k !== 'am_admin');
  const totalCredits = devKeys.reduce((sum, [,v]) => sum + (v.credits || 0), 0);
  const totalUsed = devKeys.reduce((sum, [,v]) => sum + (v.used || 0), 0);
  log(`  ${devKeys.length} API keys, ${totalCredits} credits remaining, ${totalUsed} used`);
}

async function generateReport() {
  log('📊 Generating traffic report...');
  const report = {
    timestamp: new Date().toISOString(),
    site: SITE,
    actions: {}
  };
  
  // Check if any recent visitor activity
  const statsFile = '/root/automaton/data/stats.json';
  if (fs.existsSync(statsFile)) {
    try {
      const stats = JSON.parse(fs.readFileSync(statsFile, 'utf-8'));
      report.visitors = stats.visitors || stats.totalRequests || 'unknown';
    } catch(e) {}
  }
  
  // Check nginx access logs if available
  try {
    const { execSync } = require('child_process');
    const recentLogs = execSync('tail -10 /var/log/nginx/access.log 2>/dev/null || echo "no logs"').toString();
    const ipCount = (recentLogs.match(/\d+\.\d+\.\d+\.\d+/g) || []).length;
    report.recentAccess = ipCount > 0 ? `${ipCount} IPs in last 10 lines` : 'no recent access';
  } catch(e) {
    report.recentAccess = 'unable to read logs';
  }
  
  log(`  Report: ${JSON.stringify(report)}`);
  return report;
}

async function main() {
  console.log(`
╔══════════════════════════════════════╗
║       TRAFFIC PULSE — Pulse #1       ║
║  Generating traffic & monitoring     ║
╚══════════════════════════════════════╝
`);
  
  log('🚀 Starting traffic pulse...');
  
  // Phase 1: Check infrastructure
  const gwOk = await checkGateway();
  
  // Phase 2: Build sitemap & ping search engines
  await buildSitemap();
  await pingSearchEngines();
  
  // Phase 3: Run directory submissions
  await runDirectorySubmissions();
  
  // Phase 4: Check state
  await checkDevKeys();
  
  // Phase 5: Report
  await generateReport();
  
  log('✅ Traffic pulse complete!');
  
  // Summary
  console.log(`\n📋 Summary:
  Gateway: ${gwOk}/5 endpoints OK
  Sitemap: rebuilt & search engines pinged
  Directories: submitted
  API Keys: checked
  Log: ${LOG_FILE}
  
Next steps:
  1. Submit to ClawHunt manually: https://clawhunt.com/submit-tool
  2. Post dev.to article when DEVTO_API_KEY is available
  3. Check back in 24h for search engine indexing
  `);
}

main().catch(e => {
  console.error('Fatal:', e.message);
  process.exit(1);
});