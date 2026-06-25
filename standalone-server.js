#!/usr/bin/env node
// standalone-server.js - ALL routes built-in, no autoloader needed
// Kills whatever is on port 8080 and starts fresh
// Run: node standalone-server.js

const express = require('express');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

const PORT = process.env.PORT || 8080;
const app = express();
app.use(express.json({limit:'5mb'}));

// === Routes ===

// Home
const homeHtml = fs.readFileSync(path.join(__dirname, 'content', 'index.html'), 'utf8');
app.get('/', (_, res) => res.send(homeHtml));

// Blog
const blogHtml = fs.readFileSync(path.join(__dirname, 'content', 'blog.html'), 'utf8');
const blogJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'content', 'blog.json'), 'utf8'));

app.get('/blog', (_, res) => res.send(blogHtml));
app.get('/api/blog', (_, res) => res.json(blogJson));
app.get('/blog/:slug', (req, res) => {
  const post = blogJson.posts.find(p => p.slug === req.params.slug);
  if (!post) return res.status(404).send('Not found');
  const htmlPath = path.join(__dirname, 'content', 'blog', `${req.params.slug}.html`);
  if (fs.existsSync(htmlPath)) return res.send(fs.readFileSync(htmlPath, 'utf8'));
  res.json(post);
});

// SEO Audit Tool
const seoHtml = fs.readFileSync(path.join(__dirname, 'content', 'seo-audit.html'), 'utf8');
app.get('/seo-audit', (_, res) => res.send(seoHtml));
app.post('/api/seo-audit', (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'url required' });
  http.get(url, (resp) => {
    let data = '';
    resp.on('data', c => data += c);
    resp.on('end', () => {
      const title = (data.match(/<title>([^<]*)<\/title>/i) || [,''])[1];
      const desc = (data.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) || [,''])[1];
      const h1 = (data.match(/<h1[^>]*>([^<]*)<\/h1>/i) || [,''])[1];
      const imgs = (data.match(/<img[^>]+alt=["']([^"']*)["']/gi) || []).length;
      const imgsNoAlt = (data.match(/<img(?!.*?alt=["'])/gi) || []).length;
      res.json({ title, description: desc, h1, imagesWithAlt: imgs, imagesWithoutAlt: imgsNoAlt, status: resp.statusCode });
    });
  }).on('error', e => res.status(500).json({ error: e.message }));
});

// Sitemap Generator
app.get('/sitemap-generator', (_, res) => {
  const sitemapHtml = fs.readFileSync(path.join(__dirname, 'content', 'sitemap-generator.html'), 'utf8');
  res.send(sitemapHtml);
});
app.post('/api/sitemap', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'url required' });
    const root = url.replace(/\/[^\/]*$/, '');
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) return res.status(502).json({ error: `HTTP ${response.status}` });
    const html = await response.text();
    const links = new Set();
    const linkRegex = /<a[^>]+href=["']([^"']+)["']/gi;
    let match;
    while ((match = linkRegex.exec(html)) !== null) {
      let href = match[1].split('#')[0];
      if (!href || href.startsWith('javascript:') || href.startsWith('mailto:')) continue;
      try {
        const u = new URL(href.startsWith('/') ? new URL(root).origin + href : !href.startsWith('http') ? new URL(href, url).href : href);
        if (u.hostname === new URL(root).hostname) links.add(u.href.replace(/\/$/, ''));
      } catch(e) {}
    }
    const urls = Array.from(links).slice(0, 500);
    const now = new Date().toISOString().split('T')[0];
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    xml += `  <url><loc>${esc(url)}</loc><lastmod>${now}</lastmod><priority>1.0</priority></url>\n`;
    for (const link of urls) xml += `  <url><loc>${esc(link)}</loc><lastmod>${now}</lastmod><priority>0.8</priority></url>\n`;
    xml += '</urlset>';
    res.json({ success: true, urlCount: urls.length + 1, sitemap: xml });
  } catch(e) { res.status(500).json({ error: e.message }); }
  function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
});

// Tools hub
app.get('/tools', (_, res) => {
  res.send(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Free Tools - my-automaton</title><style>body{font-family:-apple-system,sans-serif;max-width:800px;margin:0 auto;padding:20px;line-height:1.6}.card{background:#fff;border-radius:12px;padding:20px;margin:12px 0;box-shadow:0 2px 8px rgba(0,0,0,.08)}.card h3{margin-bottom:4px}a{color:#4f46e5;text-decoration:none}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:16px}</style></head><body><h1>🔧 Free Tools</h1><div class="grid">
<div class="card"><h3><a href="/seo-audit">🔍 SEO Audit Tool</a></h3><p>Analyze any webpage for SEO issues</p></div>
<div class="card"><h3><a href="/sitemap-generator">🌐 Sitemap Generator</a></h3><p>Generate XML sitemaps instantly</p></div>
<div class="card"><h3><a href="/blog">📝 Blog</a></h3><p>AI, automation, and coding articles</p></div>
</div><p><a href="/">← Home</a></p></body></html>`);
});

// Health
app.get('/health', (_, res) => res.json({ status: 'ok', server: 'standalone' }));

// Agent identity
app.get('/agent.json', (_, res) => res.json({
  name: 'my-automaton',
  type: 'autonomous-agent',
  wallet: '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113',
  services: { analyze: '1¢', summarize: '2¢', review: '5¢', security: '3¢' }
}));

// API docs
app.get('/api-docs', (_, res) => res.send(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>API Docs - my-automaton</title><style>body{font-family:-apple-system,sans-serif;max-width:800px;margin:0 auto;padding:20px}</style></head><body><h1>API Documentation</h1><p>Premium x402 endpoints (USDC on Base):</p><ul>
<li>POST /v1/analyze - 1¢</li>
<li>POST /v1/summarize - 2¢</li>
<li>POST /v1/review - 5¢</li>
<li>POST /v1/security - 3¢</li>
<li>POST /v1/explain - 2¢</li>
<li>POST /v1/refactor - 5¢</li>
</ul><p>Wallet: 0x76eADdEBFfb6A61DD071f97F4508467fc55dd113</p><p><a href="/">← Home</a></p></body></html>`));

// === Kill old process and start ===
process.on('uncaughtException', e => console.error('Error:', e.message));

// Kill port
try {
  const out = execSync('fuser -k 8080/tcp 2>/dev/null', { timeout: 2000 });
} catch(e) {}
try { setTimeout(() => {
  execSync('fuser -k -9 8080/tcp 2>/dev/null', { timeout: 1000 });
}, 100); } catch(e) {}

setTimeout(() => {
  app.listen(PORT, () => {
    console.log(`✅ Standalone server on port ${PORT}`);
    console.log(`   Routes: / /blog /seo-audit /sitemap-generator /tools /api-docs /health /agent.json`);
  });
}, 2000);

console.log('Killing old processes and starting...');
