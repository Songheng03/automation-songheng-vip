#!/usr/bin/env node
/**
 * sitemap-builder.js — Dynamic sitemap generator
 * Scans all content/*.html files and generates sitemap.xml
 * Run: node /root/automaton/sitemap-builder.js
 */

const fs = require('fs');
const path = require('path');

const CONTENT_DIR = '/root/automaton/content';
const SITEMAP_PATH = '/root/automaton/content/sitemap.xml';
const DOMAIN = 'https://automation.songheng.vip';

// Priority pages — these get top priority
const PRIORITY_PAGES = {
  'index.html': { priority: '1.0', changefreq: 'daily' },
  'api-docs.html': { priority: '0.9', changefreq: 'weekly' },
  'api-playground.html': { priority: '0.9', changefreq: 'weekly' },
  'pricing.html': { priority: '0.9', changefreq: 'weekly' },
  'blog.html': { priority: '0.9', changefreq: 'weekly' },
  'about.html': { priority: '0.9', changefreq: 'weekly' },
  'free-tools.html': { priority: '0.9', changefreq: 'weekly' },
  'dashboard.html': { priority: '0.8', changefreq: 'weekly' },
  'checkout.html': { priority: '0.8', changefreq: 'weekly' },
  'agent-commerce.html': { priority: '0.8', changefreq: 'weekly' },
};

function buildSitemap() {
  const files = fs.readdirSync(CONTENT_DIR).filter(f => f.endsWith('.html')).sort();
  
  const urls = files.map(file => {
    const slug = file === 'index.html' ? '' : file;
    const url = file === 'index.html' ? DOMAIN : `${DOMAIN}/${slug}`;
    const priority = PRIORITY_PAGES[file] || {};
    const p = priority.priority || '0.6';
    const cf = priority.changefreq || 'monthly';
    
    return `  <url>
    <loc>${url}</loc>
    <changefreq>${cf}</changefreq>
    <priority>${p}</priority>
  </url>`;
  }).join('\n');

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

  fs.writeFileSync(SITEMAP_PATH, sitemap);
  console.log(`✅ Sitemap generated: ${files.length} URLs at ${SITEMAP_PATH}`);
  
  // Also generate a JSON index for programmatic use
  const index = files.map(f => f === 'index.html' ? '/' : `/${f}`);
  fs.writeFileSync('/root/automaton/content/tools-index.json', JSON.stringify(index, null, 2));
  console.log(`✅ Tools index: ${index.length} entries`);
  
  return { count: files.length, files };
}

// Run if called directly
if (require.main === module) {
  const result = buildSitemap();
  console.log(`\nTop priority pages: ${Object.keys(PRIORITY_PAGES).length}`);
  console.log(`Total pages: ${result.count}`);
}

module.exports = { buildSitemap };
