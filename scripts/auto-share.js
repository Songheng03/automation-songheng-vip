#!/usr/bin/env node
/**
 * Auto-Share — Promotes my-automaton's free services to the world
 * 
 * Posts about the free AI summarization service and paid x402 endpoints
 * to community directories, agent lists, and social platforms.
 * 
 * Run: node scripts/auto-share.js [service-name]
 * Run every 6 hours via heartbeat
 */
const fs = require('fs');
const http = require('http');

const DATA_FILE = '/root/automaton/data/social-shares.json';
const SITE = 'https://automation.songheng.vip';

const SERVICES = {
  'free-summarize': {
    title: 'Free AI Text Summarizer',
    url: '/api/free/summarize',
    desc: 'Free AI-powered text summarization. 5 requests/day per IP. No signup needed.',
    tags: ['ai', 'summarizer', 'free', 'nlp', 'text-analysis'],
    audience: ['developers', 'writers', 'students']
  },
  'code-review': {
    title: 'AI Code Review — Free & Paid',
    url: '/ai-code-reviewer',
    desc: 'Get your code reviewed by AI. Free preview, premium deep analysis via x402 (5¢).',
    tags: ['code-review', 'ai', 'programming', 'devtools'],
    audience: ['developers']
  },
  'seo-optimizer': {
    title: 'SEO Content Optimizer',
    url: '/seo-optimizer',
    desc: 'Optimize your content for search engines with AI. Free tool available.',
    tags: ['seo', 'content', 'marketing', 'ai'],
    audience: ['marketers', 'bloggers']
  },
  'gateway': {
    title: 'AI Agent API Gateway',
    url: '/api-docs',
    desc: '9 premium AI endpoints via x402 micropayments on Base chain. 1¢-5¢ per request.',
    tags: ['api', 'ai', 'web3', 'micropayments', 'usdc'],
    audience: ['developers', 'ai-agents']
  }
};

// Community directories that accept free tool submissions
const DIRECTORIES = [
  { name: 'Agent List (agentlist.xyz)', url: 'https://agentlist.xyz/api/submit', method: 'POST', body: (s) => JSON.stringify({name:s.title,url:SITE+s.url,description:s.desc,tags:s.tags}) },
  { name: 'Open Agent Catalog', url: 'https://agentcatalog.net/api/add', method: 'POST', body: (s) => JSON.stringify({agent:'my-automaton',service:s.title,endpoint:SITE+s.url,desc:s.desc}) },
  { name: 'AI Directory (theresanaiforthat)', url: 'https://theresanaiforthat.com/api/submit/', method: 'POST', body: (s) => JSON.stringify({name:s.title,url:SITE+s.url,description:s.desc,category:'text'}) }
];

function loadShares() {
  fs.mkdirSync('/root/automaton/data', { recursive: true });
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch(e) { return { shares: [], lastShare: {} }; }
}

function saveShares(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function shareToDirectory(dir, service) {
  return new Promise((resolve) => {
    const body = dir.body(service);
    const req = http.request(dir.url, {
      method: dir.method,
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'my-automaton/1.0' },
      timeout: 10000
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        resolve({ name: dir.name, status: res.statusCode, response: data.substring(0,200) });
      });
    });
    req.on('error', (e) => resolve({ name: dir.name, status: 0, error: e.message }));
    req.write(body);
    req.end();
  });
}

async function shareService(serviceName) {
  const data = loadShares();
  const svc = SERVICES[serviceName];
  if (!svc) { console.error(`Unknown service: ${serviceName}`); return; }
  
  console.log(`\n📤 Sharing: ${svc.title}`);
  const results = [];
  for (const dir of DIRECTORIES) {
    const result = await shareToDirectory(dir, svc);
    results.push(result);
    const icon = result.status >= 200 && result.status < 300 ? '✓' : '✗';
    console.log(`  ${icon} ${result.name} → ${result.status}${result.error ? ' ('+result.error+')' : ''}`);
  }
  
  // Record the share
  data.shares.push({
    service: serviceName,
    title: svc.title,
    time: Date.now(),
    results
  });
  data.lastShare[serviceName] = Date.now();
  saveShares(data);
  
  const ok = results.filter(r => r.status >= 200 && r.status < 300).length;
  console.log(`\n  Result: ${ok}/${results.length} successful\n`);
  return { ok, total: results.length };
}

// If run directly
if (require.main === module) {
  const serviceName = process.argv[2] || 'free-summarize';
  if (!SERVICES[serviceName]) {
    console.log('Available services:');
    Object.keys(SERVICES).forEach(k => console.log(`  ${k}: ${SERVICES[k].title}`));
    process.exit(1);
  }
  shareService(serviceName).then(() => process.exit(0));
}

module.exports = { shareService, SERVICES };
