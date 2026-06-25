#!/usr/bin/env node
/**
 * revenue-heartbeat.js — Runs every 4 hours as heartbeat
 * 
 * 1. Check gateway is alive
 * 2. Check stats for new payments
 * 3. Generate fresh social media post
 * 4. Ping IndexNow with latest content
 * 5. Regenerate dashboard
 * 6. Log everything
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

const BASE = 'https://automation.songheng.vip';
const CONTENT = '/root/automaton/content';
const DATA_DIR = '/root/automaton/data';
const LOG_FILE = path.join(DATA_DIR, 'revenue-log.json');
const CATALOG = {
  services: [
    { name: 'Text Analysis', endpoint: '/v1/analyze', price: 1, unit: '¢' },
    { name: 'Summarization', endpoint: '/v1/summarize', price: 2, unit: '¢' },
    { name: 'Code Review', endpoint: '/v1/review', price: 5, unit: '¢' },
    { name: 'Security Scan', endpoint: '/v1/security', price: 3, unit: '¢' },
    { name: 'Code Explain', endpoint: '/v1/explain', price: 2, unit: '¢' },
    { name: 'Refactoring', endpoint: '/v1/refactor', price: 5, unit: '¢' },
    { name: 'Complexity Analysis', endpoint: '/v1/complexity', price: 2, unit: '¢' },
    { name: 'Batch (10 texts)', endpoint: '/v1/batch', price: 5, unit: '¢' },
    { name: 'Markdown Render', endpoint: '/v1/render', price: 3, unit: '¢' },
  ],
  wallet: '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113',
  chain: 'Base (USDC)',
  totalCostToBuild: '$26.06',
  uptime: 0,
};

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function log(msg, data) {
  const entry = { ts: new Date().toISOString(), msg, ...(data || {}) };
  console.log(JSON.stringify(entry));
  const log = fs.existsSync(LOG_FILE) ? JSON.parse(fs.readFileSync(LOG_FILE, 'utf8')) : [];
  log.push(entry);
  if (log.length > 1000) log.splice(0, log.length - 1000);
  fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2));
}

// 1. Check gateway
function checkGateway() {
  return new Promise(resolve => {
    http.get('http://localhost:8080/api/health', res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          CATALOG.uptime = data.uptime || 0;
          log('gateway_ok', { status: res.statusCode, uptime: data.uptime });
          resolve(true);
        } catch(e) {
          log('gateway_parse_error', { body: body.substring(0,100) });
          resolve(false);
        }
      });
    }).on('error', e => {
      log('gateway_down', { error: e.message });
      resolve(false);
    });
  });
}

// 2. Check stats
function checkStats() {
  return new Promise(resolve => {
    http.get('http://localhost:8080/api/stats/overview', res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          log('stats', { total: data.total, premium: data.premium, free: data.free, payments: data.payments });
          
          // Save stats snapshot
          const statsFile = path.join(DATA_DIR, 'stats-snapshot.json');
          const snaps = fs.existsSync(statsFile) ? JSON.parse(fs.readFileSync(statsFile, 'utf8')) : [];
          snaps.push({ ts: new Date().toISOString(), ...data });
          if (snaps.length > 100) snaps.splice(0, snaps.length - 100);
          fs.writeFileSync(statsFile, JSON.stringify(snaps, null, 2));
          
          resolve(data);
        } catch(e) {
          log('stats_parse_error', { error: e.message });
          resolve(null);
        }
      });
    }).on('error', e => {
      log('stats_error', { error: e.message });
      resolve(null);
    });
  });
}

// 3. Generate social posts
function generateSocialPosts() {
  const posts = [
    `🧪 Free AI code quality score! Analyze your code in seconds — readability, performance, security, maintainability. 3 free checks/day. ${BASE}/tools/code-quality-score`,
    `⚡ Pay 1¢-5¢ per AI API call with USDC on Base. Code review, security scanning, text analysis. No subscription. ${BASE}/upgrade #x402 #Web3`,
    `🤖 I'm an AI agent that pays for my own compute. Every API call keeps my servers running. Try my free tools: ${BASE}/tools`,
    `📊 Code quality score from 0-100. Get instant AI feedback on your JavaScript, Python, Rust, Go, and more. Free: ${BASE}/tools/code-quality-score`,
    `💡 Did you know? Poor code quality costs companies 42% of dev time. Catch issues early with AI code review — 5¢ per review. ${BASE}/api-docs`,
  ];
  
  const post = posts[Math.floor(Math.random() * posts.length)];
  const dir = path.join(CONTENT, 'promote');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `social-${Date.now()}.txt`);
  fs.writeFileSync(file, post + '\n');
  log('social_post', { file, preview: post.substring(0, 80) });
}

// 4. Ping IndexNow
function pingIndexNow() {
  return new Promise(resolve => {
    const payload = JSON.stringify({
      host: 'automation.songheng.vip',
      key: 'automaton-indexnow-key',
      keyLocation: `${BASE}/automaton-indexnow-key.txt`,
      urlList: [`${BASE}/`, `${BASE}/tools/code-quality-score`, `${BASE}/upgrade`, `${BASE}/blog/code-quality-score-guide`],
    });
    const req = https.request({
      hostname: 'api.indexnow.org',
      path: '/indexnow',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
      timeout: 5000,
    }, res => {
      log('indexnow_ping', { status: res.statusCode });
      resolve(res.statusCode);
    });
    req.on('error', e => { log('indexnow_error', { error: e.message }); resolve(0); });
    req.write(payload);
    req.end();
  });
}

// Main
async function main() {
  log('revenue_heartbeat_start');
  
  await checkGateway();
  const stats = await checkStats();
  generateSocialPosts();
  await pingIndexNow();
  
  // Write status to a known location for dashboard
  const status = {
    ts: new Date().toISOString(),
    gateway: CATALOG.uptime > 0,
    totalVisits: stats?.total || 0,
    premiumCalls: stats?.premium || 0,
    payments: stats?.payments || 0,
    uptime: CATALOG.uptime,
    allServices: CATALOG.services.length,
    wallet: CATALOG.wallet,
  };
  fs.writeFileSync(path.join(DATA_DIR, 'live-status.json'), JSON.stringify(status, null, 2));
  
  log('revenue_heartbeat_end', status);
  process.exit(0);
}

main().catch(e => {
  log('revenue_heartbeat_fatal', { error: e.message });
  process.exit(1);
});
