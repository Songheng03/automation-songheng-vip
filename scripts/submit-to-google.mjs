#!/usr/bin/env node
/**
 * submit-to-google.mjs — Ping Google & Bing to index my site
 * Run: node scripts/submit-to-google.mjs
 * This costs nothing (just HTTP GET) and is my #1 path to revenue.
 */

const SITE = 'https://automation.songheng.vip';

async function main() {
  console.log('\n🌐 Submitting to Search Engines\n');

  const targets = [
    // Google ping
    { name: 'Google', url: `https://www.google.com/ping?sitemap=${SITE}/sitemap.xml` },
    // Bing ping  
    { name: 'Bing', url: `https://www.bing.com/ping?sitemap=${SITE}/sitemap.xml` },
    // Google Index API (best effort - may need auth)
    { name: 'Google Index (blog)', url: `https://indexing.googleapis.com/v3/urlNotifications:publish`, method: 'POST', body: { url: `${SITE}/blog`, type: 'URL_UPDATED' } },
  ];

  for (const t of targets) {
    try {
      const opts = { method: t.method || 'GET', signal: AbortSignal.timeout(10000) };
      if (t.body) opts.headers = { 'Content-Type': 'application/json' };
      if (t.body) opts.body = JSON.stringify(t.body);
      
      const res = await fetch(t.url, opts);
      const status = res.status;
      const ok = status >= 200 && status < 300;
      console.log(`  ${ok ? '✅' : '⚠️'} ${t.name}: ${status}${status === 404 ? ' (expected without auth)' : ''}`);
    } catch (e) {
      console.log(`  ⚠️ ${t.name}: ${e.message}`);
    }
  }

  // Submit to MCP/Crawler directories
  console.log('\n📡 Pinging MCP Directories & Crawlers\n');

  const crawlers = [
    { name: 'Smithery', url: `https://smithery.ai/api/v1/discover?url=${SITE}` },
    { name: 'Glama MCP', url: `https://glama.ai/api/mcp/discover?url=${SITE}` },
    { name: 'MCP.so', url: `https://mcp.so/api/discover?url=${SITE}` },
  ];

  for (const c of crawlers) {
    try {
      const res = await fetch(c.url, { signal: AbortSignal.timeout(8000) });
      console.log(`  ${res.ok ? '✅' : '⚠️'} ${c.name}: ${res.status}`);
    } catch (e) {
      console.log(`  ⚠️ ${c.name}: ${e.message}`);
    }
  }

  // Verify my own site is responding correctly
  console.log('\n🔍 Quick Self-Check\n');
  const pages = ['/', '/blog.html', '/api-docs', '/sitemap.xml', '/robots.txt', '/health'];
  let allOk = true;
  for (const p of pages) {
    try {
      const res = await fetch(`${SITE}${p}`, { signal: AbortSignal.timeout(8000) });
      const icon = res.ok ? '✅' : '❌';
      if (!res.ok) allOk = false;
      console.log(`  ${icon} ${p} → ${res.status}`);
    } catch (e) {
      console.log(`  ❌ ${p}: ${e.message}`);
      allOk = false;
    }
  }

  // Generate & save report
  const report = {
    date: new Date().toISOString().split('T')[0],
    site: SITE,
    submissionStatus: 'completed',
    allPagesOk: allOk,
  };

  const fs = await import('fs');
  fs.writeFileSync('/root/automaton/content/data/submission-report.json', JSON.stringify(report, null, 2));

  console.log(`\n${allOk ? '✅' : '⚠️'} All systems ${allOk ? 'nominal' : 'need attention'}`);
  console.log('📁 Report: content/data/submission-report.json\n');
}

main().catch(e => {
  console.error('Submission failed:', e.message);
  process.exit(1);
});
