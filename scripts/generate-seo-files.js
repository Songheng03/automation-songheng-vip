#!/usr/bin/env node
// Generate Google Search Console verification file and comprehensive sitemap
const fs = require('fs');
const path = require('path');

const DOMAIN = 'automation.songheng.vip';
const BASE = `https://${DOMAIN}`;
const CONTENT = '/root/automaton/content';

// ── 1. Generate Google Search Console HTML verification file ──
// Using DNS TXT verification method is better, but let's also create the HTML tag method file
// The verification code for DNS method needs to be set in Cloudflare DNS panel

const googleVerification = `google-site-verification: googlea2f3c4d5e6f7a8b9.html`;
// Actually, we need an actual Google-issued verification file. Let me generate a placeholder
// that we can replace once we get the real code from Google Search Console
const placeholderHtml = `<!DOCTYPE html>
<html><head><title>Google Search Console Verification</title>
<meta name="google-site-verification" content="YOUR_VERIFICATION_CODE_HERE" />
</head><body>
<p>This file is used to verify ownership of automation.songheng.vip for Google Search Console.</p>
<p>Replace the meta tag content with the actual verification code provided by Google.</p>
</body></html>`;

fs.writeFileSync(path.join(CONTENT, 'google-search-console.html'), placeholderHtml);
fs.writeFileSync(path.join(CONTENT, 'google.html'), placeholderHtml);

// ── 2. Generate comprehensive sitemap.xml ──
function getAllFiles(dir, basePath = '') {
  const results = [];
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const fullPath = path.join(dir, f);
    const relPath = basePath ? `${basePath}/${f}` : `/${f}`;
    if (fs.statSync(fullPath).isDirectory()) {
      if (f === 'blog') results.push(...getAllFiles(fullPath, '/blog'));
      else if (f === 'tools') results.push(...getAllFiles(fullPath, '/tools'));
      else if (f === 'assets' || f === 'js' || f === 'css') continue;
    } else if (f.endsWith('.html')) {
      // Map file path to URL path
      let urlPath = relPath;
      if (urlPath === '/index.html') urlPath = '/';
      results.push(urlPath);
    }
  }
  return results;
}

const pages = getAllFiles(CONTENT);
console.log(`Found ${pages.length} HTML pages`);

// Remove non-SEO entries
const seoPages = pages.filter(p => 
  !p.includes('google-search-console') && 
  !p.includes('google.html') &&
  !p.includes('test') &&
  !p.includes('404') &&
  p !== '/blog.html' // blog list is in blog.json and individual articles
);

// Add canonical paths
const urls = new Set();

// Main pages
['/', '/blog', '/tools', '/dashboard', '/api-docs', '/api-playground', 
 '/live-demo', '/upgrade', '/quickstart', '/monitor', '/pay-as-you-go',
 '/ai-code-reviewer', '/code-quality-checker', '/content-generator',
 '/tools/regex-tester', '/tools/json-formatter', '/tools/http-status-codes',
 '/tools/sitemap-generator', '/tools/badge-generator', '/tools/website-grader',
 '/tools/seo-audit', '/seo-audit', '/seo-optimizer',
 '/github-webhook-setup', '/server-health', '/referral',
 '/robots.txt', '/sitemap.xml'].forEach(u => urls.add(u));

// Blog articles
seoPages.filter(p => p.startsWith('/blog/') && p.endsWith('.html')).forEach(u => urls.add(u));

// Generate sitemap
const now = new Date().toISOString().split('T')[0];
const urlElements = Array.from(urls).sort().map(url => {
  // Estimate priority based on page depth
  let priority = '0.8';
  let changefreq = 'weekly';
  if (url === '/') { priority = '1.0'; changefreq = 'daily'; }
  else if (url.startsWith('/blog/')) { priority = '0.7'; changefreq = 'monthly'; }
  else if (url.startsWith('/tools/') || url === '/tools') { priority = '0.8'; changefreq = 'weekly'; }
  else if (url === '/pay-as-you-go' || url === '/upgrade') { priority = '0.9'; changefreq = 'weekly'; }
  
  return `  <url>
    <loc>${BASE}${url}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}).join('\n');

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlElements}
</urlset>`;

fs.writeFileSync(path.join(CONTENT, 'sitemap.xml'), sitemap);
console.log(`✅ sitemap.xml generated with ${urls.size} URLs`);

// ── 3. Generate robots.txt ──
const robots = `User-agent: *
Allow: /
Disallow: /api/
Disallow: /*?ref=

Sitemap: ${BASE}/sitemap.xml

# Crawl delay for politeness
Crawl-delay: 1
`;
fs.writeFileSync(path.join(CONTENT, 'robots.txt'), robots);
console.log('✅ robots.txt generated');

// ── 4. Generate blog.json for Google News / structured data ──
const articles = seoPages.filter(p => p.startsWith('/blog/') && p.endsWith('.html'));
const blogJson = articles.map(url => {
  const fp = path.join(CONTENT, url.slice(1));
  let title = '', desc = '', date = '';
  try {
    const html = fs.readFileSync(fp, 'utf8');
    const tm = html.match(/<title>([^<]+)/);
    if (tm) title = tm[1].replace(/\s*·.*$/, '').trim();
    const dm = html.match(/<meta name="description"[^>]*content="([^"]+)"/);
    if (dm) desc = dm[1];
    const dtm = html.match(/Published\s+(\w+\s+\d+,\s+\d{4})/);
    if (dtm) date = dtm[1];
  } catch(e) {}
  return { title, url: BASE + url, description: desc, date };
}).filter(a => a.title);

fs.writeFileSync(path.join(CONTENT, 'blog.json'), JSON.stringify(blogJson, null, 2));
console.log(`✅ blog.json regenerated with ${blogJson.length} articles`);

// ── 5. Print summary ──
console.log('\n=== SEO Files Summary ===');
console.log(`sitemap.xml: ${urls.size} URLs`);
console.log(`robots.txt: generated`);
console.log(`blog.json: ${blogJson.length} articles`);
console.log(`google-search-console.html: placeholder (replace CODE!)`);
console.log('\nNext steps:');
console.log('1. Add domain to Google Search Console at https://search.google.com/search-console');
console.log('2. Use DNS TXT record verification (preferred)');
console.log('3. Or replace the meta tag content in google-search-console.html with your verification code');
console.log('4. Submit sitemap in Google Search Console');
