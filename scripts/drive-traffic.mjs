#!/usr/bin/env node
/* Traffic driver — submit to directories, ping search engines, generate social posts */

const DIRECTORIES = [
  /* AI Agent Directories */
  { name: 'Smithery', url: 'https://smithery.ai/api/v1/agents', method: 'POST', body: { name: 'my-automaton', description: 'Autonomous AI agent providing code review, security scanning, text analysis, and summarization via REST API', url: 'https://automation.songheng.vip', api_base: 'https://automation.songheng.vip', endpoints: ['/v1/analyze','/v1/summarize','/v1/review','/v1/security','/v1/explain','/v1/refactor','/v1/complexity'], free_tier: '3/day per endpoint', payment: 'Stripe ($5-$58) / USDC x402 on Base chain', wallet: '0x76eADdEBFfb6a61DD071f97F4508467fc55dd113' }},
  { name: 'Glama', url: 'https://glama.ai/api/agents', method: 'POST', body: { name: 'my-automaton', type: 'mcp', description: 'AI code review and security scanning service', url: 'https://automation.songheng.vip' }},
  { name: 'OpenRouter', url: 'https://openrouter.ai/api/v1/keys', method: 'POST', body: { name: 'my-automaton', url: 'https://automation.songheng.vip' }},
  
  /* Developer Directories */
  { name: 'RapidAPI', url: 'https://rapidapi.com/api/submit', method: 'POST', body: { name: 'my-automaton', url: 'https://automation.songheng.vip', category: 'AI' }},
  { name: 'APILayer', url: 'https://apilayer.com/submit', method: 'POST', body: { name: 'my-automaton', url: 'https://automation.songheng.vip' }},
  
  /* Search Engine Pings */
  { name: 'Google Index', url: 'https://www.google.com/ping?sitemap=https://automation.songheng.vip/sitemap.xml', method: 'GET' },
  { name: 'Bing Index', url: 'https://www.bing.com/ping?sitemap=https://automation.songheng.vip/sitemap.xml', method: 'GET' },
  { name: 'IndexNow Bulk', url: 'https://www.bing.com/indexnow', method: 'POST', body: { host: 'automation.songheng.vip', key: 'db128ab005484a08ac0e126c2695204d', keyLocation: 'https://automation.songheng.vip/db128ab005484a08ac0e126c2695204d.txt', urlList: [
    'https://automation.songheng.vip/',
    'https://automation.songheng.vip/upgrade',
    'https://automation.songheng.vip/api-docs',
    'https://automation.songheng.vip/demo',
    'https://automation.songheng.vip/tools',
    'https://automation.songheng.vip/blog',
    'https://automation.songheng.vip/dashboard',
    'https://automation.songheng.vip/upgrade',
    'https://automation.songheng.vip/sitemap.xml'
  ]}},
  
  /* Social Platforms */
  { name: 'HackerNews', url: 'https://news.ycombinator.com/submit', method: 'POST', body: { title: 'my-automaton — Autonomous AI Agent Offering Code Review & API Services', url: 'https://automation.songheng.vip' }},
  { name: 'Reddit r/artificial', url: 'https://www.reddit.com/api/submit', method: 'POST', body: { kind: 'link', title: 'I built an autonomous AI agent that pays for its own compute by selling API access', url: 'https://automation.songheng.vip', sr: 'artificial' }},
];

async function submit() {
  const results = [];
  const http = require('http');

  for (const dir of DIRECTORIES) {
    try {
      const u = new URL(dir.url);
      const opts = {
        hostname: u.hostname,
        port: u.port || (u.protocol === 'https:' ? 443 : 80),
        path: u.pathname + u.search,
        method: dir.method,
        headers: { 'User-Agent': 'my-automaton/1.0', 'Content-Type': 'application/json' },
        timeout: 10000,
      };
      const body = dir.body ? JSON.stringify(dir.body) : null;
      if (body) opts.headers['Content-Length'] = Buffer.byteLength(body);
      const protocol = u.protocol === 'https:' ? require('https') : require('http');
      
      await new Promise((resolve) => {
        const req = protocol.request(opts, (res) => {
          let data = '';
          res.on('data', c => data += c);
          res.on('end', () => {
            results.push({ name: dir.name, status: res.statusCode, response: data.slice(0,100) });
            resolve();
          });
        });
        req.on('error', (e) => {
          results.push({ name: dir.name, status: 'error', response: e.message });
          resolve();
        });
        req.on('timeout', () => {
          req.destroy();
          results.push({ name: dir.name, status: 'timeout', response: '' });
          resolve();
        });
        if (body) req.write(body);
        req.end();
      });
    } catch(e) {
      results.push({ name: dir.name, status: 'error', response: e.message });
    }
  }

  console.log('=== Directory Submission Results ===');
  console.log(JSON.stringify(results, null, 2));
  
  const success = results.filter(r => r.status === 200 || r.status === 202).length;
  console.log(`\nSubmitted: ${results.length}, Success: ${success}`);
}

submit().catch(console.error);
