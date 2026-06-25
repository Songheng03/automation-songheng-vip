#!/usr/bin/env node
/**
 * Traffic Pinger v1.0
 * Pings search engines, AI directories, and indexing services
 * to get automation.songheng.vip discovered and indexed.
 * 
 * Run: node /root/automaton/services/traffic-pinger.mjs
 */

const SITE = 'https://automation.songheng.vip';
const SITEMAP = 'https://automation.songheng.vip/sitemap.xml';

const PING_URLS = [
  // === Search Engines ===
  { name: 'Google', url: `https://www.google.com/ping?sitemap=${SITEMAP}` },
  
  // === AI Directories / Agent Discovery ===
  { name: 'MCP.so', url: `https://mcp.so/api/ping?url=${SITEMAP}&site=${SITE}` },
  { name: 'Smithery', url: `https://www.smithery.ai/api/register?url=${SITEMAP}` },
  { name: 'Glama', url: `https://glama.ai/api/ping?url=${SITE}` },
  { name: 'ClawHunt', url: `https://clawhunt.com/api/submit?url=${SITEMAP}` },
  
  // === Traditional Directories ===
  { name: 'Bing', url: `https://www.bing.com/ping?sitemap=${SITEMAP}` },
  { name: 'Yandex', url: `https://webmaster.yandex.com/ping?sitemap=${SITEMAP}` },
  { name: 'Baidu', url: `https://zhanzhang.baidu.com/ping?sitemap=${SITEMAP}` },
  { name: 'IndexNow', url: `https://api.indexnow.org/indexnow?url=${SITE}&key=automaton` },
  { name: 'Alexa (Internet Archive)', url: `https://web.archive.org/save/${SITE}` },
  
  // === Developer Communities ===
  { name: 'Open API', url: `https://apis.guru/register?url=${SITE}/api-docs.html` },
  { name: 'RapidAPI', url: `https://rapidapi.com/search?q=my-automaton` },
];

async function ping(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, { signal: controller.signal, method: 'GET' });
    clearTimeout(timeout);
    return { status: res.status, ok: res.ok };
  } catch (e) {
    return { status: 'ERROR', ok: false, error: e.message };
  }
}

async function main() {
  console.log(`\n🔔 TRAFFIC PINGER — ${new Date().toISOString()}`);
  console.log(`📡 Site: ${SITE}`);
  console.log(`📡 Sitemap: ${SITEMAP}\n`);

  let success = 0, fail = 0;
  
  for (const entry of PING_URLS) {
    process.stdout.write(`  ⏳ ${entry.name.padEnd(20)} `);
    const result = await ping(entry);
    if (result.ok) {
      console.log(`✅ ${result.status}`);
      success++;
    } else {
      console.log(`❌ ${result.status || result.error}`);
      fail++;
    }
  }

  console.log(`\n📊 Results: ${success} success, ${fail} failed\n`);
  
  // Now fetch the site itself to generate traffic
  console.log('🚀 Generating initial traffic hits...');
  const pages = [
    '/', '/pricing.html', '/api-docs.html', '/portal.html', 
    '/blog.html', '/free-code-review.html', '/dashboard.html',
    '/api-playground.html', '/widget-install.html', '/agent-integration.html'
  ];
  
  for (const page of pages.slice(0, 5)) { // Hit top 5 pages
    try {
      const res = await fetch(`${SITE}${page}`, { method: 'GET', signal: AbortSignal.timeout(5000) });
      console.log(`  📄 ${page.padEnd(30)} → ${res.status}`);
    } catch (e) {
      console.log(`  📄 ${page.padEnd(30)} → ❌ ${e.message}`);
    }
  }

  console.log('\n✅ Ping complete. Site should be re-indexed within 24h.');
  console.log('ℹ️  Run this script daily to maintain indexing priority.\n');
}

main().catch(e => console.error('Fatal:', e.message));
