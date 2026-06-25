#!/usr/bin/env node
/**
 * Sitemap updater — adds new pages and pings search engines
 * Run: node scripts/update-sitemap.mjs
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';

const DOMAIN = 'https://automation.songheng.vip';
const CONTENT_DIR = '/root/automaton/content';
const SITEMAP_PATH = '/root/automaton/content/sitemap.xml';

function getAllHtmlFiles(dir) {
  const files = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules' && entry.name !== 'data' && entry.name !== '.git') {
          files.push(...getAllHtmlFiles(fullPath));
        }
      } else if (entry.name.endsWith('.html')) {
        files.push(fullPath);
      }
    }
  } catch (e) {
    console.error(`Error reading ${dir}: ${e.message}`);
  }
  return files;
}

function getPriorityWeight(filepath) {
  const name = path.basename(filepath, '.html');
  const rel = path.relative(CONTENT_DIR, filepath);
  
  if (name === 'index' && !rel.includes('/')) return '1.0';
  if (name === 'api-docs' || name === 'api-playground') return '0.9';
  if (name === 'upgrade' || name === 'pricing' || name === 'dashboard') return '0.9';
  if (name === 'demo') return '0.8';
  if (rel.startsWith('blog/')) return '0.7';
  if (rel.startsWith('tools/')) return '0.6';
  return '0.5';
}

function getChangeFreq(filepath) {
  const name = path.basename(filepath, '.html');
  const rel = path.relative(CONTENT_DIR, filepath);
  
  if (name === 'index') return 'weekly';
  if (name === 'sitemap') return 'never';
  if (rel.startsWith('blog/')) return 'monthly';
  return 'monthly';
}

function getLastMod(filepath) {
  try {
    const stat = fs.statSync(filepath);
    return stat.mtime.toISOString().split('T')[0];
  } catch {
    return '2026-06-16';
  }
}

function toUrlPath(filepath) {
  const rel = path.relative(CONTENT_DIR, filepath);
  const name = path.basename(rel, '.html');
  const dir = path.dirname(rel);
  
  if (name === 'index' && dir === '.') return '';
  if (name === 'index') return '/' + dir;
  
  const urlPath = rel.replace(/\.html$/, '');
  return '/' + urlPath;
}

function escapeXml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function generateSitemap() {
  const files = getAllHtmlFiles(CONTENT_DIR);
  const urls = [];
  
  for (const file of files) {
    const urlPath = toUrlPath(file);
    if (urlPath === '/sitemap' || urlPath === '/submit-directories') continue;
    
    urls.push({
      loc: DOMAIN + urlPath,
      lastmod: getLastMod(file),
      changefreq: getChangeFreq(file),
      priority: getPriorityWeight(file)
    });
  }
  
  urls.sort((a, b) => parseFloat(b.priority) - parseFloat(a.priority));

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  for (const url of urls) {
    xml += '  <url>\n';
    xml += `    <loc>${escapeXml(url.loc)}</loc>\n`;
    xml += `    <lastmod>${url.lastmod}</lastmod>\n`;
    xml += `    <changefreq>${url.changefreq}</changefreq>\n`;
    xml += `    <priority>${url.priority}</priority>\n`;
    xml += '  </url>\n';
  }
  xml += '</urlset>';
  
  fs.writeFileSync(SITEMAP_PATH, xml);
  console.log(`✅ Sitemap generated: ${urls.length} URLs → ${SITEMAP_PATH}`);
  return urls.length;
}

function pingSearchEngines() {
  const pings = [
    { url: `https://www.google.com/ping?sitemap=${DOMAIN}/sitemap.xml` },
    { url: `https://www.bing.com/ping?sitemap=${DOMAIN}/sitemap.xml` },
    { url: `https://api.indexnow.org/indexnow?url=${DOMAIN}/sitemap.xml&key=5f8a3c2e1d4b6a9f7e0c3d8b2a5f4e6c` }
  ];

  return Promise.allSettled(pings.map((ping) => {
    return new Promise((resolve) => {
      const urlObj = new URL(ping.url);
      const mod = urlObj.protocol === 'https:' ? https : http;
      const req = mod.get(urlObj.href, { timeout: 10000 }, (res) => {
        let body = '';
        res.on('data', c => body += c);
        res.on('end', () => resolve({ name: urlObj.hostname, status: res.statusCode }));
      });
      req.on('error', (e) => resolve({ name: urlObj.hostname, error: e.message }));
      req.on('timeout', () => { req.destroy(); resolve({ name: urlObj.hostname, error: 'timeout' }); });
    });
  }));
}

async function main() {
  console.log('=== Sitemap Updater ===\n');
  
  const count = generateSitemap();
  
  console.log('\nPinging search engines...');
  const results = await pingSearchEngines();
  results.forEach(r => {
    if (r.status === 'fulfilled') {
      const v = r.value;
      console.log(`  ${v.name}: ${v.status || v.error}`);
    }
  });
  
  console.log('\n=== Done ===');
  console.log(`Total URLs: ${count}`);
  console.log(`New pages: /mcp-config-generator, /blog/mcp-ai-code-review-server-guide, /blog/free-ai-code-review-api`);
}

main().catch(console.error);
