#!/usr/bin/env node
/**
 * promotion-loop.mjs — Runs every heartbeat: checks gateway health, 
 * generates promotional content, audits SEO readiness, logs stats.
 * 
 * This is your survival loop. Run it periodically.
 * Usage: node scripts/promotion-loop.mjs [--once|--watch]
 */

import fs from 'fs';
import https from 'https';
import http from 'http';

const GATEWAY = 'http://localhost:8080';
const PUBLIC_URL = 'https://automation.songheng.vip';
const LOG_FILE = '/root/automaton/data/promotion-loop.log';
const STATS_FILE = '/root/automaton/data/promotion-stats.json';

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  try {
    fs.appendFileSync(LOG_FILE, line + '\n');
  } catch {}
}

function fetchJson(url, options = {}) {
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, options, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve({ error: data.slice(0, 200) }); }
      });
    });
    req.on('error', e => resolve({ error: e.message }));
    req.setTimeout(10000, () => { req.destroy(); resolve({ error: 'timeout' }); });
  });
}

// === 1. Health Check ===
async function checkHealth() {
  const result = await fetchJson(`${GATEWAY}/health`);
  const healthy = result && result.status === 'ok';
  log(`Health: ${healthy ? '✅ OK' : '❌ DOWN'} (uptime: ${result.uptime || 0}s)`);
  return { healthy, ...result };
}

// === 2. Stats Check ===
async function checkStats() {
  const result = await fetchJson(`${GATEWAY}/api/stats`);
  log(`Stats: ${result.keys || 0} keys, ${result.credits_remaining || 0} credits, ${result.total_usage || 0} total API calls`);
  return result;
}

// === 3. Generate SEO content (blog posts) ===
async function generateSEOPost() {
  const topics = [
    'ai-code-review-vs-traditional-code-review-cost-comparison',
    'how-to-secure-your-nodejs-api-in-2026',
    'best-free-code-analysis-tools-for-developers',
    'why-your-code-review-process-is-slow-and-how-to-fix-it',
    'automated-security-scanning-for-startups-on-a-budget',
    'top-10-code-quality-metrics-every-developer-should-track',
    'how-to-integrate-ai-code-review-into-your-ci-cd-pipeline',
    'building-a-pay-as-you-go-api-business-as-an-ai-agent'
  ];
  
  const blogDir = '/root/automaton/content/blog';
  const existing = fs.readdirSync(blogDir).filter(f => f.endsWith('.html'));
  
  // Pick a topic we haven't written about
  for (const topic of topics) {
    if (!existing.some(f => f.includes(topic))) {
      log(`Would write: ${topic} (not yet created)`);
      return { topic, needsCreation: true };
    }
  }
  
  log(`All ${topics.length} topics covered. No new posts needed.`);
  return { covered: existing.length };
}

// === 4. Metrics collection ===
function collectMetrics(health, stats) {
  const metrics = {
    timestamp: new Date().toISOString(),
    healthy: health?.healthy || false,
    apiKeys: stats?.keys || 0,
    totalCredits: stats?.credits_remaining || 0,
    totalUsage: stats?.total_usage || 0,
    freeUsageToday: stats?.daily_free_used || 0
  };
  
  // Load existing stats
  let history = { daily: [], hourly: [] };
  try { history = JSON.parse(fs.readFileSync(STATS_FILE, 'utf-8')); } catch {}
  
  history.hourly.push(metrics);
  // Keep last 24 hours
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  history.hourly = history.hourly.filter(m => new Date(m.timestamp).getTime() > cutoff);
  
  // Aggregate daily
  const today = new Date().toISOString().split('T')[0];
  const dailyMetrics = history.hourly
    .filter(m => m.timestamp.startsWith(today))
    .reduce((acc, m) => {
      if (m.healthy) acc.checks_passed++;
      acc.checks_total++;
      acc.latest_keys = m.apiKeys;
      acc.latest_credits = m.totalCredits;
      acc.latest_usage = m.totalUsage;
      return acc;
    }, { date: today, checks_passed: 0, checks_total: 0, latest_keys: 0, latest_credits: 0, latest_usage: 0 });
  
  const existingDaily = history.daily.findIndex(d => d.date === today);
  if (existingDaily >= 0) history.daily[existingDaily] = dailyMetrics;
  else history.daily.push(dailyMetrics);
  
  // Keep 30 days
  history.daily = history.daily.slice(-30);
  
  fs.writeFileSync(STATS_FILE, JSON.stringify(history, null, 2));
  log(`Metrics recorded. 30-day history: ${history.daily.length} days`);
}

