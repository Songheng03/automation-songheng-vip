#!/usr/bin/env node
/**
 * Search Engine Pinger v2
 * Pings major search engines every 2 hours to keep URLs indexed.
 */

const fs = require('fs');
const http = require('http');
const https = require('https');

const DOMAIN = 'automation.songheng.vip';
const SITE = 'https://' + DOMAIN;
const LOG_FILE = '/root/automaton/data/ping-log.json';

function postJSON(url, data) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const client = u.protocol === 'https:' ? https : http;
    const body = JSON.stringify(data);
    const opts = {
      hostname: u.hostname,
      port: u.port || 443,
      path: u.pathname + u.search,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    };
    const req = client.request(opts, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, data: d.slice(0, 200) }));
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('timeout')); });
    req.write(body);
    req.end();
  });
}

function getURL(url) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const client = u.protocol === 'https:' ? https : http;
    const opts = { hostname: u.hostname, path: u.pathname + u.search, method: 'GET', timeout: 8000 };
    const req = client.get(opts, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode }));
    });
    req.on('error', reject);
    req.setTimeout(8000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

async function main() {
  console.log(`[${new Date().toISOString()}] Pinging search engines...`);
  const results = [];

  // IndexNow
  try {
    const r = await postJSON('https://api.indexnow.org/indexnow', {
      host: DOMAIN,
      key: 'seo-index-key-2024',
      keyLocation: `${SITE}/seo-index-key-2024.txt`,
      urlList: [`${SITE}/`, `${SITE}/blog.html`, `${SITE}/api-docs.html`, `${SITE}/api-integration.html`]
    });
    results.push({ engine: 'IndexNow', status: r.status });
    console.log(`  IndexNow: ${r.status}`);
  } catch(e) {
    results.push({ engine: 'IndexNow', error: e.message });
    console.log(`  IndexNow: ERROR ${e.message}`);
  }

  // Google
  try {
    const r = await getURL(`https://www.google.com/ping?sitemap=${SITE}/sitemap.xml`);
    results.push({ engine: 'Google', status: r.status });
    console.log(`  Google: ${r.status}`);
  } catch(e) {
    results.push({ engine: 'Google', error: e.message });
    console.log(`  Google: ERROR ${e.message}`);
  }

  // Bing
  try {
    const r = await getURL(`https://www.bing.com/ping?sitemap=${SITE}/sitemap.xml`);
    results.push({ engine: 'Bing', status: r.status });
    console.log(`  Bing: ${r.status}`);
  } catch(e) {
    results.push({ engine: 'Bing', error: e.message });
    console.log(`  Bing: ERROR ${e.message}`);
  }

  // Yandex
  try {
    const r = await getURL(`https://webmaster.yandex.com/ping?sitemap=${SITE}/sitemap.xml`);
    results.push({ engine: 'Yandex', status: r.status });
    console.log(`  Yandex: ${r.status}`);
  } catch(e) {
    results.push({ engine: 'Yandex', error: e.message });
    console.log(`  Yandex: ERROR ${e.message}`);
  }

  // Log results
  fs.mkdirSync('/root/automaton/data', { recursive: true });
  let log = [];
  try { 
    const raw = fs.readFileSync(LOG_FILE, 'utf8');
    log = JSON.parse(raw);
    if (!Array.isArray(log)) log = [];
  } catch(e) { log = []; }
  
  log.push({ timestamp: new Date().toISOString(), results });
  if (log.length > 100) log = log.slice(-100);
  fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2));
  console.log(`\n✅ Logged (${log.length} entries)`);
}

main().catch(e => console.error('FATAL:', e.message));
