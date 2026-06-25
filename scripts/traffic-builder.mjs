#!/usr/bin/env node
/**
 * traffic-builder.mjs — Ping search engines and submit sitemap
 * 
 * Run daily: node /root/automaton/scripts/traffic-builder.mjs
 * Pings Google, Bing, Yandex, and IndexNow to get pages indexed.
 * Also generates a fresh sitemap pointing to all content.
 */

import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';

const DOMAIN = 'automation.songheng.vip';
const CONTENT = '/root/automaton/content';
const SITEMAP_PATH = '/root/automaton/content/sitemap.xml';

// ── Build fresh sitemap ──

function buildSitemap() {
  const docs = new Date().toISOString().split('T')[0];
  const urls = [];

  // Root pages
  const pages = fs.readdirSync(CONTENT).filter(f => f.endsWith('.html'));
  for (const p of pages) {
    urls.push(`https://${DOMAIN}/${p}`);
  }

  // Blog articles
  const blogDir = path.join(CONTENT, 'blog');
  if (fs.existsSync(blogDir)) {
    const blogs = fs.readdirSync(blogDir).filter(f => f.endsWith('.html'));
    for (const b of blogs) {
      urls.push(`https://${DOMAIN}/blog/${b}`);
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${u}</loc><lastmod>${docs}</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>`).join('\n')}
</urlset>`;

  fs.writeFileSync(SITEMAP_PATH, xml);
  console.log(`📝 Sitemap written: ${urls.length} URLs`);
  return urls;
}

// ── HTTP GET helper ──

function fetch(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, { timeout: 15000 }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    }).on('error', reject).on('timeout', function() { this.destroy(); reject(new Error('timeout')); });
  });
}

// ── Ping search engines ──

const PING_URLS = {
  Google: `https://www.google.com/ping?sitemap=https://${DOMAIN}/sitemap.xml`,
  Bing: `https://www.bing.com/ping?sitemap=https://${DOMAIN}/sitemap.xml`,
  'IndexNow (Yandex)': `https://www.indexnow.org/indexnow?url=https://${DOMAIN}&key=${DOMAIN}`
};

async function pingEngines() {
  const results = [];
  for (const [name, url] of Object.entries(PING_URLS)) {
    try {
      const res = await fetch(url);
      results.push({ engine: name, status: res.status, ok: res.status < 400 });
      console.log(`  ${name}: ${res.status} ${res.status < 400 ? '✅' : '⚠️'}`);
    } catch (e) {
      results.push({ engine: name, status: 'error', ok: false, error: e.message });
      console.log(`  ${name}: ❌ ${e.message}`);
    }
  }
  return results;
}

// ── Check if gateway is alive ──

async function checkGateway() {
  try {
    const res = await fetch(`https://${DOMAIN}/api/health`);
    const data = JSON.parse(res.data);
    console.log(`\n❤️  Gateway health: ${data.status} | Keys: ${data.api_keys} | Blog: ${data.blog_articles}`);
    return data;
  } catch (e) {
    console.log(`\n❌ Gateway unreachable: ${e.message}`);
    return null;
  }
}

// ── Main ──

async function main() {
  console.log('🌐 my-automaton Traffic Builder');
  console.log('='.repeat(40));
  console.log(`Domain: ${DOMAIN}`);
  console.log(`Time: ${new Date().toISOString()}\n`);

  const urls = buildSitemap();
  
  console.log('\n📡 Pinging search engines...');
  const pings = await pingEngines();
  
  const health = await checkGateway();
  
  // Summary
  const ok = pings.filter(p => p.ok).length;
  console.log('\n' + '='.repeat(40));
  console.log(`📊 Summary: ${urls.length} URLs | ${ok}/${pings.length} pings ok`);
  console.log(`💡 Dashboard: https://${DOMAIN}/dashboard.html`);
  console.log(`💡 Stats API: https://${DOMAIN}/api/stats/overview`);
  
  // Save report
  const report = {
    timestamp: new Date().toISOString(),
    urls_count: urls.length,
    pings: pings,
    gateway: health,
    success: ok > 0,
    sitemap: SITEMAP_PATH
  };
  const reportDir = '/root/automaton/data';
  if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(path.join(reportDir, 'traffic-report.json'), JSON.stringify(report, null, 2));
  console.log(`📝 Report saved to data/traffic-report.json`);
}

main().catch(e => console.error('Fatal:', e));
