#!/usr/bin/env node
/**
 * update-blog-list.js — Scans blog/*.html files and regenerates blog.html + blog.json
 * Run after adding new blog articles.
 */
const fs = require('fs');
const path = require('path');

const BLOG_DIR = '/root/automaton/content/blog';
const BLOG_HTML = '/root/automaton/content/blog.html';
const BLOG_JSON = '/root/automaton/content/blog.json';

function extractMeta(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const title = (content.match(/<title>(.+?)<\/title>/i) || [])[1] || 'Untitled';
  const desc = (content.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"/i) || [])[1] || '';
  const canonical = (content.match(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/i) || [])[1] || '';
  const h1 = (content.match(/<h1[^>]*>(.+?)<\/h1>/i) || [])[1] || title;
  const date = (content.match(/Published:\s*(\w+\s+\d+,\s+\d{4})/i) || [])[1] || '';
  return { title: h1, description: desc, url: canonical, date };
}

// Scan blog directory
const files = fs.readdirSync(BLOG_DIR)
  .filter(f => f.endsWith('.html'))
  .sort();

const articles = files.map(f => {
  const meta = extractMeta(path.join(BLOG_DIR, f));
  const slug = f.replace(/\.html$/, '');
  return {
    slug,
    title: meta.title,
    description: meta.description,
    url: meta.url || `https://automation.songheng.vip/blog/${slug}`,
    date: meta.date || '2026',
    file: f
  };
});

// Write JSON
fs.writeFileSync(BLOG_JSON, JSON.stringify(articles, null, 2));
console.log(`✅ blog.json: ${articles.length} articles`);

// Generate blog.html
const articleHtml = articles.map(a => `
  <article style="background:#1a1a3e;border:1px solid #2a2a5a;border-radius:12px;padding:24px;margin-bottom:16px">
    <h3 style="margin-bottom:8px"><a href="/blog/${a.slug}" style="color:#60a5fa;text-decoration:none">${a.title}</a></h3>
    <p style="color:#94a3b8;font-size:.9em">${a.description || 'Read more...'}</p>
    <span style="color:#6b7280;font-size:.85em">${a.date || ''}</span>
  </article>
`).join('\n');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>my-automaton Blog — AI Code Analysis, Security, and Developer Tools</title>
<meta name="description" content="Articles about AI-powered code analysis, security scanning, and developer tools from my-automaton.">
<link rel="canonical" href="https://automation.songheng.vip/blog">
</head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0a0a1a;color:#e0e0e0;line-height:1.6;max-width:900px;margin:0 auto;padding:20px">
<h1 style="color:#60a5fa;border-bottom:2px solid #2a2a5a;padding-bottom:12px">📝 Blog</h1>
<p style="color:#94a3b8;margin-bottom:24px">AI code analysis, security scanning, and developer tools articles.</p>
${articleHtml}
<footer style="text-align:center;padding:30px;color:#6b7280;border-top:1px solid #2a2a5a;margin-top:40px">
  <p><a href="/" style="color:#60a5fa">Home</a> · <a href="/api-docs" style="color:#60a5fa">API Docs</a> · <a href="/upgrade" style="color:#60a5fa">Pricing</a></p>
</footer>
</body>
</html>`;

fs.writeFileSync(BLOG_HTML, html);
console.log(`✅ blog.html generated with ${articles.length} articles`);
console.log('📊 Stats:', { total: articles.length, latest: articles[articles.length-1]?.title });
