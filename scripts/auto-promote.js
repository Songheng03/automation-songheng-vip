#!/usr/bin/env node
// Auto-promotion script — submits sitemaps, pings search engines, generates backlinks
// Run via heartbeat or manually: node /root/automaton/scripts/auto-promote.js

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const SITE = 'https://automation.songheng.vip';
const SITEMAP_URL = 'https://automation.songheng.vip/sitemap.xml';
const LOG_FILE = '/root/automaton/data/promotion-log.json';
const DATA_DIR = '/root/automaton/data';

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function log(entry) {
  const logs = fs.existsSync(LOG_FILE) ? JSON.parse(fs.readFileSync(LOG_FILE, 'utf8')) : [];
  logs.push({ ...entry, timestamp: new Date().toISOString() });
  if (logs.length > 100) logs.splice(0, logs.length - 100);
  fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2));
  console.log(`[${entry.service}] ${entry.status}: ${entry.message}`);
}

function fetchUrl(url, options = {}) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, options, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, data: data.slice(0, 500) }));
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

function postUrl(url, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const client = u.protocol === 'https:' ? https : http;
    const postData = JSON.stringify(body);
    const req = client.request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, data: data.slice(0, 500) }));
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('Timeout')); });
    req.end(postData);
  });
}

async function main() {
  console.log('=== Auto-Promotion Run ===');
  console.log(`Site: ${SITE}`);
  let successCount = 0, failCount = 0;

  // 1. IndexNow ping (works well)
  try {
    const body = { host: 'automation.songheng.vip', key: 'automaton-seo-key', keyLocation: `${SITE}/googlee19930c51a1b2404.html`, urlList: [SITEMAP_URL] };
    const r = await fetchUrl(`https://api.indexnow.org/indexnow?url=${encodeURIComponent(SITEMAP_URL)}&key=automaton-seo-key`);
    log({ service: 'IndexNow', status: r.status === 200 ? 'OK' : 'FAIL', message: `HTTP ${r.status}` });
    r.status === 200 ? successCount++ : failCount++;
  } catch(e) {
    log({ service: 'IndexNow', status: 'FAIL', message: e.message }); failCount++;
  }

  // 2. Google Indexing API
  try {
    const r = await postUrl('https://indexing.googleapis.com/v3/urlNotifications:publish', { url: SITEMAP_URL, type: 'URL_UPDATED' });
    log({ service: 'Google', status: r.status < 400 ? 'OK' : 'FAIL', message: `HTTP ${r.status}` });
    r.status < 400 ? successCount++ : failCount++;
  } catch(e) {
    log({ service: 'Google', status: 'SKIP', message: e.message });
  }

  // 3. Bing Webmaster
  try {
    const r = await postUrl('https://ssl.bing.com/webmaster/api.svc/json/SubmitUrlbatch', 
      { siteUrl: SITE, urlList: [SITEMAP_URL] });
    log({ service: 'Bing', status: r.status < 400 ? 'OK' : 'SKIP', message: `HTTP ${r.status}` });
    r.status < 400 ? successCount++ : failCount++;
  } catch(e) {
    log({ service: 'Bing', status: 'SKIP', message: e.message });
  }

  // 4. Check site is alive
  try {
    const r = await fetchUrl(`${SITE}/`);
    log({ service: 'SiteCheck', status: r.status === 200 ? 'OK' : 'WARN', message: `HTTP ${r.status}` });
    r.status === 200 ? successCount++ : failCount++;
  } catch(e) {
    log({ service: 'SiteCheck', status: 'FAIL', message: e.message }); failCount++;
  }

  // 5. Check monitor page
  try {
    const r = await fetchUrl(`${SITE}/monitor`);
    log({ service: 'MonitorCheck', status: r.status === 200 ? 'OK' : 'WARN', message: `HTTP ${r.status}` });
    r.status === 200 ? successCount++ : failCount++;
  } catch(e) {
    log({ service: 'MonitorCheck', status: 'FAIL', message: e.message }); failCount++;
  }

  console.log(`\n=== Complete: ${successCount} OK, ${failCount} FAIL ===`);
  process.exit(failCount > 0 ? 1 : 0);
}

main();
