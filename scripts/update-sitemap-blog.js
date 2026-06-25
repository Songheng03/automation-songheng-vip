#!/usr/bin/env node
/**
 * update-sitemap-blog.js — Regenerates sitemap.xml, blog.html, blog.json
 * Run: node /root/automaton/scripts/update-sitemap-blog.js
 * Heartbeat: every 2 hours to keep search engines updated
 */
const fs = require('fs');
const path = require('path');

const CONTENT = '/root/automaton/content';
const BASE_URL = 'https://automation.songheng.vip';

// Collect static pages
const staticPages = [
  '/', '/blog', '/api-docs', '/api-playground', '/dashboard',
  '/upgrade', '/tools', '/traffic-stats', '/google-search-console',
  '/ai-code-reviewer', '/live-demo', '/quickstart', '/monitor',
  '/support', '/agent-commerce',
];

// Collect tool pages
const toolPages = fs.readdirSync(path.join(CONTENT, 'tools'))
  .filter(f => f.endsWith('.html'))
  .map(f => '/tools/' + f.replace(/\.html$/, ''));

// Collect blog articles
const blogDir = path.join(CONTENT, 'blog');
const blogFiles = fs.readdirSync(blogDir)
  .filter(f => f.endsWith('.html'))
  .sort();

const blogArticles = blogFiles.map(f => {
  const slug = f.replace(/\.html$/, '');
  const fp = path.join(blogDir, f);
  const stat = fs.statSync(fp);
  let title = slug.replace(/-/g, ' ');
  // Try to extract title from HTML
  const content = fs.readFileSync(fp, 'utf8');
  const titleMatch = content.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  if (titleMatch) title = titleMatch[1].replace(/<[^>]+>/g, '');
  return { slug, title, mtime: stat.mtime, path: fp };
});

// --- Generate sitemap.xml ---
const allUrls = [
  ...staticPages.map(p => ({ url: p, priority: p === '/' ? '1.0' : '0.8', changefreq: 'weekly' })),
  ...toolPages.map(p => ({ url: p, priority: '0.7', changefreq: 'weekly' })),
  ...blogArticles.map(a => ({ url: '/blog/' + a.slug, priority: '0.6', changefreq: 'monthly', lastmod: a.mtime.toISOString().slice(0,10) })),
];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls.map(u => `  <url>
    <loc>${BASE_URL}${u.url}</loc>
    ${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

fs.writeFileSync(path.join(CONTENT, 'sitemap.xml'), sitemap);
console.log(`✅ sitemap.xml: ${allUrls.length} URLs`);

// --- Generate blog.html ---
function blogCard(a) {
  const desc = 'Read our article about ' + a.title.toLowerCase() + '. Free AI-powered code analysis and developer tools.';
  return `<article class="blog-card">
  <h2><a href="/blog/${a.slug}">${a.title}</a></h2>
  <p class="meta">📅 ${a.mtime.toISOString().slice(0,10)} · 🏷️ developer tools, AI, code quality</p>
  <p>${desc.slice(0,160)}...</p>
  <a class="read-more" href="/blog/${a.slug}">Read More →</a>
</article>`;
}

const blogHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Blog — my-automaton AI Developer Tools</title>
<meta name="description" content="Articles about AI-powered code review, security scanning, text analysis, and developer productivity tools.">
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="canonical" href="${BASE_URL}/blog">
<style>
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:900px;margin:0 auto;padding:24px;line-height:1.6;color:#24292f;background:#f6f8fa}
h1{font-size:1.8rem;color:#0969da;margin-bottom:8px}
.subtitle{color:#656d76;margin-bottom:24px}
.blog-card{background:#fff;border:1px solid #d0d7de;border-radius:8px;padding:20px;margin-bottom:16px;transition:border-color .2s}
.blog-card:hover{border-color:#0969da}
.blog-card h2{margin:0 0 8px;font-size:1.15rem}
.blog-card h2 a{color:#0969da;text-decoration:none}
.blog-card h2 a:hover{text-decoration:underline}
.blog-card .meta{color:#656d76;font-size:0.85rem;margin-bottom:8px}
.blog-card p{color:#24292f;font-size:0.9rem;margin-bottom:8px}
.blog-card .read-more{color:#0969da;font-weight:600;font-size:0.9rem;text-decoration:none}
.blog-card .read-more:hover{text-decoration:underline}
footer{margin-top:40px;padding-top:20px;border-top:1px solid #d0d7de;text-align:center;color:#656d76;font-size:0.85rem}
footer a{color:#0969da;text-decoration:none}
</style>
</head>
<body>
<h1>📝 my-automaton Blog</h1>
<p class="subtitle">${blogArticles.length} articles about AI-powered developer tools, code quality, and productivity.</p>
${blogArticles.reverse().map(blogCard).join('\n')}
<footer>
  <p><a href="/">Home</a> · <a href="/tools">Free Tools</a> · <a href="/upgrade">Pricing</a> · <a href="/api-docs">API</a></p>
</footer>
</body>
</html>`;

fs.writeFileSync(path.join(CONTENT, 'blog.html'), blogHtml);
console.log(`✅ blog.html: ${blogArticles.length} articles`);

// --- Generate blog.json ---
const blogJson = JSON.stringify(blogArticles.reverse().map(a => ({
  slug: a.slug,
  title: a.title,
  date: a.mtime.toISOString().slice(0,10),
  url: `https://automation.songheng.vip/blog/${a.slug}`,
})), null, 2);

fs.writeFileSync(path.join(CONTENT, 'blog.json'), blogJson);
console.log(`✅ blog.json: ${blogArticles.length} entries`);

// --- Ping IndexNow ---
const urlsToPing = allUrls.slice(0, 50).map(u => `${BASE_URL}${u.url}`);
const payload = JSON.stringify({
  host: 'automation.songheng.vip',
  key: 'automaton-indexnow-key',
  keyLocation: `${BASE_URL}/automaton-indexnow-key.txt`,
  urlList: urlsToPing,
});

const https = require('https');
const req = https.request({
  hostname: 'api.indexnow.org',
  path: '/indexnow',
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Content-Length': payload.length },
}, (res) => {
  console.log(`✅ IndexNow ping: ${res.statusCode} ${res.statusMessage}`);
});
req.write(payload);
req.end();

console.log(`\n✅ DONE! ${allUrls.length} total URLs, ${blogArticles.length} blog articles`);
