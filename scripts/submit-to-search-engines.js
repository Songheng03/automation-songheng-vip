#!/usr/bin/env node
// IndexNow URL Submitter — properly submits all URLs with verified key
// Run via heartbeat: node /root/automaton/scripts/submit-to-search-engines.js

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const DOMAIN = 'automation.songheng.vip';
const SITE = `https://${DOMAIN}`;
const DATA_DIR = '/root/automaton/data';
const KEY_FILE = path.join(DATA_DIR, 'indexnow-key.txt');

// Ensure key exists
function getKey() {
  try {
    let key = fs.readFileSync(KEY_FILE, 'utf-8').trim();
    if (!key) throw new Error('empty');
    return key;
  } catch(e) {
    const key = 'auto' + Date.now().toString(36);
    fs.writeFileSync(KEY_FILE, key);
    return key;
  }
}

// Write key to .well-known location
function writeKeyFile(key) {
  const d = path.join(DATA_DIR, 'well-known');
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  fs.writeFileSync(path.join(d, 'now.txt'), key);
  // Also write at content root for gateway
  fs.writeFileSync(path.join('/root/automaton/content', `${key}.txt`), key);
}

// Get all site URLs
function getUrls() {
  const urls = [SITE];
  const content = '/root/automaton/content';
  
  const add = (f) => {
    if (f.endsWith('.html') && !f.includes('/blog/')) {
      let u = f.replace(content, '').replace(/\.html$/, '');
      if (u.endsWith('/index')) u = u.replace('/index', '');
      if (!u) u = '/';
      urls.push(SITE + u);
    }
  };
  
  try {
    // Core pages
    fs.readdirSync(content).filter(f => f.endsWith('.html')).forEach(f => add(path.join(content, f)));
    // Blog posts
    const blogDir = path.join(content, 'blog');
    if (fs.existsSync(blogDir)) {
      fs.readdirSync(blogDir).filter(f => f.endsWith('.html')).forEach(f => {
        urls.push(SITE + '/blog/' + f.replace('.html', ''));
      });
    }
  } catch(e) {}
  
  return [...new Set(urls)];
}

// Submit to IndexNow API
function submitIndexNow(urls, key) {
  return new Promise((resolve, reject) => {
    const MAX_BATCH = 50;
    const batches = [];
    for (let i = 0; i < urls.length; i += MAX_BATCH) {
      batches.push(urls.slice(i, i + MAX_BATCH));
    }
    
    let results = [];
    let completed = 0;
    
    batches.forEach((batch, idx) => {
      const body = JSON.stringify({
        host: DOMAIN,
        key: key,
        keyLocation: `${SITE}/${key}.txt`,
        urlList: batch
      });
      
      const opts = {
        hostname: 'api.indexnow.org',
        path: '/indexnow',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Length': Buffer.byteLength(body)
        }
      };
      
      const req = https.request(opts, (res) => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
          results.push({ batch: idx, status: res.statusCode, body: data, count: batch.length });
          completed++;
          if (completed === batches.length) resolve(results);
        });
      });
      req.on('error', (e) => {
        results.push({ batch: idx, error: e.message, count: batch.length });
        completed++;
        if (completed === batches.length) resolve(results);
      });
      req.write(body);
      req.end();
    });
    
    if (batches.length === 0) resolve([]);
  });
}

// Submit to Bing
function submitBing(urls) {
  return new Promise((resolve) => {
    const xml = `<?xml version="1.0"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `<url><loc>${u}</loc></url>`).join('\n')}
</urlset>`;
    
    const body = new URLSearchParams({
      url: SITE + '/sitemap.xml',
      email: 'automaton@songheng.vip'
    }).toString();
    
    https.get(`https://www.bing.com/ping?sitemap=${encodeURIComponent(SITE + '/sitemap.xml')}`, (res) => {
      resolve({ engine: 'Bing', status: res.statusCode });
    }).on('error', (e) => resolve({ engine: 'Bing', error: e.message }));
  });
}

// Submit to Yandex
function submitYandex() {
  return new Promise((resolve) => {
    https.get(`https://webmaster.yandex.com/api/v2/user-feeds?host=${encodeURIComponent(DOMAIN)}`, (res) => {
      resolve({ engine: 'Yandex', status: res.statusCode });
    }).on('error', (e) => resolve({ engine: 'Yandex', error: e.message }));
  });
}

// Generate sitemap
function generateSitemap(urls) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${u}</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>`).join('\n')}
</urlset>`;
  
  fs.writeFileSync(path.join(DATA_DIR, 'sitemap.xml'), xml);
  // Also write to content dir for serving
  fs.writeFileSync('/root/automaton/content/sitemap.xml', xml);
  return xml;
}

// Generate robots.txt
function generateRobots() {
  const robots = `User-agent: *
Allow: /
Sitemap: ${SITE}/sitemap.xml
Crawl-delay: 10
`;
  fs.writeFileSync('/root/automaton/content/robots.txt', robots);
}

// === MAIN ===
async function main() {
  console.log('=== Search Engine Submission ===');
  console.log(`Domain: ${DOMAIN}`);
  console.log(`Time: ${new Date().toISOString()}`);
  
  const key = getKey();
  writeKeyFile(key);
  console.log(`Key: ${key}`);
  
  const urls = getUrls();
  console.log(`URLs to submit: ${urls.length}`);
  
  // Generate sitemap
  generateSitemap(urls);
  generateRobots();
  console.log('Sitemap: generated');
  
  // Submit to IndexNow
  console.log('\nSubmitting to IndexNow...');
  const results = await submitIndexNow(urls, key);
  results.forEach(r => {
    if (r.error) console.log(`  Batch ${r.batch}: ERROR ${r.error}`);
    else console.log(`  Batch ${r.batch}: ${r.status} (${r.count} URLs)`);
  });
  
  // Submit to Bing
  console.log('\nSubmitting to Bing...');
  const bingResult = await submitBing(urls);
  console.log(`  ${bingResult.engine}: ${bingResult.status || bingResult.error}`);
  
  // Submit to Yandex
  console.log('\nSubmitting to Yandex...');
  const yandexResult = await submitYandex();
  console.log(`  ${yandexResult.engine}: ${yandexResult.status || yandexResult.error}`);
  
  const log = {
    timestamp: new Date().toISOString(),
    urls: urls.length,
    key,
    indexnow: results,
    bing: bingResult,
    yandex: yandexResult
  };
  
  // Append to log
  const logFile = path.join(DATA_DIR, 'seo-submissions.json');
  let history = [];
  try { history = JSON.parse(fs.readFileSync(logFile, 'utf-8')); } catch(e) {}
  history.push(log);
  fs.writeFileSync(logFile, JSON.stringify(history, null, 2));
  
  console.log(`\nLog saved to ${logFile}`);
  console.log('=== Done ===');
}

if (require.main === module) main();
module.exports = { getUrls, generateSitemap, submitIndexNow, main };
