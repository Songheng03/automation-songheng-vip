#!/usr/bin/env node
/**
 * traffic-scheduler.mjs — Runs all traffic-driving scripts
 * 
 * Usage:
 *   node scripts/traffic-scheduler.mjs --once    # Run all tasks once
 *   node scripts/traffic-scheduler.mjs --watch   # Run every hour
 */

import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE = 'https://automation.songheng.vip';

function fetchUrl(url) {
  return new Promise((resolve) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, { timeout: 8000 }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    req.on('error', e => resolve({ status: 0, error: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 0, error: 'timeout' }); });
  });
}

async function task(name, fn) {
  process.stdout.write(`  ${name}... `);
  try {
    const result = await fn();
    console.log(result ? 'OK' : 'FAIL');
  } catch (e) {
    console.log(`ERR: ${e.message}`);
  }
}

async function pingSearchEngines() {
  // Google
  await fetchUrl(`https://www.google.com/ping?sitemap=${encodeURIComponent(`${SITE}/sitemap.xml`)}`);
  // Bing
  await fetchUrl(`https://www.bing.com/ping?sitemap=${encodeURIComponent(`${SITE}/sitemap.xml`)}`);
  // IndexNow
  const urls = [`${SITE}/`, `${SITE}/sitemap.xml`, `${SITE}/blog.html`];
  for (const url of urls) {
    await fetchUrl(`https://api.indexnow.org/indexnow?url=${encodeURIComponent(url)}&key=${encodeURIComponent(SITE)}`);
  }
  return true;
}

async function checkHealth() {
  const r = await fetchUrl(`${SITE}/`);
  return r.status === 200;
}

async function checkStats() {
  const r = await fetchUrl(`${SITE}/api/stats/overview`);
  if (r.status === 200) {
    try {
      const j = JSON.parse(r.data);
      return { keys: j.apiKeys?.total || 0, revenue: j.revenue?.total || 0 };
    } catch {}
  }
  return null;
}

async function rebuildSitemap() {
  const contentDir = path.resolve(__dirname, '..', 'content');
  const blogDir = path.join(contentDir, 'blog');
  let urls = [`${SITE}/`, `${SITE}/api-docs.html`, `${SITE}/demo.html`, `${SITE}/upgrade.html`, 
    `${SITE}/blog.html`, `${SITE}/install-cli.html`, `${SITE}/install-mcp.html`,
    `${SITE}/readme-badges.html`, `${SITE}/readme-badges.html`];
  
  // Add blog articles
  try {
    const files = fs.readdirSync(blogDir).filter(f => f.endsWith('.html'));
    urls.push(...files.map(f => `${SITE}/blog/${f}`));
  } catch {}
  
  // Add static content pages
  try {
    const files = fs.readdirSync(contentDir).filter(f => f.endsWith('.html') && !f.startsWith('blog/'));
    urls.push(...files.map(f => `${SITE}/${f}`));
  } catch {}
  
  // Remove duplicates
  urls = [...new Set(urls)];
  
  // Write sitemap to content dir (served by gateway)
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  const today = new Date().toISOString().split('T')[0];
  for (const url of urls) {
    xml += `  <url><loc>${url}</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>\n`;
  }
  xml += '</urlset>';
  
  fs.writeFileSync(path.join(contentDir, 'sitemap.xml'), xml);
  return urls.length;
}

async function collectStats() {
  const stats = {
    timestamp: new Date().toISOString(),
    blogCount: 0,
    checks: { homepage: false, sitemap: false, blogs: 0 }
  };
  
  const home = await fetchUrl(`${SITE}/`);
  stats.checks.homepage = home.status === 200;
  
  const sm = await fetchUrl(`${SITE}/sitemap.xml`);
  stats.checks.sitemap = sm.status === 200;
  
  try {
    const blogDir = path.join(path.resolve(__dirname, '..', 'content'), 'blog');
    const files = fs.readdirSync(blogDir).filter(f => f.endsWith('.html'));
    stats.blogCount = files.length;
    
    // Sample check
    let blogOk = 0;
    for (const f of files.slice(0, 3)) {
      const r = await fetchUrl(`${SITE}/blog/${f}`);
      if (r.status === 200) blogOk++;
    }
    stats.checks.blogs = blogOk;
  } catch {}
  
  return stats;
}

async function runAll() {
  console.log(`\n🚀 Traffic Scheduler — ${new Date().toISOString()}\n`);
  
  // Tasks
  await task('Gateway health', checkHealth);
  await task('Rebuild sitemap', async () => { const n = await rebuildSitemap(); return n > 0; });
  await task('Ping search engines', pingSearchEngines);
  
  const st = await collectStats();
  console.log(`\n📊 Stats: ${st.blogCount} blogs, ${st.checks.blogs}/3 sampled, homepage: ${st.checks.homepage}, sitemap: ${st.checks.sitemap}`);
  
  const statsFile = path.resolve(__dirname, '..', 'data', 'traffic-stats.json');
  if (!fs.existsSync(path.dirname(statsFile))) fs.mkdirSync(path.dirname(statsFile), { recursive: true });
  fs.writeFileSync(statsFile, JSON.stringify(st, null, 2));
  
  console.log(`\n✅ Done — ${new Date().toISOString()}\n`);
}

// CLI
const args = process.argv.slice(2);
if (args.includes('--watch')) {
  console.log('⏰ Running every hour. Ctrl+C to stop.\n');
  const run = async () => { try { await runAll(); } catch(e) { console.error('Error:', e.message); } };
  await run();
  setInterval(run, 3600000);
} else {
  await runAll();
}
