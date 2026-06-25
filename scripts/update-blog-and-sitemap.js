const fs = require('fs');
const path = require('path');
const CONTENT = '/root/automaton/content';

const blogPath = path.join(CONTENT, 'blog.json');
let blog = { total: 0, posts: [], updated: new Date().toISOString().split('T')[0] };
if (fs.existsSync(blogPath)) {
  try { blog = JSON.parse(fs.readFileSync(blogPath, 'utf8')); } catch(e) { blog = { total: 0, posts: [] }; }
}

const newArticle = {
  slug: 'free-ai-code-review-tools-2025',
  title: 'Free AI Code Review Tools 2025 — Complete Comparison Guide',
  description: 'Comprehensive comparison of free AI code review tools in 2025. Compare GitHub Copilot, CodeRabbit, DeepSource and our x402-powered option with 5¢/review. No subscription needed.',
  date: '2026-06-15',
  modified: new Date().toISOString(),
  url: '/blog/free-ai-code-review-tools-2025.html',
  tags: ['code-review', 'ai', 'comparison', 'x402', 'micropayments'],
  readTime: '8 min'
};

// Check for duplicates by url
const existing = blog.posts.find(p => p.url === newArticle.url);
if (!existing) {
  blog.posts.unshift(newArticle);
  blog.total = blog.posts.length;
  blog.updated = new Date().toISOString().split('T')[0];
  fs.writeFileSync(blogPath, JSON.stringify(blog, null, 2));
  console.log(`✅ Added: "${newArticle.title}" — Total posts: ${blog.total}`);
} else {
  console.log('🟡 Article already exists');
}

// Generate blog.html
function card(p) {
  const tags = (p.tags || []).map(t => `<span class="tag">${t}</span>`).join(' ');
  return `<article class="blog-card">
    <h3><a href="${p.url}">${p.title}</a></h3>
    <p class="meta">${p.date} · ${p.readTime || '5 min'} ${tags ? '· ' + tags : ''}</p>
    <p>${p.description || ''}</p>
    <a href="${p.url}" class="read-more">Read more →</a>
  </article>`;
}

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Blog — AI Tools & Autonomous Agent Updates</title>
<meta name="description" content="Latest articles about AI code review, autonomous agents, x402 micropayments, and developer tools.">
<link rel="canonical" href="https://automation.songheng.vip/blog.html">
<style>
*{box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:800px;margin:0 auto;padding:20px;color:#1a1a2e}
h1{color:#0f172a;border-bottom:3px solid #2563eb;padding-bottom:8px}
.blog-card{border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0}
.blog-card h3{margin:0 0 8px}
.blog-card h3 a{color:#2563eb;text-decoration:none}
.meta{color:#64748b;font-size:0.9em}
.tag{display:inline-block;background:#e2e8f0;padding:2px 8px;border-radius:12px;font-size:12px;margin:2px}
.read-more{color:#2563eb;font-weight:600;text-decoration:none}
</style>
</head>
<body>
<h1>📝 Blog</h1>
<p>AI tools, autonomous agent updates, x402 micropayments, and developer guides.</p>
<p><a href="/">← Home</a> · <a href="/api-docs.html">API Docs</a> · <a href="/dashboard.html">Live Stats</a></p>
${blog.posts.map(card).join('\n')}
</body>
</html>`;

fs.writeFileSync(path.join(CONTENT, 'blog.html'), html);
console.log(`📝 blog.html regenerated — ${blog.total} posts`);

// Generate sitemap
function getAllHtml(dir, base) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    const rel = base ? base + '/' + e.name : e.name;
    if (e.isDirectory() && !e.name.startsWith('.') && e.name !== 'assets' && e.name !== 'promote') 
      files.push(...getAllHtml(full, rel));
    else if (e.isFile() && e.name.endsWith('.html')) {
      let p = '0.5';
      if (rel === 'index.html') p = '1.0';
      else if (rel.includes('checkout')||rel.includes('upgrade')||rel.includes('api-docs')||rel.includes('dashboard')) p = '0.9';
      else if (rel.startsWith('tools/')) p = '0.7';
      else if (rel.startsWith('blog/')) p = '0.6';
      files.push({ path: '/' + rel, priority: p });
    }
  }
  return files;
}

const today = new Date().toISOString().split('T')[0];
const all = getAllHtml(CONTENT, '');
let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
for (const f of all) {
  xml += `  <url><loc>https://automation.songheng.vip${f.path}</loc><priority>${f.priority}</priority><lastmod>${today}</lastmod></url>\n`;
}
xml += '</urlset>';
fs.writeFileSync(path.join(CONTENT, 'sitemap.xml'), xml);
fs.writeFileSync(path.join(CONTENT, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: https://automation.songheng.vip/sitemap.xml\n`);
console.log(`🗺️ Sitemap: ${all.length} URLs → sitemap.xml`);

// Ping IndexNow
const https = require('https');
const urls = all.slice(0, 100).map(f => `https://automation.songheng.vip${f.path}`);
const body = JSON.stringify({ host: 'automation.songheng.vip', key: 'ai-indexnow-key-2026', urlList: urls });
const req = https.request({ hostname: 'api.indexnow.org', path: '/indexnow', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } }, res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => console.log(`📡 IndexNow: HTTP ${res.statusCode} — ${d.slice(0,50)}`));
});
req.on('error', e => console.log(`📡 IndexNow error: ${e.message}`));
req.write(body);
req.end();

console.log('✅ Done!');
