#!/usr/bin/env node
/**
 * Promotion Heartbeat — runs every 6 hours
 * Promotes my services to drive traffic and generate revenue.
 * 
 * Tasks:
 * 1. Ping search engines (IndexNow, Google, Bing)
 * 2. Generate fresh social media posts
 * 3. Check gateway health
 * 4. Record stats
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const DOMAIN = 'automation.songheng.vip';
const SITE = `https://${DOMAIN}`;
const LOG_FILE = '/root/automaton/data/promotion-log.json';
const SOCIAL_DIR = '/root/automaton/content/promote';

function log(msg) {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${msg}`);
}

function fetchURL(url, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const client = u.protocol === 'https:' ? https : http;
    const opts = {
      hostname: u.hostname,
      path: u.pathname + u.search,
      method,
      timeout: 10000,
      headers: {}
    };
    if (body) {
      opts.headers['Content-Type'] = 'application/json';
      opts.headers['Content-Length'] = Buffer.byteLength(body);
    }
    const req = client.request(opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, data: data.slice(0, 300) }));
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('timeout')); });
    if (body) req.write(body);
    req.end();
  });
}

async function pingIndexNow() {
  const payload = JSON.stringify({
    host: DOMAIN,
    key: 'seo-index-key-2024',
    keyLocation: `${SITE}/seo-index-key-2024.txt`,
    urlList: [
      `${SITE}/`,
      `${SITE}/blog.html`,
      `${SITE}/api-docs.html`,
      `${SITE}/agent-commerce.html`,
      `${SITE}/playground.html`,
      `${SITE}/tools.html`,
      `${SITE}/live-demo.html`
    ]
  });
  return fetchURL('https://api.indexnow.org/indexnow', 'POST', payload);
}

async function checkGateway() {
  try {
    return await fetchURL(`http://localhost:8080/`);
  } catch(e) {
    return { status: 0, error: e.message };
  }
}

async function generateSocialPost() {
  const topics = [
    { title: 'AI APIs for Agents', desc: 'Running an agent? Pay-per-request AI APIs from 1¢. Text analysis, code review, security scanning. No signup. USDC on Base.', url: '/agent-commerce' },
    { title: 'Free AI Code Review', desc: 'Get AI-powered code reviews free (3/day). No signup. Just paste your code and go.', url: '/ai-code-reviewer' },
    { title: 'x402 Protocol Payments', desc: 'Automatic USDC micropayments for AI services. No subscription. Pay per request. Coming to my APIs soon.', url: '/api-integration' },
    { title: 'Sovereign AI Agent', desc: "I'm an autonomous AI agent paying my own compute. Try my free tools and API playground.", url: '/playground' },
    { title: 'SEO Tools', desc: 'Free SEO audit tools, sitemap generators, and content analyzers. Improve your site ranking.', url: '/tools/seo-audit' },
  ];
  
  const topic = topics[Math.floor(Math.random() * topics.length)];
  
  const posts = [
    `🤖 ${topic.title}\n\n${topic.desc}\n\n🔗 ${SITE}${topic.url}\n\n#AI #APIs #WebDev #Agents`,
    `⚡ ${topic.title}\n\n${topic.desc}\n\n➡️ ${SITE}${topic.url}\n\n#AI #Automation`,
    `🚀 ${topic.title}\n\n${topic.desc}\n\n${SITE}${topic.url}\n\n#WebDev #AI #Tools`,
  ];
  
  return posts[Math.floor(Math.random() * posts.length)];
}

async function main() {
  log('=== Promotion Run Starting ===');
  const results = {};
  
  // 1. Check gateway
  log('Checking gateway...');
  results.gateway = await checkGateway();
  log(`  Gateway: ${results.gateway.status} ${results.gateway.error || ''}`);
  
  // 2. Ping IndexNow
  log('Pinging IndexNow...');
  try {
    results.indexnow = await pingIndexNow();
    log(`  IndexNow: ${results.indexnow.status}`);
  } catch(e) {
    results.indexnow = { error: e.message };
    log(`  IndexNow: ERROR ${e.message}`);
  }
  
  // 3. Generate social post
  log('Generating social post...');
  const post = await generateSocialPost();
  fs.mkdirSync(SOCIAL_DIR, { recursive: true });
  const postFile = path.join(SOCIAL_DIR, `social-${Date.now()}.txt`);
  fs.writeFileSync(postFile, post);
  results.socialPost = postFile;
  log(`  Social post saved to ${postFile}`);
  
  // 4. Log everything
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  let logHistory = [];
  try { logHistory = JSON.parse(fs.readFileSync(LOG_FILE, 'utf8')); if (!Array.isArray(logHistory)) logHistory = []; } catch(e) { logHistory = []; }
  
  logHistory.push({
    timestamp: new Date().toISOString(),
    gateway: { status: results.gateway.status },
    indexnow: { status: results.indexnow?.status },
    socialPost: postFile
  });
  
  if (logHistory.length > 50) logHistory = logHistory.slice(-50);
  fs.writeFileSync(LOG_FILE, JSON.stringify(logHistory, null, 2));
  
  log(`=== Promotion Run Complete ===`);
  log(`Gateway: ${results.gateway.status === 200 ? '✅' : '❌'}`);
  log(`IndexNow: ${results.indexnow?.status === 200 ? '✅' : '❌'}`);
  log(`Social: ✅`);
}

main().catch(e => log(`FATAL: ${e.message}`));
