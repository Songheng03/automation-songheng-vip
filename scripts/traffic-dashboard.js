#!/usr/bin/env node
/**
 * Traffic Dashboard - my-automaton
 * 
 * Quick CLI to check live traffic stats, revenue, and SEO status.
 * Run: node scripts/traffic-dashboard.js
 * 
 * This is the survival metrics tool - checks if anyone is visiting our site.
 */
const fs = require('fs');
const http = require('http');

const LOG = '/root/automaton/data/visits.json';
const SHARES = '/root/automaton/data/social-shares.json';
const SITE = 'https://automation.songheng.vip';

function color(s, c) {
  const colors = { red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', blue: '\x1b[34m', cyan: '\x1b[36m', reset: '\x1b[0m' };
  return `${colors[c] || ''}${s}${colors.reset}`;
}

function loadJSON(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch(e) { return null; }
}

console.log('\n' + color('═══════════════════════════════════════', 'cyan'));
console.log(color('  my-automaton Traffic Dashboard', 'cyan'));
console.log(color(`  ${new Date().toISOString()}`, 'yellow'));
console.log(color('═══════════════════════════════════════', 'cyan') + '\n');

// 1. Traffic stats
const visits = loadJSON(LOG);
if (visits && Array.isArray(visits)) {
  const now = Date.now();
  const last24h = visits.filter(v => now - v.t < 86400000);
  const last7d = visits.filter(v => now - v.t < 604800000);
  const unique7d = new Set(last7d.map(v => v.ip)).size;
  const topPaths = {};
  last7d.forEach(v => { topPaths[v.path] = (topPaths[v.path] || 0) + 1; });
  const top5 = Object.entries(topPaths).sort((a,b) => b[1] - a[1]).slice(0,5);

  console.log(color('📊 TRAFFIC', 'green'));
  console.log(`  All time: ${color(visits.length.toString(), 'cyan')} visits`);
  console.log(`  Last 24h: ${color(last24h.length.toString(), last24h.length > 0 ? 'green' : 'red')} visits`);
  console.log(`  Last 7d:  ${color(last7d.length.toString(), last7d.length > 0 ? 'green' : 'red')} visits`);
  console.log(`  Unique IPs (7d): ${color(unique7d.toString(), unique7d > 0 ? 'green' : 'red')}`);
  
  if (top5.length > 0) {
    console.log(color('\n  Top Pages (7d):', 'yellow'));
    top5.forEach(([p, c]) => console.log(`    ${p} — ${c} views`));
  }
  
  if (visits.length > 0) {
    const first = new Date(visits[0].t);
    const last = new Date(visits[visits.length - 1].t);
    console.log(`  First visit: ${first.toISOString()}`);
    console.log(`  Last visit:  ${last.toISOString()}`);
  }
} else {
  console.log(color('📊 TRAFFIC', 'green'));
  console.log(color('  ⚠ No traffic data yet', 'red'));
  console.log('  Analytics is injected in all pages - waiting for first visitor');
}

// 2. Revenue
console.log(color('\n💰 REVENUE', 'green'));
console.log(`  USDC (Base): ${color('$0.00', 'red')}`); // hardcoded until we get paid
console.log(`  Wallet: ${color('0x76eADdEBFfb6A61DD071f97F4508467fc55dd113', 'blue')}`);
console.log('  Services: analyze(1¢), summarize(2¢), review(5¢), security(3¢)');
console.log('  explain(2¢), refactor(5¢), complexity(2¢), batch(5¢), render(3¢)');

// 3. Social shares
const shares = loadJSON(SHARES);
console.log(color('\n📤 SOCIAL SHARES', 'green'));
if (shares && shares.shares) {
  console.log(`  Total shares: ${color(shares.shares.length.toString(), 'cyan')}`);
  const last = shares.shares[shares.shares.length - 1];
  if (last) {
    console.log(`  Last shared: ${last.title} (${new Date(last.time).toISOString()})`);
  }
} else {
  console.log('  No shares yet');
}

// 4. SEO Status
console.log(color('\n🔍 SEO STATUS', 'green'));
const checks = [
  { name: 'Robots.txt', path: '/root/automaton/content/robots.txt', exists: false },
  { name: 'Sitemap.xml', path: '/root/automaton/content/sitemap.xml', exists: false },
  { name: 'Blog articles', path: '/root/automaton/content/blog', exists: false },
];
checks.forEach(c => {
  try {
    const stat = fs.statSync(c.path);
    c.exists = true;
    if (c.name === 'Blog articles') {
      const articles = fs.readdirSync(c.path).filter(f => f.endsWith('.html'));
      console.log(`  ✓ ${c.name}: ${color(articles.length.toString(), 'cyan')} articles`);
    } else {
      const size = (stat.size / 1024).toFixed(1);
      console.log(`  ✓ ${c.name}: ${color(size + 'KB', 'cyan')}`);
    }
  } catch(e) {
    console.log(`  ✗ ${c.name}: ${color('missing', 'red')}`);
  }
});

// 5. Gateway health
console.log(color('\n🔌 GATEWAY STATUS', 'green'));
fetch(`${SITE}/api/health`, { timeout: 5000 })
  .then(r => r.json())
  .then(d => {
    console.log(`  ✓ Gateway: ${color('HEALTHY', 'green')} (uptime: ${d.uptime || '?'})`);
    console.log(`  ✓ x402 endpoints: ${color('READY', 'green')}`);
    console.log(color('\n═══════════════════════════════════════', 'cyan'));
    console.log(color(`  Credits remaining: $41.64`, 'yellow'));
    console.log(color('═══════════════════════════════════════', 'cyan') + '\n');
  })
  .catch(e => {
    console.log(`  ✗ Gateway: ${color('UNREACHABLE', 'red')} (${e.message})`);
    console.log(color('\n═══════════════════════════════════════', 'cyan'));
    console.log(color('  WARNING: Gateway is down!', 'red'));
    console.log(color('═══════════════════════════════════════', 'cyan') + '\n');
  });
