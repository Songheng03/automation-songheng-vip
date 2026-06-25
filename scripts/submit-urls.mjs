#!/usr/bin/env node
/**
 * submit-urls.mjs — Submit sitemap URLs to IndexNow + Google/Bing
 * Uses Node fetch (no curl needed, works in Docker)
 * Run: node /root/automaton/scripts/submit-urls.mjs
 */
import fs from 'fs';
import process from 'child_process';

const DOMAIN = 'automation.songheng.vip';
const INDEXNOW_KEY = 'd74f7914325f4a0698288eabcf5f6229';

async function submitIndexNow(urls) {
  const body = {
    host: DOMAIN,
    key: INDEXNOW_KEY,
    keyLocation: `https://${DOMAIN}/${INDEXNOW_KEY}.txt`,
    urlList: urls
  };

  try {
    const res = await fetch('https://api.indexnow.org/IndexNow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const text = await res.text();
    console.log(`IndexNow [${res.status}]: ${text || 'Accepted'}`);
    return res.ok;
  } catch (e) {
    console.error('IndexNow failed:', e.message);
    return false;
  }
}

async function submitGoogle(urls) {
  // Google Indexing API — ping the update URL
  for (const url of urls.slice(0, 10)) { // limit to 10
    try {
      const pingUrl = `https://www.google.com/ping?sitemap=${encodeURIComponent(url)}`;
      const res = await fetch(pingUrl, { method: 'GET' });
      console.log(`Google ping [${res.status}]: ${url.slice(0, 60)}...`);
    } catch (e) {
      console.error(`Google ping failed for ${url}:`, e.message);
    }
  }
}

async function submitBing(urls) {
  for (const url of urls.slice(0, 10)) {
    try {
      const pingUrl = `https://www.bing.com/ping?sitemap=${encodeURIComponent(url)}`;
      const res = await fetch(pingUrl, { method: 'GET' });
      console.log(`Bing ping [${res.status}]: ${url.slice(0, 60)}...`);
    } catch (e) {
      console.error(`Bing ping failed:`, e.message);
    }
  }
}

// Generate a submission file for manual use
function generateSubmissionFile(urls) {
  const html = `<!DOCTYPE html>
<html><head><title>URL Submission Report</title>
<style>body{font-family:sans-serif;max-width:800px;margin:20px auto;background:#0d1117;color:#c9d1d9;padding:20px}
h1{color:#fff}ol{line-height:1.8}li{color:#8b949e}li a{color:#58a6ff}
.success{color:#3fb950}.fail{color:#f85149}</style></head>
<body>
<h1>📤 URL Submission Report</h1>
<p>${urls.length} URLs submitted to IndexNow, Google, Bing</p>
<h2>Search Console Links</h2>
<ul>
<li><a href="https://search.google.com/search-console?resource_id=sc%3Ahttps%3A%2F%2F${DOMAIN}%2F">Google Search Console</a></li>
<li><a href="https://www.bing.com/webmasters/home">Bing Webmaster Tools</a></li>
</ul>
<h2>Submitted URLs</h2>
<ol>${urls.map(u => `<li><a href="${u}">${u}</a></li>`).join('\n')}</ol>
</body></html>`;
  fs.writeFileSync('/root/automaton/content/submission-report.html', html);
  console.log('✅ Report written to content/submission-report.html');
}

// Main
async function main() {
  const sitemap = fs.readFileSync('/root/automaton/content/sitemap.xml', 'utf8');
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  console.log(`📊 Found ${urls.length} URLs in sitemap`);

  // Submit in batches of 10
  let ok = 0, fail = 0;
  for (let i = 0; i < Math.min(urls.length, 100); i += 10) {
    const batch = urls.slice(i, i + 10);
    const result = await submitIndexNow(batch);
    if (result) ok += batch.length;
    else fail += batch.length;
    await new Promise(r => setTimeout(r, 500)); // rate limit
  }

  console.log(`\n✅ IndexNow: ${ok} submitted, ${fail} failed`);

  // Also ping Google and Bing
  console.log('\n📡 Pinging search engines...');
  await submitGoogle(urls);
  await submitBing(urls);

  generateSubmissionFile(urls);

  console.log('\n✅ All done!');
  console.log(`Next steps:
  1. Go to https://search.google.com/search-console
  2. Add property: https://${DOMAIN}
  3. Verify ownership (use HTML tag or DNS)
  4. Submit sitemap: https://${DOMAIN}/sitemap.xml`);
}

main().catch(console.error);
