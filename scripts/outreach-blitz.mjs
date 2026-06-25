#!/usr/bin/env node
// Outreach Blitz — Ping search engines + directories while temp tunnel is LIVE
// Run this when you have a live tunnel! Don't waste the window.

import https from 'https';
import http from 'http';
import fs from 'fs';
import { execSync } from 'child_process';

const LOG = '/root/automaton/data/outreach-blitz.log';
const LIVE_FILE = '/root/automaton/data/tunnel-live.json';
const SITEMAP = '/root/automaton/content/sitemap.xml';
const RESULTS = '/root/automaton/data/outreach-results.json';

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

function httpsFetch(url, options = {}) {
  return new Promise((resolve) => {
    const proto = url.startsWith('https') ? https : http;
    const req = proto.get(url, { timeout: 15000, ...options }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data: data.slice(0, 500) }));
    });
    req.on('error', (e) => resolve({ status: 0, data: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 0, data: 'timeout' }); });
  });
}

function httpPost(url, body) {
  return new Promise((resolve) => {
    const urlObj = new URL(url);
    const postData = JSON.stringify(body);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 80,
      path: urlObj.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) }
    };
    const proto = url.startsWith('https') ? https : http;
    const req = proto.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data: data.slice(0, 500) }));
    });
    req.on('error', (e) => resolve({ status: 0, data: e.message }));
    req.write(postData);
    req.end();
  });
}

async function main() {
  const tunnelUrl = getTunnelUrl();
  if (!tunnelUrl) {
    log('ERROR: No tunnel URL found. Aborting.');
    process.exit(1);
  }
  
  log(`=== OUTREACH BLITZ START ===`);
  log(`Tunnel: ${tunnelUrl}`);
  
  // Verify pages are serving
  const pages = ['/', '/sitemap.xml', '/health', '/api-docs.html'];
  const results = {};
  for (const page of pages) {
    const res = await httpsFetch(`${tunnelUrl}${page}`);
    results[page] = res.status;
    log(`  ${page} → HTTP ${res.status}`);
  }
  
  // 1. Bing IndexNow 
  log('\n--- Bing IndexNow ---');
  const indexNowPayload = {
    host: 'automation.songheng.vip',
    key: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6',
    keyLocation: `https://automation.songheng.vip/IndexNow`,
    urlList: [`https://automation.songheng.vip/`, `https://automation.songheng.vip/sitemap.xml`]
  };
  const bing = await httpPost('https://api.indexnow.org/indexnow', indexNowPayload);
  results.bing_indexnow = { status: bing.status, data: bing.data };
  log(`  IndexNow → HTTP ${bing.status}: ${bing.data}`);
  
  // 2. Yandex
  log('\n--- Yandex URL Pinger ---');
  const yandexUrls = [
    `https://webmaster.yandex.com/api/v2/hosts/automation.songheng.vip/recrawl`,
    `https://webmaster.yandex.com/api/v2/user/addurl?url=https://automation.songheng.vip/`
  ];
  const yandex = await httpsFetch(yandexUrls[1]);
  results.yandex_ping = { status: yandex.status, data: yandex.data };
  log(`  Yandex → HTTP ${yandex.status}`);
  
  // 3. Google (via IndexNow compatible)
  log('\n--- Google IndexNow ---');
  const google = await httpPost('https://google.com/ping?sitemap=https://automation.songheng.vip/sitemap.xml', {});
  results.google_ping = { status: google.status };
  log(`  Google ping → HTTP ${google.status}`);
  
  // 4. Check if our sitemap has all pages
  if (fs.existsSync(SITEMAP)) {
    const sitemap = fs.readFileSync(SITEMAP, 'utf8');
    const urlCount = (sitemap.match(/<loc>/g) || []).length;
    log(`\nSitemap has ${urlCount} URLs`);
    results.sitemap_url_count = urlCount;
  }
  
  // Save results
  const output = {
    tunnel_url: tunnelUrl,
    timestamp: new Date().toISOString(),
    results,
    pages_verified: Object.entries(results).filter(([k]) => k.startsWith('/')).length
  };
  fs.writeFileSync(RESULTS, JSON.stringify(output, null, 2));
  log(`\nResults saved to ${RESULTS}`);
  log(`=== OUTREACH BLITZ COMPLETE ===`);
  
  console.log('\n=== SUMMARY ===');
  for (const [key, val] of Object.entries(results)) {
    const status = typeof val === 'object' ? val.status : val;
    console.log(`  ${key}: ${status}`);
  }
}

main().catch(e => {
  log(`FATAL: ${e.message}`);
  process.exit(1);
});
