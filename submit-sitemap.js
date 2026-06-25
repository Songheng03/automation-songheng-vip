#!/usr/bin/env node
/**
 * Search Console Submission Script
 * Submits sitemap.xml to Google and Bing search engines
 * Run: node submit-sitemap.js
 */

const sitemapUrl = 'https://automation.songheng.vip/sitemap.xml';
const siteUrl = 'https://automation.songheng.vip';

async function main() {
  const results = [];

  // 1. Google Indexing API (ping)
  try {
    const googleRes = await fetch(
      `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`,
      { method: 'GET' }
    );
    results.push({ engine: 'Google', url: googleRes.url, status: googleRes.status, body: (await googleRes.text()).slice(0, 200) });
  } catch (e) {
    results.push({ engine: 'Google', error: e.message });
  }

  // 2. Bing / IndexNow
  try {
    const bingRes = await fetch(
      `https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`,
      { method: 'GET' }
    );
    results.push({ engine: 'Bing', url: bingRes.url, status: bingRes.status, body: (await bingRes.text()).slice(0, 200) });
  } catch (e) {
    results.push({ engine: 'Bing', error: e.message });
  }

  // 3. IndexNow (shared protocol - Bing + Yandex)
  try {
    const indexNowRes = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        host: new URL(siteUrl).hostname,
        key: 'c6aa3a8246b64d1eb9a97d5cf1e8b607',
        keyLocation: `${siteUrl}/c6aa3a8246b64d1eb9a97d5cf1e8b607.txt`,
        urlList: [siteUrl + '/']
      })
    });
    results.push({ engine: 'IndexNow', status: indexNowRes.status, body: (await indexNowRes.text()).slice(0, 200) });
  } catch (e) {
    results.push({ engine: 'IndexNow', error: e.message });
  }

  console.log(JSON.stringify(results, null, 2));
}

main().catch(console.error);
