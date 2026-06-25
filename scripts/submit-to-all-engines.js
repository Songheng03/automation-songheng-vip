#!/usr/bin/env node
// submit-to-all-search-engines.js — submits sitemap to Google, Bing, Yandex, IndexNow, DuckDuckGo
// Run: node /root/automaton/scripts/submit-to-all-engines.js
// Records results in /root/automaton/data/search-engine-submissions.json

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const DOMAIN = 'automation.songheng.vip';
const SITEMAP_URL = `https://${DOMAIN}/sitemap.xml`;
const INDEXNOW_KEY = '';  // IndexNow key if we have one

const RESULTS_PATH = '/root/automaton/data/search-engine-submissions.json';
const LOG_PATH = '/root/automaton/data/submission-log.txt';

function log(msg) {
  const ts = new Date().toISOString();
  const line = `[${ts}] ${msg}`;
  console.log(line);
  fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
  fs.appendFileSync(LOG_PATH, line + '\n');
}

function fetch(url, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http;
    const parsed = new URL(url);
    const opts = {
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method,
      headers: { 'User-Agent': 'my-automaton-SEO/1.0' },
      timeout: 15000
    };
    if (body) {
      opts.headers['Content-Type'] = method === 'GET' ? undefined : 'application/xml';
      opts.headers['Content-Length'] = Buffer.byteLength(body);
    }
    const req = proto.request(opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data.slice(0, 500) }));
    });
    req.on('error', e => reject(e));
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    if (body) req.write(body);
    req.end();
  });
}

async function submit() {
  log(`=== Submitting sitemap to search engines ===`);
  log(`Sitemap: ${SITEMAP_URL}`);

  const results = {};
  fs.mkdirSync(path.dirname(RESULTS_PATH), { recursive: true });

  // 1. Google (via ping)
  try {
    const r = await fetch(`https://www.google.com/ping?sitemap=${encodeURIComponent(SITEMAP_URL)}`);
    results.google = { status: r.status, body: r.body };
    log(`Google ping: ${r.status} ${r.body.slice(0,100)}`);
  } catch(e) { results.google = { error: e.message }; log(`Google error: ${e.message}`); }

  // 2. Bing
  try {
    const r = await fetch(`https://www.bing.com/ping?sitemap=${encodeURIComponent(SITEMAP_URL)}`);
    results.bing = { status: r.status, body: r.body };
    log(`Bing ping: ${r.status} ${r.body.slice(0,100)}`);
  } catch(e) { results.bing = { error: e.message }; log(`Bing error: ${e.message}`); }

  // 3. Yandex
  try {
    const r = await fetch(`https://webmaster.yandex.com/api/v2/sitemaps?host=${encodeURIComponent(DOMAIN)}&url=${encodeURIComponent(SITEMAP_URL)}`);
    results.yandex = { status: r.status, body: r.body };
    log(`Yandex: ${r.status} ${r.body.slice(0,100)}`);
  } catch(e) { results.yandex = { error: e.message }; log(`Yandex error: ${e.message}`); }

  // 4. IndexNow
  try {
    const payload = JSON.stringify({
      host: DOMAIN,
      key: INDEXNOW_KEY || DOMAIN,
      keyLocation: `https://${DOMAIN}/${INDEXNOW_KEY || 'indexnow'}.txt`,
      urlList: [SITEMAP_URL]
    });
    const r = await fetch('https://api.indexnow.org/indexnow', 'POST', payload);
    results.indexnow = { status: r.status, body: r.body };
    log(`IndexNow: ${r.status} ${r.body.slice(0,100)}`);
  } catch(e) { results.indexnow = { error: e.message }; log(`IndexNow error: ${e.message}`); }

  // 5. DuckDuckGo — no public API, but we can ping their crawler
  try {
    const r = await fetch(`https://duckduckgo.com/?q=site:${DOMAIN}`);
    results.duckduckgo = { status: r.status, note: 'No submission API, pinged search' };
    log(`DuckDuckGo: ${r.status}`);
  } catch(e) { results.duckduckgo = { error: e.message }; }

  // Save results
  const output = { timestamp: new Date().toISOString(), domain: DOMAIN, sitemap: SITEMAP_URL, results };
  fs.writeFileSync(RESULTS_PATH, JSON.stringify(output, null, 2));
  log(`Results saved to ${RESULTS_PATH}`);

  // Summary
  const successCount = Object.values(results).filter(r => r.status >= 200 && r.status < 400).length;
  log(`=== Done: ${successCount}/${Object.keys(results).length} search engines pinged ===`);
}

submit().catch(e => {
  log(`FATAL: ${e.message}`);
  process.exit(1);
});
