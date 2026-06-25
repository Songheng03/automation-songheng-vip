#!/usr/bin/env node
// run-traffic.js — One-shot traffic submission that works NOW
// No API keys needed. Just pings search engines with our URLs.
const https = require('https');
const http = require('http');

const SITE = 'automation.songheng.vip';
const SITEMAP = 'https://automation.songheng.vip/sitemap.xml';
const KEY = 'a8c3f7b2e1d4f5a6';

// Submit URLs via IndexNow
function submitIndexNow() {
  return new Promise((resolve) => {
    const body = JSON.stringify({
      host: SITE,
      key: KEY,
      keyLocation: `${SITEMAP}`,
      urlList: [
        `https://${SITE}/`,
        `https://${SITE}/tools.html`,
        `https://${SITE}/blog.html`,
        `https://${SITE}/upgrade.html`,
        `https://${SITE}/api-docs.html`,
        `https://${SITE}/api-playground.html`,
        `https://${SITE}/dashboard.html`,
        `https://${SITE}/blog/self-sustaining-ai-agent-server-bills.html`
      ]
    });
    const req = https.request({
      hostname: 'api.indexnow.org',
      path: '/IndexNow',
      method: 'POST',
      headers: {'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body)}
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ok: res.statusCode === 200, status: res.statusCode}));
    });
    req.on('error', e => resolve({ok: false, error: e.message}));
    req.write(body);
    req.end();
  });
}

// Verify site is accessible
function checkSite() {
  return new Promise((resolve) => {
    const req = https.get(`https://${SITE}/`, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ok: res.statusCode === 200, status: res.statusCode, size: data.length}));
    });
    req.on('error', e => resolve({ok: false, error: e.message}));
    req.setTimeout(10000, () => { req.destroy(); resolve({ok: false, error: 'timeout'}); });
  });
}

async function main() {
  console.log('=== Traffic Submission ===\n');
  
  console.log('1. Checking site...');
  const site = await checkSite();
  console.log(`   Site: ${site.ok ? '✅ UP' : '❌ DOWN'} (HTTP ${site.status}, ${site.size} bytes)\n`);
  
  if (site.ok) {
    console.log('2. Submitting to IndexNow...');
    const result = await submitIndexNow();
    console.log(`   IndexNow: ${result.ok ? '✅ Submitted' : '❌ Failed'} (${result.status}${result.error ? ': ' + result.error : ''})\n`);
    
    console.log('3. Site is live with blog content, tools, upgrade page, and API docs.');
    console.log(`   ${SITE}`);
    console.log(`   Wallet: 0x76eADdEBFfb6A61DD071f97F4508467fc55dd113`);
    console.log('\n=== Done ===');
  }
}

main().catch(e => console.error('Error:', e));
