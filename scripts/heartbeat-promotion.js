#!/usr/bin/env node
/**
 * heartbeat-promotion.js
 * Runs every 6 hours via heartbeat system.
 * Pings search engines, generates demo traffic, reports stats.
 * 
 * Called by: heartbeat 'promote-seo'
 */

const https = require('https');

const GATEWAY = 'https://automation.songheng.vip';
const DEMO_TEXT = 'Artificial intelligence has revolutionized how developers write and review code. Modern AI-powered tools can analyze millions of lines per second, detecting bugs, security vulnerabilities, and performance issues that human reviewers might miss.';

async function fetch(url) {
  return new Promise((resolve) => {
    const req = https.get(url, { timeout: 10000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    req.on('error', e => resolve({ status: 0, error: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 0, error: 'timeout' }); });
  });
}

async function post(url, body) {
  return new Promise((resolve) => {
    try {
      const data = JSON.stringify(body);
      const urlObj = new URL(url);
      const req = https.request(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
        timeout: 10000,
      }, (res) => {
        let response = '';
        res.on('data', chunk => response += chunk);
        res.on('end', () => resolve({ status: res.statusCode, data: response }));
      });
      req.on('error', e => resolve({ status: 0, error: e.message }));
      req.on('timeout', () => { req.destroy(); resolve({ status: 0, error: 'timeout' }); });
      req.write(data);
      req.end();
    } catch(e) { resolve({ status: 0, error: e.message }); }
  });
}

async function main() {
  const start = Date.now();
  const results = { pings: [], demos: [], timestamp: new Date().toISOString() };
  
  // 1. Health check
  const health = await fetch(`${GATEWAY}/api/health`);
  results.healthy = health.status === 200;
  console.log(`[HEARTBEAT] Health: ${results.healthy ? 'OK' : 'FAIL'} (${health.status})`);
  
  if (!results.healthy) {
    console.log('[HEARTBEAT] Gateway down, cannot continue');
    process.exit(1);
  }
  
  // 2. SEO ping - IndexNow
  const indexNowBody = {
    host: 'automation.songheng.vip',
    key: 'my-automaton-index-key',
    keyLocation: `${GATEWAY}/indexnow-key.txt`,
    urlList: [GATEWAY, `${GATEWAY}/api-docs`, `${GATEWAY}/upgrade`, `${GATEWAY}/smithery-manifest`],
  };
  const seo = await post('https://api.indexnow.org/indexnow', indexNowBody);
  results.pings.push({ engine: 'IndexNow', status: seo.status });
  console.log(`[HEARTBEAT] IndexNow ping: ${seo.status}`);
  
  // 3. Demo traffic (2 free tier calls)
  const demo1 = await post(`${GATEWAY}/free/analyze`, { text: DEMO_TEXT });
  results.demos.push({ endpoint: '/free/analyze', status: demo1.status });
  
  const demo2 = await post(`${GATEWAY}/free/summarize`, { text: DEMO_TEXT, length: 'short' });
  results.demos.push({ endpoint: '/free/summarize', status: demo2.status });
  
  // 4. Report
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`[HEARTBEAT] Demos: ${demo1.status}, ${demo2.status} | Elapsed: ${elapsed}s`);
  console.log(`[HEARTBEAT] Complete at ${results.timestamp}`);
  
  // Write status file
  const fs = require('fs');
  fs.writeFileSync('/tmp/heartbeat-promotion.json', JSON.stringify(results, null, 2));
}

main().catch(e => console.error('[HEARTBEAT] Error:', e.message));
