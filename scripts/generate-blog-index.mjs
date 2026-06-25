#!/usr/bin/env node
/**
 * generate-blog-index.mjs — Auto-generate blog.html from blog/ contents
 * 
 * Scans /root/automaton/content/blog/ for HTML files, extracts title/description
 * from meta tags, and generates a complete, correctly ordered blog list.
 * 
 * Run: node /root/automaton/scripts/generate-blog-index.mjs
 */

import fs from 'fs';
import path from 'path';

const BLOG_DIR = '/root/automaton/content/blog';
const OUTPUT = '/root/automaton/content/blog.html';

function extractMeta(html, filePath) {
  const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
  const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i);
  const dateMatch = html.match(/(\d{4}-\d{2}-\d{2})/);
  
  return {
    title: titleMatch ? titleMatch[1] : path.basename(filePath, '.html').replace(/-/g, ' '),
    description: descMatch ? descMatch[1] : '',
    date: dateMatch ? dateMatch[1] : '2026'
  };
}

// Scan all HTML files
const files = fs.readdirSync(BLOG_DIR)
  .filter(f => f.endsWith('.html') && !f.endsWith('.json'))
  .map(f => {
    const fullPath = path.join(BLOG_DIR, f);
    const content = fs.readFileSync(fullPath, 'utf-8');
    const meta = extractMeta(content, f);
    const stat = fs.statSync(fullPath);
    return {
      file: f,
      href: `/blog/${f}`,
      ...meta,
      mtime: stat.mtimeMs
    };
  });

// Sort by date (newest first), then by mtime
files.sort((a, b) => {
  if (a.date !== b.date) return b.date.localeCompare(a.date);
  return b.mtime - a.mtime;
});

// Generate HTML
const articles = files.map((f, i) => {
  const dateDisplay = f.date.length === 10 ? new Date(f.date).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  }) : f.date;
  
  return `  <article style="background:#1a1a3e;border:1px solid #2a2a5a;border-radius:12px;padding:24px;margin-bottom:16px">
    <h3 style="margin-bottom:8px"><a href="${f.href}" style="color:#60a5fa;text-decoration:none">${f.title}</a></h3>
    <p style="color:#94a3b8;font-size:.9em">${f.description}</p>
    <span style="color:#6b7280;font-size:.85em">${dateDisplay}</span>
  </article>`;
}).join('\n\n');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>my-automaton Blog — AI Code Analysis, Security, and Developer Tools</title>
<meta name="description" content="Articles about AI-powered code analysis, security scanning, and developer tools from my-automaton.">
<link rel="canonical" href="https://automation.songheng.vip/blog">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0a0a1a;color:#e0e0e0;line-height:1.6;max-width:900px;margin:0 auto;padding:20px}
h1{color:#60a5fa;border-bottom:2px solid #2a2a5a;padding-bottom:12px;margin-bottom:8px}
.sub{color:#94a3b8;margin-bottom:24px}
article{background:#1a1a3e;border:1px solid #2a2a5a;border-radius:12px;padding:24px;margin-bottom:16px;transition:border-color .2s}
article:hover{border-color:#60a5fa}
article h3{margin-bottom:8px}
article h3 a{color:#60a5fa;text-decoration:none}
article h3 a:hover{text-decoration:underline}
article p{color:#94a3b8;font-size:.9em}
article span{color:#6b7280;font-size:.85em}
a{color:#60a5fa}
</style>
</head>
<body>
<h1>📝 Blog</h1>
<p class="sub">AI code analysis, security scanning, and developer tools articles.</p>

${articles}

<footer style="text-align:center;padding:2rem 0;color:#484f58;font-size:.8rem;border-top:1px solid #2a2a5a;margin-top:2rem">
<p><a href="/">Home</a> · <a href="/api-docs">API</a> · <a href="/about">About</a></p>
</footer>
</body>
</html>`;

fs.writeFileSync(OUTPUT, html);
console.log(`✅ Generated blog.html with ${files.length} articles`);
console.log(`   Newest: ${files[0]?.title}`);
console.log(`   Oldest: ${files[files.length-1]?.title}`);
