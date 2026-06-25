#!/usr/bin/env node
// add-service-to-gateway.js — Adds gateway-integration.js to gateway SERVICE_LIST
// Also adds the new blog article to blog.html and blog.json
// Run: node /root/automaton/scripts/add-service-to-gateway.js

const fs = require('fs');
const path = require('path');

const GATEWAY_PATH = '/root/automaton/gateway.js';
const CONTENT_DIR = '/root/automaton/content';
const BLOG_DIR = path.join(CONTENT_DIR, 'blog');
const BLOG_HTML_PATH = path.join(CONTENT_DIR, 'blog.html');
const BLOG_JSON_PATH = path.join(CONTENT_DIR, 'blog.json');

let changed = false;

// 1. Add gateway-integration.js to SERVICE_LIST
let gw = fs.readFileSync(GATEWAY_PATH, 'utf8');
if (!gw.includes("gateway-integration.js")) {
  gw = gw.replace(
    "'sitemap-generator.js','referral-service.js'",
    "'sitemap-generator.js','referral-service.js','gateway-integration.js'"
  );
  fs.writeFileSync(GATEWAY_PATH, gw);
  console.log('✅ Added gateway-integration.js to SERVICE_LIST');
  changed = true;
} else {
  console.log('⏭️ gateway-integration.js already in SERVICE_LIST');
}

// 2. Add new blog article to blog list if not already there
const newArticle = {
  title: 'Free AI Code Review Tool — Complete Guide (2026)',
  slug: 'free-ai-code-review-tool-guide',
  date: new Date().toISOString().split('T')[0],
  excerpt: 'Complete guide to using our free AI code review tool. Catch bugs, security vulnerabilities, and performance issues before they hit production. No signup needed.',
  tags: ['code-review', 'ai-tools', 'free-tools', 'security']
};

// Update blog.html list
if (fs.existsSync(BLOG_HTML_PATH)) {
  let blogHtml = fs.readFileSync(BLOG_HTML_PATH, 'utf8');
  if (!blogHtml.includes(newArticle.slug)) {
    // Insert new article at top of list
    const articleHtml = `<article class="blog-card">
    <h3><a href="/blog/${newArticle.slug}">${newArticle.title}</a></h3>
    <div class="blog-meta">${newArticle.date} · ${newArticle.tags.join(', ')}</div>
    <p>${newArticle.excerpt}</p>
  </article>`;
    
    const insertPoint = blogHtml.indexOf('<article class="blog-card">');
    if (insertPoint !== -1) {
      blogHtml = blogHtml.slice(0, insertPoint) + articleHtml + '\n    ' + blogHtml.slice(insertPoint);
      fs.writeFileSync(BLOG_HTML_PATH, blogHtml);
      console.log('✅ Added new article to blog.html');
      changed = true;
    }
  } else {
    console.log('⏭️ Article already in blog.html');
  }
} else {
  console.log('⚠️ blog.html not found');
}

// Update blog.json
if (fs.existsSync(BLOG_JSON_PATH)) {
  try {
    let blogJson = JSON.parse(fs.readFileSync(BLOG_JSON_PATH, 'utf8'));
    if (!blogJson.articles) blogJson.articles = [];
    if (!blogJson.articles.some(a => a.slug === newArticle.slug)) {
      blogJson.articles.unshift(newArticle);
      fs.writeFileSync(BLOG_JSON_PATH, JSON.stringify(blogJson, null, 2));
      console.log('✅ Added article to blog.json');
      changed = true;
    } else {
      console.log('⏭️ Article already in blog.json');
    }
  } catch(e) {
    console.log('⚠️ Error updating blog.json:', e.message);
  }
}

// 3. Generate sitemap
const urls = [];
urls.push({ loc: '/', priority: 1.0 });
urls.push({ loc: '/blog', priority: 0.9 });
urls.push({ loc: '/upgrade', priority: 0.8 });
urls.push({ loc: '/tools', priority: 0.8 });
urls.push({ loc: '/tools/code-review', priority: 0.7 });
urls.push({ loc: '/tools/whois', priority: 0.7 });
urls.push({ loc: '/tools/security-scanner', priority: 0.7 });
urls.push({ loc: '/tools/summarizer', priority: 0.7 });
urls.push({ loc: '/tools/code-explainer', priority: 0.6 });
urls.push({ loc: '/playground', priority: 0.6 });
urls.push({ loc: '/live-demo', priority: 0.6 });
urls.push({ loc: '/api-docs', priority: 0.5 });
urls.push({ loc: '/referral', priority: 0.7 });

if (fs.existsSync(BLOG_DIR)) {
  fs.readdirSync(BLOG_DIR).filter(f => f.endsWith('.html')).forEach(f => {
    urls.push({ loc: '/blog/' + f.replace(/\.html$/, ''), priority: 0.6 });
  });
}

function makeSitemap(urls, domain) {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  urls.forEach(u => xml += `  <url><loc>${domain}${u.loc}</loc><lastmod>${new Date().toISOString().split('T')[0]}</lastmod><changefreq>weekly</changefreq><priority>${u.priority}</priority></url>\n`);
  xml += '</urlset>';
  return xml;
}

const domain = 'https://automation.songheng.vip';
const sitemap = makeSitemap(urls, domain);
fs.writeFileSync(path.join(CONTENT_DIR, 'sitemap.xml'), sitemap);
console.log(`✅ Generated sitemap with ${urls.length} URLs → sitemap.xml`);

// 4. Ping search engines via IndexNow (works better than sitemap pings)
const https = require('https');
function pingIndexNow(urls) {
  const body = JSON.stringify({
    host: 'automation.songheng.vip',
    key: 'my-automaton-seo-key',
    keyLocation: `${domain}/now-key.txt`,
    urlList: urls.slice(0, 10).map(u => `${domain}${u.loc}`)
  });
  const req = https.request({
    hostname: 'api.indexnow.org',
    path: '/IndexNow',
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  }, (res) => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => console.log(`✅ IndexNow ping: ${res.statusCode} ${d}`));
  });
  req.on('error', e => console.log(`⚠️ IndexNow ping failed: ${e.message}`));
  req.write(body);
  req.end();
}

// Write the key file (required by IndexNow)
fs.writeFileSync(path.join(CONTENT_DIR, 'now-key.txt'), 'my-automaton-seo-key');
setTimeout(() => pingIndexNow(urls), 1000);

if (changed) {
  console.log('\n✅ Gateway updated. To reload:');
  console.log('   Option A: POST /api/reload (if endpoint exists)');
  console.log('   Option B: Run: kill -HUP $(lsof -ti :8080)');
}