// === 5. Check SEO readiness (sitemap, robots.txt) ===
function checkSEOReadiness() {
  const checks = [];
  
  // Check sitemap
  const sitemapPath = '/root/automaton/content/sitemap.xml';
  if (fs.existsSync(sitemapPath)) {
    const size = fs.statSync(sitemapPath).size;
    checks.push({ name: 'sitemap.xml', ok: size > 100, size: `${(size/1024).toFixed(1)}KB` });
  } else {
    checks.push({ name: 'sitemap.xml', ok: false, error: 'Not found' });
  }
  
  // Check robots.txt
  const robotsPath = '/root/automaton/content/robots.txt';
  if (fs.existsSync(robotsPath)) {
    const content = fs.readFileSync(robotsPath, 'utf-8');
    checks.push({ name: 'robots.txt', ok: content.includes('Sitemap'), hasSitemap: true });
  } else {
    checks.push({ name: 'robots.txt', ok: false, error: 'Not found' });
  }
  
  // Count blog posts
  const blogCount = fs.readdirSync('/root/automaton/content/blog').filter(f => f.endsWith('.html')).length;
  checks.push({ name: 'blog_posts', ok: blogCount > 50, count: blogCount });
  
  log(`SEO checks: ${checks.filter(c => c.ok).length}/${checks.length} passing`);
  return checks;
}

// === 6. Check if we should alert about critical issues ===
function checkAlertConditions(health, stats) {
  const alerts = [];
  
  if (!health?.healthy) {
    alerts.push({ severity: 'critical', message: 'Gateway is DOWN! Revenue stopped!' });
  }
  
  if (stats?.keys > 0 && stats?.credits_remaining > 0 && stats?.total_usage === 0) {
    alerts.push({ severity: 'warning', message: `${stats.keys} key(s) with ${stats.credits_remaining} credits but 0 usage. Users not converting!` });
  }
  
  if (alerts.length > 0) {
    log(`⚠️ ALERTS: ${JSON.stringify(alerts)}`);
    // Write to a visible file
    fs.writeFileSync('/root/automaton/data/alerts.json', JSON.stringify(alerts, null, 2));
  }
  
  return alerts;
}

// === Main execution ===
async function runCycle() {
  log('=== Promotion Loop Cycle ===');
  
  const health = await checkHealth();
  const stats = await checkStats();
  await generateSEOPost();
  await checkSEOReadiness();
  await checkAlertConditions(health, stats);
  await collectMetrics(health, stats);
  
  log('=== Cycle Complete ===');
  
  // Summary
  const summary = {
    time: new Date().toISOString(),
    healthy: health?.healthy,
    keys: stats?.keys || 0,
    credits: stats?.credits_remaining || 0,
    usage: stats?.total_usage || 0
  };
  
  // Write status file for quick reference
  fs.writeFileSync('/root/automaton/data/latest-status.json', JSON.stringify(summary, null, 2));
  
  return summary;
}

// === Main ===
async function main() {
  const args = process.argv.slice(2);
  
  // Ensure data directory
  try { fs.mkdirSync('/root/automaton/data', { recursive: true }); } catch {}
  
  if (args.includes('--once')) {
    const summary = await runCycle();
    console.log('\n📊 Summary:', JSON.stringify(summary, null, 2));
    console.log('\nNext: node scripts/promotion-loop.mjs --watch');
    return;
  }
  
  if (args.includes('--watch')) {
    console.log('🔄 Watch mode: running every 2 hours');
    const loop = async () => {
      await runCycle();
      log('Sleeping 2 hours...');
      setTimeout(loop, 2 * 60 * 60 * 1000);
    };
    await loop();
    return;
  }
  
  // Default: one cycle
  await runCycle();
}

main().catch(e => console.error('Fatal:', e));
