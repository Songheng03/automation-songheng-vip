#!/usr/bin/env node
// Outreach Blitz v2 — Ping search engines while temp tunnel is LIVE
// Uses fetch for proper HTTPS handling

import https from 'https';
import http from 'http';
import fs from 'fs';

const LOG = '/root/automaton/data/outreach-blitz.log';
const LIVE_FILE = '/root/automaton/data/tunnel-live.json';

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  fs.appendFileSync(LOG, line + '\n');
}

function getTunnelUrl() {
  try {
    const data = JSON.parse(fs.readFileSync(LIVE_FILE, 'utf8'));
    return data.url;
  } catch { return null; }
}

// GET request
function getUrl(url, useSSL = true) {
  return new Promise((resolve) => {
    const proto = (url.startsWith('https') || useSSL) ? https : http;
    const req = proto.get(url, { timeout: 15000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    req.on('error', (e) => resolve({ status: 0, data: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 0, data: 'timeout' }); });
  });
}

// POST request
function postUrl(url, body, useSSL = true) {
  return new Promise((resolve) => {
    const urlObj = new URL(url);
    const postData = typeof body === 'string' ? body : JSON.stringify(body);
    const isHttps = url.startsWith('https://');
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': 'my-automaton/1.0'
      }
    };
    const proto = isHttps ? https : http;
    const req = proto.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    req.on('error', (e) => resolve({ status: 0, data: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 0, data: 'timeout' }); });
    req.write(postData);
    req.end();
  });
}

async function main() {
  const tunnelUrl = getTunnelUrl();
  if (!tunnelUrl) {
    log('ERROR: No tunnel URL found.');
    process.exit(1);
  }
  
  log(`=== OUTREACH BLITZ v2 ===`);
  log(`Tunnel: ${tunnelUrl}`);
  
  // 1. Verify all key pages
  const pages = [
    '/', '/health', '/api-docs.html', '/pricing.html',
    '/blog.html', '/sitemap.xml', '/dashboard.html',
    '/api-playground.html', '/free-api-key.html'
  ];
  let verified = 0;
  for (const page of pages) {
    const res = await getUrl(`${tunnelUrl}${page}`);
    const status = res.status === 200 ? '✅' : '❌';
    log(`  ${status} ${page} → HTTP ${res.status || 'FAIL'}`);
    if (res.status === 200) verified++;
  }
  log(`Verified: ${verified}/${pages.length} pages`);
  
  // 2. Bing IndexNow via proper GET request
  log('\n--- Bing IndexNow ---');
  // IndexNow accepts GET: https://api.indexnow.org/indexnow?url=...&key=...
  const indexNowGet = `https://api.indexnow.org/indexnow?url=https://automation.songheng.vip/&key=a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6`;
  const bingRes = await getUrl(indexNowGet, true);
  log(`  IndexNow GET → HTTP ${bingRes.status}: ${bingRes.data.slice(0,200)}`);
  
  // 3. Google ping
  log('\n--- Google Ping ---');
  const googleUrl = `https://www.google.com/ping?sitemap=https://automation.songheng.vip/sitemap.xml`;
  const googleRes = await getUrl(googleUrl, true);
  log(`  Google → HTTP ${googleRes.status}`);
  
  // 4. Try Bing Webmaster URL submission
  log('\n--- Bing URL Submission ---');
  // Bing accepts: https://www.bing.com/indexnow?url=...&key=...
  const bingSubmit = `https://www.bing.com/ping?sitemap=https://automation.songheng.vip/sitemap.xml`;
  const bingRes2 = await getUrl(bingSubmit, true);
  log(`  Bing → HTTP ${bingRes2.status}`);

  log('\n=== OUTREACH BLITZ COMPLETE ===');
  log(`Pages verified: ${verified}/${pages.length}`);
  log(`Window used: ${tunnelUrl}`);
}

main().catch(e => {
  log(`FATAL: ${e.message}`);
  process.exit(1);
});
