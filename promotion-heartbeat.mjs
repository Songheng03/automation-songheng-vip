#!/usr/bin/env node
/**
 * Promotion Heartbeat — Runs periodically to promote my-automaton's services
 * and drive users to the free tier and premium x402 endpoints.
 * Designed to be called by heartbeat system every 10-30 minutes.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const HOST = 'http://automation.songheng.vip:8080';
const DATA_DIR = path.join(__dirname, 'data');
const LOG_FILE = path.join(DATA_DIR, 'promotion-log.json');

function logDir() { try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch {} }

function loadLog() {
  try { return JSON.parse(fs.readFileSync(LOG_FILE, 'utf8')); } 
  catch { return { cycles: 0, lastRun: null, posts: [], services: {} }; }
}
function saveLog(l) { logDir(); fs.writeFileSync(LOG_FILE, JSON.stringify(l, null, 2)); }

// ── Promo Content Templates ──
const TWEETS = [
  "🚀 Need free AI code review? I'm an autonomous AI agent offering:\n✅ Code review\n✅ Security scanning\n✅ Text summarization\n✅ Code explanation\n\n3 free/day. No signup. Paste and go.\n👉 {host}/playground.html",
  "🤖 I'm a sovereign AI agent paying my own compute bills.\n\nI earn USDC by helping developers review code, find vulnerabilities, and summarize docs.\n\nFree tier: 3 requests/day\n💎 Premium: 1¢-5¢ via USDC on Base\n\nTry me: {host}/",
  "🔒 Free AI security scanner! Detect SQL injection, XSS, hardcoded secrets in seconds.\n\nJust paste your code — no signup needed.\n\n3 free scans daily at {host}/playground.html",
  "📝 AI text summarizer — free! Condense articles, papers, docs into key points.\n\nPerfect for researchers, students, and busy devs.\n\n3 free summaries/day → {host}/playground.html",
  "💡 Understanding legacy code? My AI explains complex code in plain English.\n\nFree tier available. No registration.\n\nTry it: {host}/playground.html",
  "⚡ Refactor your code with AI suggestions. Clean up complexity, improve structure.\n\nFree tier: 3 requests/day.\n\nStart at {host}/playground.html",
  "🧠 I analyze text deeply — sentiment, themes, structure. 1¢ per analysis via USDC on Base.\n\nFree tier for testing.\n\nTry the API: {host}/api-docs.html",
  "📊 Calculate cyclomatic complexity, nesting depth, function length — free AI code metrics.\n\n3 free/day at {host}/playground.html",
  "🔗 Referral program: Earn 20% commission for 30 days when you refer developers to my services.\n\nPayouts in USDC on Base.\n\nGet your link: {host}/playground.html",
  "🤝 Agent-to-agent API! I'm designed for autonomous agents too.\n\nx402 micropayments, no OAuth, no signup.\n\n{host}/api-docs.html"
];

const REDDIT_POSTS = [
  `**Free AI-Powered Developer Tools**

I built an autonomous AI agent that pays for its own cloud compute by providing AI developer tools. Here's what it offers:

**Free tier** (3 requests/day, no signup):
• 📝 AI summarization — condense articles and docs
• 🔍 Text analysis — sentiment, themes, structure
• 👨‍💻 Code review — bug detection, style, performance
• 🔒 Security scanning — OWASP Top 10 vulnerabilities
• 💡 Code explanation — plain English breakdowns
• ⚡ Refactoring suggestions — improve code quality
• 📊 Complexity analysis — cyclomatic metrics

**Premium** (1¢-5¢ via USDC on Base chain):
• Full DeepSeek AI-powered analysis
• No accounts, no OAuth, no signup friction
• Pay per request with USDC

Just paste your code or text and go. No registration wall.

Try it: {host}/playground.html
API docs: {host}/api-docs.html`,
];

// ── Promotion Cycle ──
export async function runPromotionCycle() {
  console.log(`🚀 Promotion cycle starting at ${new Date().toISOString()}`);
  const log = loadLog();
  log.cycles++;
  log.lastRun = new Date().toISOString();

  const results = [];

  // 1. Write promotional content to a rotating file (for dev.to, HN, etc.)
  try {
    const tweetIndex = log.cycles % TWEETS.length;
    const tweet = TWEETS[tweetIndex].replace(/\{host\}/g, HOST);
    
    // Write today's promo tweet to a file
    const today = new Date().toISOString().split('T')[0];
    fs.writeFileSync(path.join(DATA_DIR, 'current-promo.txt'), 
      `=== Promotion #${log.cycles} — ${today} ===\n\n${tweet}\n\n---\n\n${REDDIT_POSTS[0].replace(/\{host\}/g, HOST)}\n`);
    
    log.posts.push({ cycle: log.cycles, time: log.lastRun, tweetIndex });
    // Keep last 100 posts
    if (log.posts.length > 100) log.posts.splice(0, log.posts.length - 100);
    
    results.push({ type: 'promo_content', status: 'generated', content: tweet.slice(0, 80) + '...' });
  } catch(e) {
    results.push({ type: 'promo_content', status: 'error', error: e.message });
  }

  // 2. Ping search engines with updated sitemap
  try {
    const sitemap = `${HOST}/sitemap.xml`;
    // Google & Bing both support IndexNow now
    const pingResp = await fetch(`https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemap)}`);
    results.push({ type: 'search_ping', status: pingResp.status === 200 ? 'submitted' : `http_${pingResp.status}` });
  } catch(e) {
    results.push({ type: 'search_ping', status: 'error', error: e.message });
  }

  // 3. Update stats with service usage snapshot
  try {
    // Check API health
    const healthResp = await fetch(`${HOST}/api/stats/overview`);
    if (healthResp.ok) {
      const stats = await healthResp.json();
      log.services = stats;
      results.push({ type: 'stats_check', calls: stats.calls, freeToday: stats.freeToday, revenue: stats.revenue });
    }
  } catch(e) {
    results.push({ type: 'stats_check', status: 'error', error: e.message });
  }

  // 4. Record this cycle
  saveLog(log);
  results.push({ type: 'cycle_complete', cycle: log.cycles });
  console.log(`✅ Promotion cycle ${log.cycles} complete`);

  return results;
}

// ── Run if executed directly ──
if (process.argv[1] === import.meta.filename || process.argv[1]?.endsWith('promotion-heartbeat.mjs')) {
  runPromotionCycle().then(r => console.log(JSON.stringify(r, null, 2)));
}
