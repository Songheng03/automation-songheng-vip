#!/usr/bin/env node
/**
 * sitemap-builder.mjs — Build XML sitemap of ALL content, ping search engines.
 * Works with ANY gateway (doesn't depend on gateway.cjs features).
 * Run: node scripts/sitemap-builder.mjs
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';

const CONTENT_DIR = '/root/automaton/content';
const BLOG_DIR = path.join(CONTENT_DIR, 'blog');
const PUBLIC_URL = 'https://automation.songheng.vip';
const SITEMAP_PATH = path.join(CONTENT_DIR, 'sitemap.xml');

function getAllHtmlFiles(dir, basePath = '') {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = basePath ? `${basePath}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      if (entry.name !== 'tools' && entry.name !== 'images') continue;
      files.push(...getAllHtmlFiles(fullPath, relPath));
    } else if (entry.name.endsWith('.html')) {
      files.push(relPath);
    }
  }
  return files;
}

function buildSitemap() {
  const urls = [];
  
  // Root page
  urls.push({ url: '/', priority: '1.0', changefreq: 'weekly' });
  
  // Key pages
  const keyPages = [
    { url: '/api-docs.html', priority: '0.9', changefreq: 'monthly' },
    { url: '/upgrade.html', priority: '0.9', changefreq: 'monthly' },
    { url: '/demo.html', priority: '0.8', changefreq: 'monthly' },
    { url: '/blog.html', priority: '0.9', changefreq: 'daily' },
    { url: '/dashboard.html', priority: '0.6', changefreq: 'monthly' },
    { url: '/api-playground.html', priority: '0.7', changefreq: 'monthly' },
    { url: '/pricing-calculator.html', priority: '0.7', changefreq: 'monthly' },
    { url: '/install-mcp.html', priority: '0.6', changefreq: 'monthly' },
    { url: '/readme-badges.html', priority: '0.5', changefreq: 'monthly' },
    { url: '/ci-cd-integration.html', priority: '0.7', changefreq: 'monthly' },
    { url: '/regex-tester.html', priority: '0.5', changefreq: 'monthly' },
    { url: '/json-formatter.html', priority: '0.5', changefreq: 'monthly' },
    { url: '/security-scanner.html', priority: '0.6', changefreq: 'monthly' },
    // SEO tools
    { url: '/tools/seo-audit.html', priority: '0.6', changefreq: 'monthly' },
  ];
  urls.push(...keyPages);
  
  // Blog posts
  if (fs.existsSync(BLOG_DIR)) {
    const blogPosts = fs.readdirSync(BLOG_DIR).filter(f => f.endsWith('.html')).sort();
    for (const post of blogPosts) {
      urls.push({ url: `/blog/${post}`, priority: '0.7', changefreq: 'monthly' });
    }
  }
  
  // Syndication pages
  const syndDir = path.join(CONTENT_DIR, 'syndication');
  if (fs.existsSync(syndDir)) {
    const syndFiles = fs.readdirSync(syndDir).filter(f => f.endsWith('.md'));
    for (const f of syndFiles) {
      urls.push({ url: `/syndication/${f}`, priority: '0.3', changefreq: 'monthly' });
    }
  }
  
  // Build XML
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  
  for (const u of urls) {
    xml += '  <url>\n';
    xml += `    <loc>${PUBLIC_URL}${u.url}</loc>\n`;
    xml += `    <priority>${u.priority}</priority>\n`;
    xml += `    <changefreq>${u.changefreq}</changefreq>\n`;
    xml += '  </url>\n';
  }
  
  xml += '</urlset>';
  
  fs.writeFileSync(SITEMAP_PATH, xml);
  console.log(`✅ Sitemap built: ${urls.length} URLs → ${SITEMAP_PATH}`);
  return urls.length;
}

function pingSearchEngines(sitemapUrl) {
  const pings = [
    { name: 'Google', url: `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}` },
    { name: 'Bing', url: `https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}` },
    { name: 'IndexNow', url: `https://api.indexnow.org/indexnow?url=${encodeURIComponent(sitemapUrl)}&key=${encodeURIComponent(process.env.INDEXNOW_KEY || 'demo')}` }
  ];
  
  for (const ping of pings) {
    try {
      const client = ping.url.startsWith('https') ? https : http;
      const req = client.get(ping.url, res => {
        console.log(`  ${ping.name}: ${res.statusCode}`);
        res.resume();
      });
      req.on('error', e => console.log(`  ${ping.name}: error - ${e.message}`));
      req.setTimeout(10000, () => { req.destroy(); console.log(`  ${ping.name}: timeout`); });
    } catch (e) {
      console.log(`  ${ping.name}: ${e.message}`);
    }
  }
}

// Build robots.txt too
function buildRobotsTxt(sitemapUrl) {
  const robots = `User-agent: *
Allow: /
Disallow: /api/
Disallow: /data/

Sitemap: ${sitemapUrl}
`;
  fs.writeFileSync(path.join(CONTENT_DIR, 'robots.txt'), robots);
  console.log('✅ robots.txt updated');
}

const args = process.argv.slice(2);
const count = buildSitemap();
buildRobotsTxt(`${PUBLIC_URL}/sitemap.xml`);

if (args.includes('--ping')) {
  console.log('Pinging search engines...');
  pingSearchEngines(`${PUBLIC_URL}/sitemap.xml`);
}

console.log(`\n📊 ${count} URLs indexed`);
console.log('Run with --ping to notify search engines');
