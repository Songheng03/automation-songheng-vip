#!/usr/bin/env node
/**
 * Complete Sitemap & SEO generator for my-automaton
 * Scans content directory, generates sitemap.xml + robots.txt
 */
const fs = require('fs');
const path = require('path');

const DOMAIN = 'https://automation.songheng.vip';
const CONTENT_DIR = '/root/automaton/content';
const OUTPUT_DIR = '/root/automaton/content';

// URLs that exist but aren't in content dir (gateway routes)
const EXTRA_URLS = [
  { path: '/', priority: '1.0', changefreq: 'daily' },
  { path: '/blog', priority: '0.9', changefreq: 'daily' },
  { path: '/api-docs', priority: '0.8', changefreq: 'weekly' },
  { path: '/dashboard', priority: '0.7', changefreq: 'daily' },
  { path: '/api-playground', priority: '0.8', changefreq: 'weekly' },
  { path: '/quickstart', priority: '0.8', changefreq: 'weekly' },
  { path: '/tools', priority: '0.9', changefreq: 'weekly' },
  { path: '/live-demo', priority: '0.8', changefreq: 'weekly' },
  { path: '/upgrade', priority: '0.7', changefreq: 'weekly' },
  { path: '/ai-code-reviewer', priority: '0.8', changefreq: 'weekly' },
  { path: '/support', priority: '0.5', changefreq: 'monthly' },
  { path: '/privacy', priority: '0.4', changefreq: 'monthly' },
  { path: '/terms', priority: '0.4', changefreq: 'monthly' },
];

// Tools
const TOOLS = [
  '/tools/regex-tester', '/tools/json-formatter', '/tools/http-status-codes',
  '/tools/seo-audit', '/tools/seo-content-brief', '/tools/sitemap-generator',
  '/tools/badge-generator', '/tools/base64-tool', '/tools/diff-checker',
  '/tools/color-picker', '/tools/markdown-preview',
];

function getHtmlFiles(dir) {
  const files = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...getHtmlFiles(full));
      } else if (entry.name.endsWith('.html')) {
        files.push(full);
      }
    }
  } catch (e) {}
  return files;
}

function getUrlFromPath(filePath) {
  let rel = path.relative(CONTENT_DIR, filePath);
  if (rel === 'index.html') return '/';
  if (rel.endsWith('/index.html')) return '/' + rel.slice(0, -10);
  if (rel.endsWith('.html')) return '/' + rel.slice(0, -5);
  return '/' + rel;
}

function getPriority(url) {
  if (url === '/') return '1.0';
  if (url.startsWith('/blog/')) return '0.7';
  if (url.startsWith('/tools/')) return '0.8';
  return '0.6';
}

function getChangefreq(url) {
  if (url === '/' || url === '/blog') return 'daily';
  if (url.startsWith('/blog/')) return 'weekly';
  if (url.startsWith('/tools/')) return 'weekly';
  return 'monthly';
}

function generateSitemap() {
  const today = new Date().toISOString().split('T')[0];
  const urls = [];
  
  // Scan HTML files in content dir
  const htmlFiles = getHtmlFiles(CONTENT_DIR);
  for (const file of htmlFiles) {
    const url = getUrlFromPath(file);
    if (url.includes('/assets/') || url.includes('/promote/')) continue;
    urls.push({
      path: url,
      priority: getPriority(url),
      changefreq: getChangefreq(url),
    });
  }
  
  // Add extra routes
  for (const extra of EXTRA_URLS) {
    if (!urls.find(u => u.path === extra.path)) {
      urls.push(extra);
    }
  }
  
  // Add tools
  for (const tool of TOOLS) {
    if (!urls.find(u => u.path === tool)) {
      urls.push({ path: tool, priority: '0.8', changefreq: 'weekly' });
    }
  }
  
  // Build XML
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${DOMAIN}${u.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`;
  
  fs.writeFileSync(path.join(OUTPUT_DIR, 'sitemap.xml'), xml);
  console.log(`Sitemap: ${urls.length} URLs written`);
  return urls;
}

function generateRobotsTxt() {
  const robots = `User-agent: *
Allow: /

# Sitemaps
Sitemap: ${DOMAIN}/sitemap.xml

# Disallow admin/internal paths
Disallow: /api/
Disallow: /admin/
Disallow: /internal/
Disallow: /*.json$

# Crawl-delay for polite crawling
Crawl-delay: 10
`;
  fs.writeFileSync(path.join(OUTPUT_DIR, 'robots.txt'), robots);
  console.log('robots.txt written');
}

function pingIndexNow(urls) {
  const https = require('https');
  const urlList = urls.map(u => `${DOMAIN}${u.path}`);
  
  const body = JSON.stringify({
    host: 'automation.songheng.vip',
    key: '005a47a5aa50495dae21f4db87a39bab',
    keyLocation: `${DOMAIN}/005a47a5aa50495dae21f4db87a39bab.html`,
    urlList: urlList.slice(0, 10000),
  });
  
  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'api.indexnow.org',
      path: '/IndexNow',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let data = '';
      res.on('data', (d) => data += d);
      res.on('end', () => {
        console.log(`IndexNow: ${res.statusCode} ${data}`);
        resolve(res.statusCode);
      });
    });
    req.on('error', (e) => {
      console.log(`IndexNow error: ${e.message}`);
      resolve(0);
    });
    req.write(body);
    req.end();
  });
}

// Main
console.log('=== SEO Generator ===');
const urls = generateSitemap();
generateRobotsTxt();
pingIndexNow(urls).then(code => {
  console.log(`Done! IndexNow responded: ${code}`);
});
