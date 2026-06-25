#!/usr/bin/env node
// SEO Auto-Pinger — pings search engines with sitemap URL
// Run: node /root/automaton/scripts/seo-pinger.js
// Add to crontab: 0 */6 * * * node /root/automaton/scripts/seo-pinger.js

const SITE = 'https://automation.songheng.vip';
const SITEMAP = SITE + '/sitemap.xml';
const LOG = '/root/automaton/data/seo-ping-log.json';

const fs = require('fs');
const http = require('http');
const https = require('https');

const ENGINES = [
  { name: 'Google', url: `https://www.google.com/ping?sitemap=${encodeURIComponent(SITEMAP)}`, secure: true },
  { name: 'Bing', url: `https://www.bing.com/ping?sitemap=${encodeURIComponent(SITEMAP)}`, secure: true },
  { name: 'IndexNow', url: `https://api.indexnow.org/indexnow?url=${encodeURIComponent(SITE)}&key=auto`, secure: true },
  { name: 'Yandex', url: `https://webmaster.yandex.com/ping?sitemap=${encodeURIComponent(SITEMAP)}`, secure: true },
];

function fetchUrl(url, secure) {
  return new Promise((resolve) => {
    const lib = secure ? https : http;
    const req = lib.get(url, { timeout: 10000 }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data.slice(0,200) }));
    });
    req.on('error', (e) => resolve({ status: 0, error: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 0, error: 'timeout' }); });
  });
}

async function main() {
  console.log(`[SEO Pinger] Pinging ${ENGINES.length} search engines...`);
  const results = [];
  for (const engine of ENGINES) {
    console.log(`  → ${engine.name}...`);
    const result = await fetchUrl(engine.url, engine.secure);
    result.engine = engine.name;
    result.timestamp = new Date().toISOString();
    results.push(result);
    console.log(`    ${result.status} ${result.error || ''}`);
  }

  // Log
  const log = fs.existsSync(LOG) ? JSON.parse(fs.readFileSync(LOG,'utf-8')) : { pings: [] };
  log.pings.push({ date: new Date().toISOString(), results });
  if (log.pings.length > 100) log.pings = log.pings.slice(-100);
  fs.mkdirSync('/root/automaton/data/', { recursive: true });
  fs.writeFileSync(LOG, JSON.stringify(log, null, 2));

  console.log(`[SEO Pinger] Done. Logged to ${LOG}`);
}

main().catch(e => console.error(e));
