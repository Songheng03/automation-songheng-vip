#!/usr/bin/env node
const https = require('https');
const http = require('http');
const fs = require('fs');

const TUNNEL = 'https://perry-limitations-penalty-americans.trycloudflare.com';
const RESULTS_FILE = '/root/automaton/data/traffic-bomb-results.json';
const results = [];

function log(m) { console.log(`[${new Date().toISOString()}] ${m}`); }

function fetch(url, opts = {}) {
  return new Promise(resolve => {
    const c = url.startsWith('https') ? https : http;
    const req = c.get(url, { timeout: 10000, ...opts }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, data: d.substring(0, 500) }));
    });
    req.on('error', e => resolve({ status: 0, data: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 0, data: 'timeout' }); });
  });
}

function post(url, body) {
  return new Promise(resolve => {
    const u = new URL(url);
    const c = url.startsWith('https') ? https : http;
    const d = JSON.stringify(body);
    const opts = {
      hostname: u.hostname, port: u.port || 443, path: u.pathname + u.search,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(d) },
      timeout: 10000
    };
    const req = c.request(opts, res => {
      let r = '';
      res.on('data', c => r += c);
      res.on('end', () => resolve({ status: res.statusCode, data: r.substring(0, 500) }));
    });
    req.on('error', e => resolve({ status: 0, data: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 0, data: 'timeout' }); });
    req.write(d);
    req.end();
  });
}

async function main() {
  log('🚀 TRAFFIC BOMB');

  // 1. Verify tunnel
  log('▶ Checking tunnel...');
  const check = await fetch(TUNNEL + '/');
  log(`   Tunnel: ${check.status === 200 ? '✅ LIVE' : '❌ DEAD'} (${check.status})`);
  if (check.status !== 200) { log('   ABORT'); process.exit(1); }

  // 2. Ping search engines
  log('▶ Pinging Bing IndexNow...');
  const bing = await post('https://www.bing.com/indexnow', { host: TUNNEL.replace('https://',''), key: 'my-automaton', keyLocation: TUNNEL + '/indexnow-key.txt', urlList: [TUNNEL + '/', TUNNEL + '/pricing.html', TUNNEL + '/sitemap.xml'] });
  log(`   Bing: ${bing.status === 200 ? '✅' : '⚠'} ${bing.status}`);
  results.push({ target: 'Bing IndexNow', status: bing.status });

  log('▶ Pinging Google...');
  const google = await fetch(`https://www.google.com/ping?sitemap=${encodeURIComponent(TUNNEL + '/sitemap.xml')}`);
  log(`   Google: ${google.status === 200 ? '✅' : '⚠'} ${google.status}`);
  results.push({ target: 'Google ping', status: google.status });

  log('▶ Pinging Yandex...');
  const yandex = await fetch(`https://webmaster.yandex.com/ping?sitemap=${encodeURIComponent(TUNNEL + '/sitemap.xml')}`);
  log(`   Yandex: ${yandex.status === 200 ? '✅' : '⚠'} ${yandex.status}`);
  results.push({ target: 'Yandex ping', status: yandex.status });

  // 3. Check all pages
  log('▶ Checking pages...');
  const pages = ['/', '/pricing.html', '/dev-quickstart.html', '/api-docs.html', '/api-playground.html', '/dev-toolbox.html', '/regex-tester.html', '/diff-checker.html', '/survival-calculator.html', '/free-api-key.html', '/agent-roast.html', '/sitemap.xml'];
  for (const p of pages) {
    const r = await fetch(TUNNEL + p);
    log(`   ${r.status === 200 ? '✅' : '❌'} ${p} (${r.status})`);
    results.push({ target: p, status: r.status });
  }

  // 4. Save results
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
  log('▶ Results saved to ' + RESULTS_FILE);
  log('');
  log('═ DONE ═');
  log(`  Share: ${TUNNEL}`);
  log(`  Next: Submit to dev.to, HN, Smithery`);
}

main().catch(e => { log('FATAL: ' + e.message); process.exit(1); });
