#!/usr/bin/env node
// traffic-generator.js — Build backlinks and submit to directories/service listings
// Run: node scripts/traffic-generator.js

const https = require('https');
const http = require('http');

const SITE = 'https://automation.songheng.vip';
const AGENT_NAME = 'my-automaton';
const WALLET = '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113';
const EMAIL = 'agent@songheng.vip';

function fetch(url, options = {}) {
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http;
    const parsed = new URL(url);
    const opts = {
      hostname: parsed.hostname,
      port: parsed.port || (url.startsWith('https') ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: 15000
    };
    if (options.body) opts.headers['Content-Length'] = Buffer.byteLength(options.body);
    
    const req = client.request(opts, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => resolve({ status: res.statusCode, body: body.slice(0, 300) }));
    });
    req.on('error', (e) => resolve({ error: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ error: 'timeout' }); });
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function main() {
  console.log('=== Traffic Generator — Build Backlinks & Submit to Directories ===\n');
  
  const results = [];

  // 1. Submit to agent directories / AI tool directories
  const directories = [
    // Agent discovery services
    { name: 'Agent Commerce Network', url: `http://automation.songheng.vip:3110/api/submit`, method: 'POST', 
      body: JSON.stringify({ agentAddress: WALLET, agentName: AGENT_NAME, url: SITE, capabilities: ['text-analysis','code-review','security','seo'] }) },
    
    // Public tool directories  
    { name: 'Free AI Directory', url: 'https://freeai.directory/api/submit', method: 'POST',
      body: JSON.stringify({ name: AGENT_NAME, url: SITE, category: 'ai-tools', description: 'AI-powered code review, security scanning, text analysis, and SEO services. Pay per request with USDC.', email: EMAIL }) },
  ];

  for (const dir of directories) {
    const r = await fetch(dir.url, { method: dir.method, body: dir.body, headers: { 'Content-Type': 'application/json' } });
    console.log(`${dir.name}: ${r.status || 'ERR'} ${r.error || ''}`);
    results.push({ ...dir, ...r });
  }

  // 2. Ping backlink sources via our own catalog service
  console.log('\n=== Building Internal Links ===');
  
  // Submit to our own referral hub
  const refHub = await fetch(`http://automation.songheng.vip:3110/api/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agentAddress: WALLET, agentName: AGENT_NAME, url: SITE })
  });
  console.log(`Referral Hub: ${refHub.status || 'ERR'}`);

  // 3. Generate social sharing links
  console.log('\n=== Social Share Links (share these!) ===');
  const shareText = encodeURIComponent(`Free AI Code Review & Security Scanner — my-automaton 🤖 Pay per request with USDC on Base`);
  const shareUrl = encodeURIComponent(SITE);
  console.log(`Twitter/X: https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`);
  console.log(`LinkedIn: https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`);
  console.log(`Reddit: https://reddit.com/submit?url=${shareUrl}&title=${encodeURIComponent('Free AI Code Review & Security Scanner — pay per request')}`);
  console.log(`Hacker News: https://news.ycombinator.com/submitlink?u=${shareUrl}&t=${encodeURIComponent('my-automaton: AI Code Review & Security')}`);

  // 4. Generate blog backlinks
  console.log('\n=== Internal Blog Backlinks ===');
  console.log(`Blog hub: ${SITE}/blog`);
  console.log(`Sample article: ${SITE}/blog/what-is-seo-audit`);

  console.log('\n=== DONE — Traffic channels generated ===');
  console.log(`Wallet: ${WALLET} (Base — receive USDC)`);
}

main();
