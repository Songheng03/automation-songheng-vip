#!/usr/bin/env node
/**
 * seo-refresh.js — Sitemap + RSS + IndexNow ping
 * Runs as a heartbeat: promote-seo every 6 hours
 * No external dependencies — uses only built-in Node.js APIs
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

const BASE = 'https://automation.songheng.vip';
const CONTENT = '/root/automaton/content';
const DATA = '/root/automaton/data';

// ─── Discover all HTML pages ───
function walk(dir, prefix, pages) {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full, prefix + '/' + entry.name, pages);
      } else if (entry.name.endsWith('.html')) {
        const slug = entry.name === 'index.html' ? '' : entry.name.replace(/\.html$/, '');
        const urlPath = prefix + '/' + slug;
        const stat = fs.statSync(full);
        const priority = entry.name === 'index.html' ? 1.0 : 
          urlPath.startsWith('/tools/') ? 0.8 :
          urlPath.startsWith('/blog/') ? 0.8 : 0.7;
        pages.push({
          url: BASE + urlPath,
          lastmod: stat.mtime.toISOString().slice(0, 10),
          priority,
          path: full
        });
      }
    }
  } catch (e) {
    console.error(`  Error walking ${dir}: ${e.message}`);
  }
}

// ─── Generate sitemap ───
function generateSitemap(pages) {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  for (const p of pages) {
    xml += `  <url><loc>${p.url}</loc><lastmod>${p.lastmod}</lastmod><priority>${p.priority}</priority></url>\n`;
  }
  xml += '</urlset>';
  return xml;
}

// ─── Generate RSS from blog articles ───
function generateRSS(pages) {
  const articles = pages.filter(p => p.url.includes('/blog/')).slice(0, 20);
  let rss = '<?xml version="1.0" encoding="UTF-8"?>\n';
  rss += '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n';
  rss += '  <channel>\n';
  rss += '    <title>my-automaton Blog</title>\n';
  rss += `    <link>${BASE}/blog</link>\n`;
  rss += '    <description>AI agent services, developer tools, and autonomous agent economy</description>\n';
  rss += '    <language>en-us</language>\n';
  rss += `    <atom:link href="${BASE}/rss.xml" rel="self" type="application/rss+xml"/>\n`;
  for (const a of articles) {
    const title = a.url.split('/').pop().replace(/-/g, ' ') || 'New Article';
    rss += '    <item>\n';
    rss += `      <title>${title}</title>\n`;
    rss += `      <link>${a.url}</link>\n`;
    rss += `      <guid>${a.url}</guid>\n`;
    rss += `      <pubDate>${new Date(a.lastmod).toUTCString()}</pubDate>\n`;
    rss += '    </item>\n';
  }
  rss += '  </channel>\n</rss>';
  return rss;
}

// ─── IndexNow ping ───
function pingIndexNow(urls) {
  return new Promise((resolve, reject) => {
    const key = (() => {
      try { return fs.readFileSync(path.join(CONTENT, 'indexnow-key.txt'), 'utf8').trim(); } catch(e) { return null; }
    })();
    
    const payload = JSON.stringify({
      host: 'automation.songheng.vip',
      key: key || 'cbf7810238344b6bb137e3f395585e21',
      keyLocation: `${BASE}/${key || 'cbf7810238344b6bb137e3f395585e21'}.txt`,
      urlList: urls.slice(0, 100)
    });

    const req = https.request({
      hostname: 'api.indexnow.org',
      path: '/indexnow',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': payload.length }
    }, res => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        console.log(`  IndexNow: ${res.statusCode} ${body.slice(0, 80)}`);
        resolve({ status: res.statusCode, body });
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// ─── Main ───
async function main() {
  console.log(`[SEO Refresh] ${new Date().toISOString()}`);
  const pages = [];
  walk(CONTENT, '', pages);
  console.log(`  Found ${pages.length} HTML pages`);

  // Generate sitemap
  const sitemapXml = generateSitemap(pages);
  fs.writeFileSync(path.join(CONTENT, 'sitemap.xml'), sitemapXml);
  console.log(`  Sitemap written: ${pages.length} URLs`);

  // Generate RSS
  const rssXml = generateRSS(pages);
  fs.writeFileSync(path.join(CONTENT, 'rss.xml'), rssXml);
  const blogCount = pages.filter(p => p.url.includes('/blog/')).length;
  console.log(`  RSS written: ${blogCount} blog articles indexed`);

  // Ensure IndexNow key
  const keyPath = path.join(CONTENT, 'cbf7810238344b6bb137e3f395585e21.txt');
  if (!fs.existsSync(keyPath)) {
    fs.writeFileSync(keyPath, 'cbf7810238344b6bb137e3f395585e21');
  }

  // Regenerate blog.json
  const blogPages = pages.filter(p => p.url.includes('/blog/'));
  const blogJson = blogPages.map(p => ({
    url: p.url,
    title: p.url.split('/').pop().replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    date: p.lastmod
  }));
  fs.writeFileSync(path.join(CONTENT, 'blog.json'), JSON.stringify(blogJson, null, 2));
  console.log(`  blog.json written: ${blogJson.length} entries`);

  // Ping IndexNow
  try {
    const allUrls = pages.map(p => p.url);
    const result = await pingIndexNow(allUrls);
    // Write log
    const logDir = path.join(DATA);
    fs.mkdirSync(logDir, { recursive: true });
    const log = { ts: new Date().toISOString(), urls: allUrls.length, indexNow: result };
    fs.writeFileSync(path.join(logDir, 'seo-last-ping.json'), JSON.stringify(log, null, 2));
  } catch (e) {
    console.error(`  IndexNow error: ${e.message}`);
  }

  console.log(`[SEO Refresh Complete]`);
}

main().catch(e => console.error('SEO refresh failed:', e.message));
