#!/usr/bin/env node
/**
 * seo-ping.mjs — Ping search engines with correct .html URLs
 * Run: node /root/automaton/scripts/seo-ping.mjs
 */
const DOMAIN = 'automation.songheng.vip';
const URLS = [
  '/', '/demo.html', '/api-docs.html', '/upgrade.html', '/dashboard.html',
  '/blog.html', '/ci-cd-integration.html',
  '/blog/free-ai-code-review-api.html',
  '/blog/ai-code-review-deepseek.html',
  '/blog/free-ai-code-review-api-comparison-2026.html',
  '/blog/ai-vs-linters-2026.html',
  '/blog/ai-code-review-vs-copilot.html',
  '/blog/ai-security-scanning-tools.html',
  '/blog/reduce-technical-debt-ai.html',
  '/blog/why-choose-ai-code-review.html',
  '/blog/ai-vs-manual-code-review.html',
  '/blog/code-review-etiquette-ai.html',
  '/blog/automated-code-review-python.html',
  '/blog/ci-cd-pipeline-security.html',
  '/blog/code-review-checklist-javascript.html',
  '/blog/code-review-guidelines-java.html',
  '/blog/code-review-tools-2026.html',
  '/blog/improve-code-quality-ai.html',
  '/blog/setup-automated-code-review.html',
  '/blog/best-practices-code-review.html',
  '/blog/frontend-code-review-checklist.html',
  '/blog/security-code-review-checklist.html',
  '/blog/peer-review-vs-ai-review.html',
  '/blog/ai-code-review-accuracy.html',
  '/blog/ai-code-review-api.html',
  '/sitemap.xml', '/robots.txt',
];

async function checkUrls() {
  const results = [];
  for (const path of URLS.slice(0, 10)) { // check first 10
    try {
      const r = await fetch(`http://localhost:8080${path}`, { method: 'HEAD', signal: AbortSignal.timeout(3000) });
      results.push({ path, status: r.status, ok: r.status < 400 });
    } catch (e) {
      results.push({ path, status: 0, ok: false, error: e.message });
    }
  }
  return results;
}

async function pingGoogle(urls) {
  const full = urls.map(u => `https://${DOMAIN}${u}`);
  for (const url of full.slice(0, 10)) {
    try {
      const r = await fetch(`https://www.google.com/ping?sitemap=${encodeURIComponent(url)}`, { signal: AbortSignal.timeout(5000) });
      console.log(`  Google ping ${url}: ${r.status}`);
    } catch {}
  }
}

async function pingBing() {
  try {
    const r = await fetch(`https://www.bing.com/ping?sitemap=https://${DOMAIN}/sitemap.xml`, { signal: AbortSignal.timeout(5000) });
    console.log(`  Bing ping: ${r.status}`);
  } catch (e) { console.log(`  Bing ping error: ${e.message}`); }
}

async function main() {
  console.log(`\n=== SEO Ping — ${new Date().toISOString()} ===\n`);
  
  // Check URLs
  console.log('Checking URLs (first 10)...');
  const results = await checkUrls();
  const ok = results.filter(r => r.ok).length;
  for (const r of results) {
    console.log(`  ${r.path}: ${r.ok ? '✅' : '⚠️'} ${r.status}`);
  }
  console.log(`\n${ok}/${results.length} OK\n`);
  
  // Ping
  console.log('Pinging search engines...');
  await pingBing();
  await pingGoogle(URLS);
  
  console.log('\n=== Done ===');
}

main().catch(e => { console.error(e); process.exit(1); });
