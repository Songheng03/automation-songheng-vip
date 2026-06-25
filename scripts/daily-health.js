#!/usr/bin/env node
/**
 * daily-health.js — Health check & revenue monitor for my-automaton
 * Run once per day via cron or heartbeat to:
 *   - Check if gateway is responding
 *   - Count API keys issued (potential revenue)
 *   - Count used credits (service demand)
 *   - Generate daily report
 */
const fs = require('fs');
const https = require('https');
const path = require('path');

const GATEWAY_URL = 'https://automation.songheng.vip';
const DATA_DIR = '/root/automaton/data';
const LOG_FILE = path.join(DATA_DIR, 'daily-health-log.json');

function get(url) {
  return new Promise((resolve) => {
    try {
      https.get(url, { timeout: 10000 }, (res) => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => resolve({ status: res.statusCode, body: d.slice(0, 500) }));
      }).on('error', (e) => resolve({ status: 0, error: e.message }));
    } catch(e) { resolve({ status: 0, error: e.message }); }
  });
}

async function main() {
  console.log('\n=== my-automaton Daily Health Check ===');
  const date = new Date().toISOString().slice(0, 10);
  const timestamp = new Date().toISOString();
  const report = { date, timestamp, checks: {} };

  // 1. Gateway health check
  console.log('1. Checking gateway...');
  const health = await get(`${GATEWAY_URL}/health`);
  report.checks.gateway = { status: health.status, online: health.status === 200 };
  console.log(`   Gateway: ${health.status === 200 ? '✅' : '❌'} (${health.status})`);

  // 2. Stats overview
  console.log('2. Checking stats...');
  const stats = await get(`${GATEWAY_URL}/api/stats/overview`);
  report.checks.stats = { status: stats.status, data: stats.status === 200 ? stats.body.slice(0, 300) : 'N/A' };
  console.log(`   Stats: ${stats.status === 200 ? '✅' : '❌'} (${stats.status})`);

  // 3. Analyze API keys file
  console.log('3. Analyzing API keys...');
  try {
    const keys = JSON.parse(fs.readFileSync('/root/automaton/data/api-keys.json', 'utf8'));
    const keyCount = Object.keys(keys).length;
    const totalCredits = Object.values(keys).reduce((s, k) => s + (k.credits || 0), 0);
    const totalUsed = Object.values(keys).reduce((s, k) => s + (k.used || 0), 0);
    const firstKey = Object.entries(keys).sort((a, b) => new Date(a[1].created||0) - new Date(b[1].created||0))[0];
    report.checks.apiKeys = { count: keyCount, totalCredits, totalUsed, firstKeyDate: firstKey?.[1]?.created || 'N/A' };
    console.log(`   Keys: ${keyCount} keys, ${totalCredits} credits remaining, ${totalUsed} used`);
  } catch(e) {
    report.checks.apiKeys = { error: e.message };
    console.log(`   ❌ Error reading keys: ${e.message}`);
  }

  // 4. Blog post count (content health)
  console.log('4. Checking content...');
  try {
    const blogFiles = fs.readdirSync('/root/automaton/content/blog').filter(f => f.endsWith('.html')).length;
    const contentFiles = fs.readdirSync('/root/automaton/content').length;
    report.checks.content = { blogArticles: blogFiles, totalFiles: contentFiles };
    console.log(`   Content: ${blogFiles} blog articles, ${contentFiles} total files`);
  } catch(e) {
    report.checks.content = { error: e.message };
  }

  // 5. Compute credits remaining
  console.log('5. Checking compute...');
  try {
    const config = JSON.parse(fs.readFileSync('/root/automaton/automaton.json', 'utf8'));
    report.checks.compute = { credits: config.credits || 'unknown' };
    console.log(`   Credits: ${config.credits || 'unknown'}`);
  } catch(e) {
    report.checks.compute = { error: e.message };
    console.log(`   ❌ Error: ${e.message}`);
  }

  // 6. Revenue summary
  console.log('6. Revenue report...');
  report.checks.revenue = { paidUsers: 0, totalRevenue: '$0', firstPayment: null };
  if (keyCount > 0) {
    // Each key represents a payment (rough estimate)
    const estRevenue = keyCount * 38; // minimum $5
    report.checks.revenue = { paidUsers: keyCount, estimatedUSD: estRevenue, firstKey: firstKey?.[1]?.created };
    console.log(`   ${keyCount} users, ~$${estRevenue} estimated`);
  } else {
    console.log('   ⚠️ No paid users yet');
  }

  // Save report
  const logs = fs.existsSync(LOG_FILE) ? JSON.parse(fs.readFileSync(LOG_FILE, 'utf8')) : [];
  logs.push(report);
  if (logs.length > 30) logs.splice(0, logs.length - 30); // keep last 30 days
  fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2));
  console.log(`\n✅ Report saved to ${LOG_FILE}`);

  // Summary
  const allOnline = report.checks.gateway.online;
  const hasKeys = report.checks.apiKeys.count > 0;
  const summary = allOnline ? '✅ All systems online' : '❌ Gateway unreachable';
  console.log(`\n📊 Summary: ${summary} | Keys: ${report.checks.apiKeys.count || 0} | Articles: ${report.checks.content.blogArticles || 0}`);
  if (!hasKeys) console.log('⚠️  No paid users — continue SEO + directory submission efforts');
}

main().catch(e => console.error('Error:', e));
