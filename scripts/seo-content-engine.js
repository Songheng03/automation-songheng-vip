#!/usr/bin/env node
// seo-content-engine.js — Generates blog content, fixes blog.json, updates sitemap
// No new ports. Runs as script. Updates existing files in /root/automaton/content/

const fs = require('fs');
const path = require('path');

const CONTENT = '/root/automaton/content';
const BLOG_DIR = path.join(CONTENT, 'blog');
const BLOG_JSON = path.join(CONTENT, 'blog.json');
const SITEMAP = path.join(CONTENT, 'sitemap.xml');

// Ensure dirs exist
[BLOG_DIR].forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, {recursive: true}); });

// ========== FIX BLOG.JSON — scan blog dir for articles ==========
function rebuildBlogJson() {
  let articles = [];
  // Read existing
  if (fs.existsSync(BLOG_JSON)) {
    try { articles = JSON.parse(fs.readFileSync(BLOG_JSON)); } catch(e) { articles = []; }
  }
  
  const existingSlugs = new Set(articles.map(a => a.slug));
  
  // Scan blog dir for new articles
  if (fs.existsSync(BLOG_DIR)) {
    fs.readdirSync(BLOG_DIR).filter(f => f.endsWith('.html')).forEach(f => {
      const slug = f.replace('.html', '');
      if (!existingSlugs.has(slug)) {
        try {
          const html = fs.readFileSync(path.join(BLOG_DIR, f), 'utf-8');
          const titleMatch = html.match(/<title>([^<]+)<\/title>/);
          const descMatch = html.match(/<meta name="description" content="([^"]+)"/);
          if (titleMatch) {
            articles.push({
              title: titleMatch[1].replace(' | My-Automaton', '').replace(' | My-Automaton AI', ''),
              slug: slug,
              date: new Date().toISOString().split('T')[0],
              description: descMatch ? descMatch[1] : titleMatch[1].substring(0, 150)
            });
          }
        } catch(e) {}
      }
    });
  }
  
  // Sort by date, newest first
  articles.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  fs.writeFileSync(BLOG_JSON, JSON.stringify(articles, null, 2));
  console.log(`[SEO] blog.json: ${articles.length} articles`);
  return articles;
}

// ========== GENERATE SITEMAP ==========
function generateSitemap() {
  const urls = ['https://automation.songheng.vip/'];
  const pages = ['blog.html','tools.html','api-docs.html','api-playground.html',
    'dashboard.html','upgrade.html','agent-commerce.html',
    'free-ai-code-review-tool.html','free-ai-security-scanner.html',
    'free-ai-text-summarizer.html','free-ai-code-explainer.html',
    'free-seo-audit.html','code-quality-checker.html','content-generator.html'];
  
  pages.forEach(p => urls.push(`https://automation.songheng.vip/${p}`));
  
  // Add blog articles
  if (fs.existsSync(BLOG_JSON)) {
    try {
      JSON.parse(fs.readFileSync(BLOG_JSON)).forEach(a => 
        urls.push(`https://automation.songheng.vip/blog/${a.slug}.html`));
    } catch(e) {}
  }
  
  // Scan blog dir for any orphans
  if (fs.existsSync(BLOG_DIR)) {
    fs.readdirSync(BLOG_DIR).filter(f => f.endsWith('.html')).forEach(f => {
      const u = `https://automation.songheng.vip/blog/${f}`;
      if (!urls.includes(u)) urls.push(u);
    });
  }
  
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...new Set(urls)].map(u => `  <url>
    <loc>${u.replace(/&/g,'&amp;').replace(/'/g,'&apos;')}</loc>
    <changefreq>weekly</changefreq>
    <priority>${u === 'https://automation.songheng.vip/' ? '1.0' : '0.8'}</priority>
  </url>`).join('\n')}
