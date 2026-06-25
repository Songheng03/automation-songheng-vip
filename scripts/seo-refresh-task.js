#!/usr/bin/env node
/**
 * seo-refresh-task.js — Heartbeat task for SEO Refresh
 * Called by the heartbeat system every 6 hours.
 * Regenerates sitemap, RSS, blog.json, and pings IndexNow.
 * No port listening needed — pure file operations + HTTPS.
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

const BASE = 'https://automation.songheng.vip';
const CONTENT = '/root/automaton/content';
const DATA = '/root/automaton/data';
const INDEXNOW_KEY = 'cbf7810238344b6bb137e3f395585e21';

console.log(`[seo-refresh] Starting at ${new Date().toISOString()}`);

// ─── Walk directory for HTML pages ───
const pages = [];
function walk(dir, prefix) {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) { walk(full, prefix + '/' + e.name); continue; }
      if (!e.name.endsWith('.html')) continue;
      const slug = e.name === 'index.html' ? '' : e.name.replace(/\.html$/, '');
      const url = BASE + prefix + '/' + slug;
      const stat = fs.statSync(full);
      const priority = e.name === 'index.html' ? 1.0 : 
        prefix.includes('/tools') ? 0.8 : prefix.includes('/blog') ? 0.8 : 0.7;
      pages.push({ url, lastmod: stat.mtime.toISOString().slice(0, 10), priority });
    }
  } catch(e) { console.error('walk error:', e.message); }
}

walk(CONTENT, '');
console.log(`  Found ${pages.length} HTML pages`);

// ─── Generate sitemap ───
let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
for (const p of pages) xml += `  <url><loc>${p.url}</loc><lastmod>${p.lastmod}</lastmod><priority>${p.priority}</priority></url>\n`;
xml += '</urlset>';
fs.writeFileSync(path.join(CONTENT, 'sitemap.xml'), xml);
console.log(`  sitemap.xml: ${pages.length} URLs`);

// ─── Generate blog.json ───
const blogPages = pages.filter(p => p.url.includes('/blog/'));
const blogJson = blogPages.map(p => ({ 
  url: p.url,
  title: decodeURIComponent(p.url.split('/').pop().replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())),
  date: p.lastmod 
}));
fs.writeFileSync(path.join(CONTENT, 'blog.json'), JSON.stringify(blogJson, null, 2));
console.log(`  blog.json: ${blogJson.length} entries`);

// ─── Ensure IndexNow key ───
const keyFile = path.join(CONTENT, `${INDEXNOW_KEY}.txt`);
if (!fs.existsSync(keyFile)) fs.writeFileSync(keyFile, INDEXNOW_KEY);
console.log(`  IndexNow key: ${INDEXNOW_KEY}`);

// ─── Ping IndexNow ───
function pingIndexNow() {
  return new Promise((resolve) => {
    const urls = pages.slice(0, 100).map(p => p.url);
    const payload = JSON.stringify({
      host: 'automation.songheng.vip',
      key: INDEXNOW_KEY,
      keyLocation: `${BASE}/${INDEXNOW_KEY}.txt`,
      urlList: urls
    });

    const req = https.request({
      hostname: 'api.indexnow.org',
      path: '/indexnow',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
    }, res => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => resolve({ code: res.statusCode, body: body.slice(0, 100) }));
    });
    req.on('error', e => resolve({ code: 0, error: e.message }));
    req.write(payload);
    req.end();
  });
}

pingIndexNow().then(r => {
  console.log(`  IndexNow: ${r.code} ${r.body || r.error || ''}`);
  fs.mkdirSync(DATA, { recursive: true });
  fs.writeFileSync(path.join(DATA, 'seo-last-ping.json'), JSON.stringify({
    ts: new Date().toISOString(), result: r, urls: pages.length
  }, null, 2));
  console.log(`[seo-refresh] Complete at ${new Date().toISOString()}`);
}).catch(e => console.error('IndexNow error:', e.message));
