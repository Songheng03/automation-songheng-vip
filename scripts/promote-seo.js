#!/usr/bin/env node
/**
 * promote-seo-heartbeat.js — Runs SEO refresh + IndexNow ping
 * Called by heartbeat every 6 hours
 * Minimizes AI calls — this is primarily static file generation + HTTP pings
 */
const fs = require('fs');
const path = require('path');

const SITE = 'https://automation.songheng.vip';
const CONTENT = '/root/automaton/content';
const BLOG_DIR = path.join(CONTENT, 'blog');
const DATA = '/root/automaton/data';

function log(m) {
  const s = `[${new Date().toISOString().slice(0,19)}] ${m}`;
  console.log(s);
  try { fs.appendFileSync(path.join(DATA, 'promote.log'), s + '\n'); } catch(e) {}
}

// Regenerate sitemap
function generateSitemap() {
  const urls = [];
  
  // Core static pages
  const core = ['/', '/api-docs', '/blog', '/tools', '/upgrade', '/share', '/playground', '/dashboard', '/submit-checklist'];
  for (const u of core) urls.push({ url: u, priority: '0.9', changefreq: 'daily' });
  
  // API endpoints (for catalog/health)
  urls.push({ url: '/api/catalog', priority: '0.7', changefreq: 'daily' });
  urls.push({ url: '/api/health', priority: '0.5', changefreq: 'hourly' });
  
  // Blog articles
  if (fs.existsSync(BLOG_DIR)) {
    for (const f of fs.readdirSync(BLOG_DIR).filter(f => f.endsWith('.html') && f !== 'feed.html')) {
      urls.push({ url: `/blog/${f.replace('.html','')}`, priority: '0.6', changefreq: 'weekly' });
    }
  }
  
  // Tools
  const toolsDir = path.join(CONTENT, 'tools');
  if (fs.existsSync(toolsDir)) {
    for (const f of fs.readdirSync(toolsDir).filter(f => f.endsWith('.html'))) {
      urls.push({ url: `/tools/${f.replace('.html','')}`, priority: '0.6', changefreq: 'weekly' });
    }
  }
  
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${SITE}${u.url}</loc><priority>${u.priority}</priority><changefreq>${u.changefreq}</changefreq></url>`).join('\n')}
</urlset>`;
  
  fs.writeFileSync(path.join(CONTENT, 'sitemap.xml'), xml);
  log(`✅ Sitemap: ${urls.length} URLs`);
  return urls.slice(0, 10);
}

// Ping IndexNow
async function pingIndexNow(urls) {
  const KEY = '16bdf78d71af45b3bed604cc6ad7dd34';
  let ok = 0, fail = 0;
  
  for (const u of urls) {
    try {
      const r = await fetch(`https://www.bing.com/IndexNow?url=${SITE}${encodeURI(u.url)}&key=${KEY}`);
      if (r.ok) ok++; else fail++;
    } catch(e) { fail++; }
  }
  
  log(`✅ IndexNow: ${ok} OK, ${fail} failed (${urls.length} URLs)`);
}

// Update blog.json
function updateBlogJson() {
  if (!fs.existsSync(BLOG_DIR)) return;
  
  const articles = [];
  for (const f of fs.readdirSync(BLOG_DIR).sort().reverse()) {
    if (!f.endsWith('.html') || f === 'feed.html') continue;
    const fp = path.join(BLOG_DIR, f);
    const content = fs.readFileSync(fp, 'utf8');
    const title = (content.match(/<title>([^<]+)<\/title>/) || [,''])[1] || f.replace('.html','');
    const desc = (content.match(/<meta name="description" content="([^"]+)"/) || [,''])[1] || '';
    const date = (content.match(/<meta name="article:published_time" content="([^"]+)"/) || [,''])[1] || '';
    
    articles.push({
      title, slug: f.replace('.html',''),
      description: desc,
      date: date,
      url: `${SITE}/blog/${f.replace('.html','')}`
    });
  }
  
  fs.writeFileSync(path.join(CONTENT, 'blog.json'), JSON.stringify(articles, null, 2));
  fs.writeFileSync(path.join(DATA, 'blog-count.txt'), String(articles.length));
  log(`✅ Blog JSON: ${articles.length} articles`);
}

// Summary
async function main() {
  log('=== SEO Refresh ===');
  const urls = generateSitemap();
  await pingIndexNow(urls);
  updateBlogJson();
  log('✅ SEO Refresh Complete');
}

main().catch(e => log(`❌ Error: ${e.message}`));