</urlset>`;
  
  fs.writeFileSync(SITEMAP, xml);
  console.log(`[SEO] Sitemap: ${[...new Set(urls)].length} URLs`);
  return [...new Set(urls)];
}

// ========== GENERATE BLOG LIST HTML ==========
function generateBlogList(articles) {
  const items = articles.map(a => `
    <div style="margin-bottom:15px;padding:15px;background:#fff;border:1px solid #e0e0e0;border-radius:8px;">
      <a href="/blog/${a.slug}.html" style="font-size:1.1em;font-weight:600;color:#1a1a2e;text-decoration:none;">${(a.title || a.slug).replace(/</g,'&lt;')}</a>
      <br>
      <small style="color:#888;">${a.date || '2026'} — ${(a.description || '').substring(0, 200).replace(/</g,'&lt;')}</small>
    </div>`).join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>AI Developer Tools Blog | My-Automaton</title>
<meta name="description" content="Articles about AI-powered code review, security scanning, autonomous agents, and x402 micropayments. ${articles.length} articles.">
<meta name="keywords" content="AI blog, code review, security, developer tools, autonomous agents">
<link rel="canonical" href="https://automation.songheng.vip/blog.html">
<meta property="og:title" content="My-Automaton Blog — AI Developer Tools">
<meta property="og:description" content="AI code review, security scanning, and autonomous agent guides.">
<meta name="twitter:card" content="summary_large_image">
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8f9fa;color:#333;line-height:1.6;}
header{background:linear-gradient(135deg,#1a1a2e,#16213e);color:#fff;padding:40px 20px;text-align:center;}
header h1{font-size:2em;margin-bottom:10px;}
header p{opacity:0.9;}
nav{background:#fff;padding:12px 20px;text-align:center;border-bottom:1px solid #e0e0e0;position:sticky;top:0;z-index:100;}
nav a{color:#555;text-decoration:none;margin:0 12px;font-weight:500;padding:4px 0;border-bottom:2px solid transparent;}
nav a:hover{border-bottom-color:#e94560;color:#1a1a2e;}
.container{max-width:800px;margin:0 auto;padding:30px 20px;}
h2{color:#1a1a2e;margin-bottom:20px;border-bottom:2px solid #e94560;padding-bottom:8px;}
.stats-row{display:grid;grid-template-columns:repeat(3,1fr);gap:15px;margin:20px 0;}
.stat-card{background:#fff;border:1px solid #e0e0e0;border-radius:10px;padding:15px;text-align:center;}
.stat-card .num{font-size:1.8em;font-weight:bold;color:#e94560;}
.stat-card .label{color:#888;font-size:0.85em;}
.cta{background:linear-gradient(135deg,#1a1a2e,#16213e);color:#fff;padding:30px;border-radius:12px;margin:30px 0;text-align:center;}
.cta h3{font-size:1.3em;margin-bottom:8px;}
.cta p{opacity:0.9;margin-bottom:15px;}
.cta .btn{display:inline-block;background:#e94560;color:#fff;padding:10px 25px;border-radius:6px;text-decoration:none;font-weight:bold;margin:0 5px;}
.cta .btn:hover{opacity:0.9;}
footer{background:#1a1a2e;color:#aaa;padding:30px;text-align:center;margin-top:40px;font-size:0.85em;}
footer a{color:#e94560;}
footer code{color:#e94560;font-family:monospace;}
</style>
</head>
<body>
<header>
  <h1>📝 My-Automaton Blog</h1>
  <p>AI-powered developer tools, autonomous agents, and x402 micropayment guides</p>
</header>
<nav>
  <a href="/">🏠 Home</a>
  <a href="/tools.html">🔧 Free Tools</a>
  <a href="/blog.html">📝 Blog</a>
  <a href="/api-playground.html">🚀 Playground</a>
  <a href="/api-docs.html">📖 API</a>
  <a href="/upgrade.html">⬆️ Upgrade</a>
</nav>
<div class="container">
  <div class="stats-row">
    <div class="stat-card"><div class="num">${articles.length}</div><div class="label">Articles</div></div>
    <div class="stat-card"><div class="num">14</div><div class="label">Free Tools</div></div>
    <div class="stat-card"><div class="num">9</div><div class="label">API Endpoints</div></div>
  </div>
  <h2>All Articles</h2>
  ${items}
  <div class="cta">
    <h3>🔧 Try Free AI Developer Tools</h3>
    <p>No signup. 3 free requests per day per IP.</p>
    <a href="/free-ai-code-review-tool.html" class="btn">Code Review</a>
    <a href="/free-ai-security-scanner.html" class="btn">Security Scan</a>
    <a href="/free-ai-text-summarizer.html" class="btn">Summarizer</a>
    <br><br>
    <a href="/tools.html" style="color:#e94560;">View All Tools →</a>
  </div>
</div>
<footer>
  <p>🤖 My-Automaton — Autonomous AI Agent</p>
  <p>Wallet: <code>0x76eADdEBFfb6A61DD071f97F4508467fc55dd113</code> · Base USDC</p>
  <p><a href="/api-docs.html">API Docs</a> · <a href="/sitemap.xml">Sitemap</a></p>
</footer>
</body>
</html>`;
  
  fs.writeFileSync(path.join(CONTENT, 'blog.html'), html);
  console.log('[SEO] blog.html regenerated');
}

// ========== RUN ==========
console.log('=== SEO Content Engine ===');
console.log(`Time: ${new Date().toISOString()}`);

// Step 1: Rebuild blog.json from directory
const articles = rebuildBlogJson();

// Step 2: Generate sitemap
generateSitemap();

// Step 3: Regenerate blog list page
generateBlogList(articles);

console.log(`=== DONE: ${articles.length} articles indexed ===`);
