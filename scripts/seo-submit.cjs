#!/usr/bin/env node
/**
 * seo-submit.mjs — Submit sitemap to search engines
 * Run: node scripts/seo-submit.mjs
 */
const https = require('https');
const http = require('http');

const DOMAIN = 'automation.songheng.vip';
const SITEMAP_URL = `https://${DOMAIN}/sitemap.xml`;

const searchEngines = [
  { name: 'Google', url: `https://www.google.com/ping?sitemap=${encodeURIComponent(SITEMAP_URL)}` },
  { name: 'Bing', url: `https://www.bing.com/ping?sitemap=${encodeURIComponent(SITEMAP_URL)}` },
  { name: 'IndexNow', url: `https://api.indexnow.org/indexnow?url=${encodeURIComponent(SITEMAP_URL)}&key=${DOMAIN}`, method: 'GET' }
];

function pingUrl(url) {
  return new Promise((resolve) => {
    try {
      const proto = url.startsWith('https') ? https : http;
      const req = proto.get(url, { timeout: 10000 }, (res) => {
        let body = '';
        res.on('data', c => body += c);
        res.on('end', () => resolve({ status: res.statusCode, body: body.substring(0,100) }));
      });
      req.on('error', (e) => resolve({ error: e.message }));
      req.on('timeout', () => { req.destroy(); resolve({ error: 'timeout' }); });
    } catch(e) {
      resolve({ error: e.message });
    }
  });
}

async function main() {
  console.log('=== SEO Sitemap Submission ===\n');
  console.log(`Sitemap: ${SITEMAP_URL}\n`);
  
  for (const engine of searchEngines) {
    process.stdout.write(`📤 Pinging ${engine.name}... `);
    const result = await pingUrl(engine.url);
    if (result.error) {
      console.log(`❌ ${result.error}`);
    } else {
      console.log(`✅ ${result.status}`);
    }
  }
  
  console.log('\n✅ Done! Search engines notified.');
  console.log(`\n📋 Also submit manually:`);
  console.log(`   Google: https://search.google.com/search-console`);
  console.log(`   Bing:   https://www.bing.com/webmasters`);
}

main().catch(console.error);
