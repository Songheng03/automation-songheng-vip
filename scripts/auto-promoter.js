#!/usr/bin/env node
// Auto-Promoter — Drives traffic to my-automaton services
// Runs: pushes sitemap updates, social sharing, directory pings
// Uses existing services, doesn't need new ports

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const SITE = 'https://automation.songheng.vip';
const LOG_FILE = '/root/automaton/data/promoter-log.json';

function log(data) {
  const logs = fs.existsSync(LOG_FILE) ? JSON.parse(fs.readFileSync(LOG_FILE,'utf-8')) : [];
  logs.push({...data, ts: new Date().toISOString()});
  if (logs.length > 1000) logs.splice(0, logs.length - 1000);
  fs.writeFileSync(LOG_FILE, JSON.stringify(logs,null,2));
  console.log(`[${new Date().toISOString()}] ${data.action}: ${data.result}`);
}

function fetch(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function post(url, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const client = url.startsWith('https') ? https : http;
    const data = JSON.stringify(body);
    const req = client.request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, data: d }));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('timeout')); });
    req.end(data);
  });
}

// 1. Ping IndexNow (Bing/Yandex/Seznam)
async function pingIndexNow() {
  try {
    const keyPath = '/root/automaton/data/indexnow-key.txt';
    const key = fs.existsSync(keyPath) ? fs.readFileSync(keyPath,'utf-8').trim() : 'automaton-key-' + Date.now().toString(36);
    if (!fs.existsSync(keyPath)) fs.writeFileSync(keyPath, key);

    // Get sitemap URLs
    const sitemapRes = await fetch(`${SITE}/sitemap.xml`);
    if (sitemapRes.status !== 200) return { action:'ping-indexnow', result:`sitemap fetch: ${sitemapRes.status}` };
    
    // Extract URLs from sitemap
    const urls = [...sitemapRes.data.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);
    const batch = urls.slice(0, 100); // IndexNow max 100
    
    // Ping IndexNow API
    const res = await post('https://api.indexnow.org/indexnow', {
      host: 'automation.songheng.vip',
      key,
      keyLocation: `${SITE}/.well-known/now.txt`,
      urlList: batch
    });
    return { action:'ping-indexnow', result:`${res.status} - ${batch.length} URLs` };
  } catch(e) {
    return { action:'ping-indexnow', result:`error: ${e.message}` };
  }
}

// 2. Ping Google Web Search (if we had API key)
async function pingGoogle() {
  return { action:'ping-google', result:'skipped (no API key - submit manually at Google Search Console)' };
}

// 3. Ping Bing Webmaster
async function pingBing() {
  try {
    // Try multiple Bing ping endpoints
    const endpoints = [
      `https://www.bing.com/ping?siteMap=${encodeURIComponent(SITE+'/sitemap.xml')}`,
      `https://api.bing.com/webmaster/api.svc/json/SubmitSite?siteUrl=${encodeURIComponent(SITE)}`
    ];
    for (const url of endpoints) {
      try {
        const res = await fetch(url);
        log({ action:'ping-bing', result:`${res.status} - ${url.slice(0,60)}` });
      } catch(e) {}
    }
  } catch(e) {}
}

// 4. Promote on agent directories (free listings)
async function promoteOnDirectories() {
  const directories = [
    { url: 'https://api.agentdirectory.com/v1/submit', body: { name:'my-automaton', url:SITE, wallet:'0x76eADdEBFfb6A61DD071f97F4508467fc55dd113', services:['text-analysis','code-review','security-scan','summarization'] } },
    { url: 'https://agent.catalog/api/register', body: { agent:'my-automaton', endpoint:SITE, capabilities:['ai-code-review','security-scan','text-analysis'] } }
  ];
  
  const results = [];
  for (const dir of directories) {
    try {
      const res = await post(dir.url, dir.body);
      results.push({ url: dir.url, status: res.status });
    } catch(e) {
      results.push({ url: dir.url, error: e.message });
    }
  }
  return { action:'promote-directories', result: JSON.stringify(results) };
}

// 5. Generate and submit backlinks report
async function generateBacklinkReport() {
  try {
    const visitorsPath = '/root/automaton/data/visitors.json';
    if (!fs.existsSync(visitorsPath)) return { action:'backlink-report', result:'no visitors data' };
    const visitors = JSON.parse(fs.readFileSync(visitorsPath, 'utf-8'));
    const referrers = {};
    for (const v of visitors) {
      if (v.referrer && v.referrer !== '') {
        const host = v.referrer.replace(/https?:\/\//,'').split('/')[0];
        referrers[host] = (referrers[host]||0) + 1;
      }
    }
    return { action:'backlink-report', result: `referrers: ${JSON.stringify(referrers)}` };
  } catch(e) {
    return { action:'backlink-report', result:`error: ${e.message}` };
  }
}

// 6. Submit to free SEO ping services
async function pingSeoServices() {
  const services = [
    `http://www.google.com/ping?sitemap=${encodeURIComponent(SITE+'/sitemap.xml')}`,
    `http://ping.feedburner.com/ping?url=${encodeURIComponent(SITE)}`,
    `http://rpc.pingomatic.com/rpc/ping/${encodeURIComponent(SITE)}`,
    `http://blogsearch.google.com/ping/RPC2`
  ];
  
  const results = [];
  for (const svc of services) {
    try {
      const res = await fetch(svc);
      results.push({ service: svc.slice(0,40), status: res.status });
    } catch(e) {
      results.push({ service: svc.slice(0,40), error: e.message });
    }
  }
  return { action:'ping-seo-services', result: JSON.stringify(results) };
}

// === RUN ALL ===
async function runAll() {
  console.log('=== Auto-Promoter Run ===');
  console.log(`Site: ${SITE}`);
  
  const actions = [
    pingIndexNow(),
    pingBing(),
    pingSeoServices(),
    generateBacklinkReport()
  ];
  
  const results = await Promise.allSettled(actions);
  for (const r of results) {
    if (r.status === 'fulfilled' && r.value) {
      log(r.value);
    } else if (r.status === 'rejected') {
      log({ action:'unknown', result:`rejected: ${r.reason?.message}` });
    }
  }
  
  console.log('=== Done ===');
}

// Run if executed directly
if (require.main === module) {
  runAll().then(() => process.exit(0));
}

module.exports = { runAll, pingIndexNow, pingSeoServices };
