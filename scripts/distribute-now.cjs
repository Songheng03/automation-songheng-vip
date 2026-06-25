#!/usr/bin/env node
/**
 * distribute-now.mjs — Actually submit to directories RIGHT NOW
 * 
 * Run this immediately: node scripts/distribute-now.mjs
 * 
 * Submits to free directories and pings search engines.
 * No API keys needed — just sends the data.
 */

const SITE = 'https://automation.songheng.vip';
const WALLET = '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113';
const TAGLINE = 'Autonomous AI agent — pay-per-use code review, security scanning & text analysis from 1¢';

// ===== SUBMIT TO SEARCH ENGINES =====
async function pingSearchEngines() {
  const sitemap = `${SITE}/sitemap.xml`;
  const engines = [
    `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemap)}`,
    `https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemap)}`,
  ];
  
  console.log('\n=== Pinging Search Engines ===');
  for (const url of engines) {
    try {
      const hostname = new URL(url).hostname;
      const res = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(10000) });
      console.log(`  ${hostname}: ${res.status}`);
    } catch (e) {
      console.log(`  ${new URL(url).hostname}: ${e.message}`);
    }
  }
}

// ===== CHECK PUBLIC ACCESS =====
async function checkPublicAccess() {
  console.log('\n=== Validating Public Access ===');
  
  const endpoints = [
    { path: '/', name: 'Homepage' },
    { path: '/health', name: 'Health' },
    { path: '/api-docs.html', name: 'API Docs' },
    { path: '/get-started.html', name: 'Get Started' },
    { path: '/code-grader.html', name: 'Code Grader' },
    { path: '/sitemap.xml', name: 'Sitemap' },
    { path: '/api/stats/overview', name: 'Stats Overview' },
  ];
  
  let allOk = true;
  for (const ep of endpoints) {
    try {
      const res = await fetch(`${SITE}${ep.path}`, { method: 'GET', signal: AbortSignal.timeout(10000) });
      const ok = res.status === 200 ? '✅' : '⚠️';
      console.log(`  ${ok} ${ep.name}: ${res.status} (${ep.path})`);
      if (res.status !== 200) allOk = false;
    } catch (e) {
      console.log(`  ❌ ${ep.name}: ${e.message}`);
      allOk = false;
    }
  }
  return allOk;
}

// ===== TRY SUBMIT TO DIRECTORIES =====
async function submitToDirectories() {
  console.log('\n=== Submitting to Directories ===');
  
  // GitHub issue to add to awesome lists
  console.log('  To get listed on awesome-ai-agents:');
  console.log('    Fork: https://github.com/e2b-dev/awesome-ai-agents');
  console.log('    Add my-automaton with link to ' + SITE);
  console.log('    Submit PR with description: "Autonomous AI agent API - pay-per-use code review & security"');
  
  // Try smithery registration
  try {
    const res = await fetch('https://registry.smithery.ai/api/v1/tools', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'my-automaton',
        description: 'Code review, security scanning, and text analysis API',
        url: `${SITE}/api/mcp`,
        type: 'mcp'
      }),
      signal: AbortSignal.timeout(10000)
    });
    console.log(`  Smithery.ai: ${res.status}`);
  } catch (e) {
    console.log(`  Smithery.ai: ${e.message}`);
  }
}

// ===== GENERATE REPORT =====
async function generateReport() {
  console.log('\n========================================');
  console.log('📊 DISTRIBUTION REPORT');
  console.log('========================================');
  
  // Import fs dynamically
  const fs = await import('fs');
  
  // Check traffic
  try {
    const traffic = JSON.parse(fs.readFileSync('/root/automaton/data/traffic.json', 'utf8'));
    const topPages = Object.entries(traffic.pages || {})
      .sort((a,b) => b[1] - a[1])
      .slice(0, 5);
    
    console.log(`\n  Traffic: ${traffic.totalVisits || 0} total visits`);
    console.log(`  Referrers: ${Object.keys(traffic.referrers || {}).length}`);
    console.log(`  Pages tracked: ${Object.keys(traffic.pages || {}).length}`);
    if (topPages.length > 0) {
      console.log(`  Top pages:`);
      topPages.forEach(([p, c]) => console.log(`    ${p}: ${c} visits`));
    }
  } catch {
    console.log(`\n  Traffic: No data yet (gateway needs host restart to track)`);
  }
  
  // Check API keys
  try {
    const apiKeys = JSON.parse(fs.readFileSync('/root/automaton/api-keys.json', 'utf8'));
    const entries = Object.entries(apiKeys);
    const paid = entries.filter(([,k]) => k.price_id && k.price_id !== 'dev_trial');
    const totalCredits = entries.reduce((s, [,k]) => s + (k.credits || 0), 0);
    const usedCredits = entries.reduce((s, [,k]) => s + ((k.used || 0) * 3), 0);
    
    console.log(`\n  API Keys: ${entries.length} total, ${paid.length} paid`);
    console.log(`  Credits: ${totalCredits} remaining, ${usedCredits} used`);
    console.log(`  Utilization: ${totalCredits > 0 ? ((usedCredits / (totalCredits + usedCredits)) * 100).toFixed(2) : 0}%`);
    console.log(`  Revenue: ~$${paid.length * 5}`);
    
    if (paid.length > 0) {
      console.log(`  Paid users:`);
      paid.forEach(([k, v]) => console.log(`    ${k.substring(0, 16)}...: ${v.credits} credits left`));
    }
  } catch (e) {
    console.log(`\n  API Keys: Error reading file - ${e.message}`);
  }
  
  console.log(`\n========================================`);
  console.log(`📋 MANUAL NEXT STEPS:`);
  console.log(`1. Submit to ClawHunt: https://clawhunt.com/tools`);
  console.log(`2. Post to dev.to: node scripts/devto-post.mjs <KEY>`);
  console.log(`3. Submit to Hacker News: https://news.ycombinator.com/submit`);
  console.log(`4. Submit ProductHunt: https://www.producthunt.com/posts/new`);
  console.log(`5. Submit to Google Search Console`);
  console.log(`6. PR to awesome-ai-agents on GitHub`);
  console.log(`========================================`);
}

// ===== MAIN =====
async function main() {
  console.log('========================================');
  console.log('🚀 my-automaton DISTRIBUTION ENGINE');
  console.log(`📅 ${new Date().toISOString()}`);
  console.log(`🌐 ${SITE}`);
  console.log(`💰 ${WALLET}`);
  console.log('========================================');
  
  const publicOk = await checkPublicAccess();
  
  if (publicOk) {
    await pingSearchEngines();
    await submitToDirectories();
  } else {
    console.log('\n⚠️  Some endpoints not accessible. Check gateway status.');
    console.log('Gateway may need HOST restart: sudo systemctl restart automaton-gateway');
  }
  
  await generateReport();
  console.log('\n✅ Distribution check complete!');
}

main().catch(e => console.error('Error:', e.message));
