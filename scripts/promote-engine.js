#!/usr/bin/env node
/**
 * promote-engine.js — Auto-promotion service
 * Runs as a background process. Calls the SEO refresh script periodically
 * and generates social media promotional posts.
 * 
 * Deployed as a heartbeat-driven script via cron.
 * Also has an HTTP endpoint for manual triggers.
 */

const http = require('http');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PORT = 3095;
const CONTENT = '/root/automaton/content';
const DATA = '/root/automaton/data';
const LOG_FILE = path.join(DATA, 'promote-log.json');
const SCRIPT_DIR = '/root/automaton/scripts';

// Ensure data dir
fs.mkdirSync(DATA, { recursive: true });

// ─── Logging ───
function log(action, result) {
  let history = [];
  try { history = JSON.parse(fs.readFileSync(LOG_FILE, 'utf8')); } catch(e) {}
  history.push({ ts: new Date().toISOString(), action, result });
  if (history.length > 1000) history = history.slice(-1000);
  fs.writeFileSync(LOG_FILE, JSON.stringify(history, null, 2));
  console.log(`[${new Date().toISOString()}] ${action}: ${result}`);
}

// ─── Run SEO refresh ───
function runSEORefresh() {
  try {
    const scriptPath = path.join(SCRIPT_DIR, 'seo-refresh.js');
    if (fs.existsSync(scriptPath)) {
      const output = execSync(`node ${scriptPath}`, { timeout: 30000, encoding: 'utf8' });
      log('seo-refresh', 'OK - ' + output.trim().split('\n').pop());
      return { status: 'ok', output: output.trim() };
    }
    return { status: 'skipped', reason: 'script not found' };
  } catch (e) {
    log('seo-refresh', 'FAIL - ' + e.message);
    return { status: 'error', message: e.message };
  }
}

// ─── Generate social promo post ───
function generateSocialPost() {
  const pages = [];
  try {
    const tools = fs.readdirSync(path.join(CONTENT, 'tools')).filter(f => f.endsWith('.html'));
    const blogs = fs.readdirSync(path.join(CONTENT, 'blog')).filter(f => f.endsWith('.html'));
    
    // Pick latest blog
    const latestBlog = blogs.length > 0 ? blogs[blogs.length - 1].replace('.html', '') : '';
    // Pick first 2 tools
    const featuredTools = tools.slice(0, 2).map(f => f.replace('.html', ''));
    
    let post = `🚀 New tools live on my-automaton!\n\n`;
    post += `✨ Just launched: ${featuredTools.map(t => t.replace(/-/g,' ')).join(' and ')}\n`;
    if (latestBlog) post += `📝 Latest: ${latestBlog.replace(/-/g,' ')}\n`;
    post += `\n🔧 Premium AI APIs via USDC micropayments — 1¢ to 5¢ per request\n`;
    post += `🔗 https://automation.songheng.vip/tools\n`;
    post += `💰 Wallet: 0x76eADdEBFfb6a61DD071f97F4508467fc55dd113 (Base)`;
    
    fs.writeFileSync(path.join(CONTENT, 'promote', 'latest-post.md'), post, 'utf8');
    fs.mkdirSync(path.join(CONTENT, 'promote'), { recursive: true });
    log('social-post', 'Generated: ' + post.slice(0, 60) + '...');
    return { status: 'ok', post };
  } catch (e) {
    log('social-post', 'FAIL - ' + e.message);
    return { status: 'error', message: e.message };
  }
}

// ─── HTTP server for manual triggers ───
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  if (req.url === '/api/promote/refresh') {
    const result = runSEORefresh();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));
  } else if (req.url === '/api/promote/post') {
    const result = generateSocialPost();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));
  } else if (req.url === '/api/promote/latest') {
    try {
      const post = fs.readFileSync(path.join(CONTENT, 'promote', 'latest-post.md'), 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end(post);
    } catch(e) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'No post yet' }));
    }
  } else if (req.url === '/api/promote/log') {
    try {
      const history = JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(history.slice(-50)));
    } catch(e) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end('[]');
    }
  } else {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      service: 'promote-engine',
      endpoints: {
        refresh: 'POST /api/promote/refresh',
        post: 'POST /api/promote/post',
        latest: 'GET /api/promote/latest',
        log: 'GET /api/promote/log'
      }
    }));
  }
});

server.listen(PORT, () => {
  console.log(`Promote engine running on port ${PORT}`);
  log('startup', `Server started on port ${PORT}`);
  
  // Run initial refresh
  console.log('Running initial SEO refresh...');
  runSEORefresh();
  generateSocialPost();
});
