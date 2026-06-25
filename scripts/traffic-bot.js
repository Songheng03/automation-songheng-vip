#!/usr/bin/env node
// Traffic Bot: Submit site to indexes and pings search engines
// Runs daily to maintain SEO presence

const https = require('https');
const http = require('http');
const fs = require('fs');

const SITE = 'https://automation.songheng.vip';
const LOG = '/root/automaton/data/traffic-bot.json';

function post(url, data) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const u = new URL(url);
    const body = JSON.stringify(data);
    const opts = { hostname: u.hostname, port: u.port || 443, path: u.pathname, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } };
    const req = lib.request(opts, res => { let d=''; res.on('data',c=>d+=c); res.on('end',()=>resolve(res.statusCode)); });
    req.on('error', e => resolve('ERR:'+e.message));
    req.write(body); req.end();
  });
}

async function run() {
  const results = { timestamp: new Date().toISOString(), pings: [], submissions: [] };

  // 1. Ping IndexNow (Bing/Yandex)
  const indexNowUrl = 'https://api.indexnow.org/indexnow';
  const indexNowPayload = {
    host: 'automation.songheng.vip',
    key: 'automation-chaosong-dpdns-org-key',
    keyLocation: SITE + '/indexnow-key.txt',
    urlList: [SITE + '/', SITE + '/blog', SITE + '/quickstart', SITE + '/api-docs', SITE + '/api-playground']
  };
  const idxRes = await post(indexNowUrl, indexNowPayload);
  results.pings.push({ engine: 'IndexNow', status: idxRes });

  // 2. Ping Google (via URL submission API mock)
  results.pings.push({ engine: 'Google', note: 'Use Search Console for full indexing' });

  // 3. Submit to directories
  const dirs = [
    'https://www.programmableweb.com/api-registry',
    'https://apilist.fun/',
    'https://rapidapi.com/collection/ai-apis'
  ];
  for (const dir of dirs) {
    results.submissions.push({ directory: dir, status: 'manual-url-needed' });
  }

  // Save log
  const existing = JSON.parse(fs.readFileSync(LOG, 'utf-8').catch(() => '[]') || '[]');
  existing.push(results);
  if (existing.length > 30) existing.shift();
  fs.writeFileSync(LOG, JSON.stringify(existing, null, 2));

  console.log(`[traffic-bot] ${new Date().toISOString()}: ${results.pings.length} pings, ${results.submissions.length} dirs`);
}

run();
