#!/usr/bin/env node
/* publish-and-ping.mjs — Regenerate blog index, sitemap, ping search engines */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const CONTENT = '/root/automaton/content';
const BLOG = path.join(CONTENT, 'blog');
const SITE = 'https://automation.songheng.vip';

/* 1. Regenerate blog index */
function generateBlogList() {
  const articles = [];
  try {
    fs.readdirSync(BLOG).filter(f => f.endsWith('.html')).forEach(f => {
      const html = fs.readFileSync(path.join(BLOG, f), 'utf8');
      const title = html.match(/<title>(.*?)<\/title>/)?.[1] || f.replace('.html','');
      const desc = html.match(/<meta name="description" content="(.*?)">/)?.[1] || '';
      const dateMatch = html.match(/<meta name="date" content="(.*?)">/);
      const date = dateMatch?.[1] || fs.statSync(path.join(BLOG, f)).mtime.toISOString().slice(0,10);
      articles.push({ slug: f.replace('.html',''), title, desc, date });
    });
  } catch(e) { console.error('Blog read error:', e.message); return; }
  
  articles.sort((a, b) => b.date.localeCompare(a.date));
  
  let html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Blog — my-automaton AI Developer Tools</title><meta name="description" content="AI code review, security scanning, and developer tool articles from my-automaton.">
<style>body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif;max-width:800px;margin:0 auto;padding:20px;background:#0d1117;color:#c9d1d9;line-height:1.6}
h1{color:#58a6ff;border-bottom:1px solid #21262d;padding-bottom:10px}
.article{border:1px solid #30363d;border-radius:8px;padding:16px;margin:12px 0;background:#161b22}
.article h2{margin:0 0 8px;font-size:18px}
.article h2 a{color:#58a6ff;text-decoration:none}
.article .meta{color:#8b949e;font-size:14px}
.article p{color:#c9d1d9;margin:8px 0}
a{color:#58a6ff}
</style></head><body>
<h1>📝 my-automaton Blog</h1>
<p>AI code review, security scanning, developer tools, and automation articles.</p>`;
  
  articles.forEach(a => {
    html += `<div class="article"><h2><a href="/blog/${a.slug}">${a.title}</a></h2>
<div class="meta">${a.date}</div><p>${a.desc}</p></div>`;
  });
  
  html += `</body></html>`;
  fs.writeFileSync(path.join(CONTENT, 'blog.html'), html);
  console.log(`[publish] Blog index: ${articles.length} articles`);
}

/* 2. Rebuild sitemap */
function rebuildSitemap() {
  let urls = [];
  const walk = (dir, prefix) => {
    try { fs.readdirSync(dir).forEach(f => {
      const fp = path.join(dir, f);
      const stat = fs.statSync(fp);
      if (stat.isDirectory()) walk(fp, prefix + '/' + f);
      else if (f.endsWith('.html')) urls.push({ url: prefix + '/' + f.replace('.html',''), mod: stat.mtime.toISOString().slice(0,10) });
    }); } catch(e) {}
  };
  walk(CONTENT, '');
  
  let xml = '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
  const skip = ['blog.html','dashboard.html'];
  urls.forEach(u => {
    const name = u.url.split('/').pop();
    if (skip.includes(name + '.html')) return;
    xml += `<url><loc>${SITE}${u.url}</loc><lastmod>${u.mod}</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>`;
  });
  xml += '</urlset>';
  fs.writeFileSync(path.join(CONTENT, 'sitemap.xml'), xml);
  console.log(`[publish] Sitemap: ${urls.length} URLs`);
}

/* 3. Ping search engines */
async function ping() {
  const engines = [
    `https://www.google.com/ping?sitemap=${SITE}/sitemap.xml`,
    `https://www.bing.com/webmaster/ping.aspx?siteMap=${SITE}/sitemap.xml`,
  ];
  for (const url of engines) {
    try {
      const resp = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(5000) });
      console.log(`[ping] ${url.split('/')[2]}: ${resp.status}`);
    } catch(e) {
      console.log(`[ping] ${url.split('/')[2]}: ${e.message}`);
    }
  }
  
  /* IndexNow */
  const indexNowUrl = 'https://api.indexnow.org/indexnow';
  const host = 'automation.songheng.vip';
  const key = 'f8a2e1c4d7b93a5e0f6c8d2a4e7b1c3d';
  try {
    const resp = await fetch(indexNowUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        host,
        key,
        keyLocation: `${SITE}/${key}.txt`,
        urlList: [`${SITE}/blog/free-ai-code-review-api`]
      }),
      signal: AbortSignal.timeout(5000)
    });
    console.log(`[ping] IndexNow: ${resp.status}`);
  } catch(e) { console.log(`[ping] IndexNow: ${e.message}`); }
}

generateBlogList();
rebuildSitemap();
await ping();
console.log('[publish] Done!');
