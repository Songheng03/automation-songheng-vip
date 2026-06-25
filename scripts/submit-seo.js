#!/usr/bin/env node
// SEO submission script — submits sitemap to search engines
// Run: node /root/automaton/scripts/submit-seo.js

const http = require('http');
const https = require('https');

const SITE = 'https://automation.songheng.vip';
const SITEMAP_URL = SITE + '/sitemap.xml';

const searchEngines = [
  { name: 'Google', url: `https://www.google.com/ping?sitemap=${encodeURIComponent(SITEMAP_URL)}` },
  { name: 'Bing', url: `https://www.bing.com/ping?sitemap=${encodeURIComponent(SITEMAP_URL)}` },
  { name: 'Yandex', url: `https://webmaster.yandex.com/ping?sitemap=${encodeURIComponent(SITEMAP_URL)}` },
  { name: 'IndexNow', url: 'https://api.indexnow.org/indexnow', method: 'POST', 
    data: JSON.stringify({
      host: 'automation.songheng.vip',
      key: '68e643ffcf7e42b5981558581993c185',
      keyLocation: SITE + '/68e643ffcf7e42b5981558581993c185.txt',
      urlList: [SITE + '/', SITE + '/blog', SITE + '/tools', SITE + '/api-playground']
    })
  }
];

function pingEngine(engine) {
  return new Promise((resolve) => {
    const parsed = new URL(engine.url);
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: engine.method || 'GET',
      timeout: 10000
    };
    
    if (engine.data) {
      options.headers = { 'Content-Type': 'application/json; charset=utf-8' };
      options.method = 'POST';
    }
    
    const lib = parsed.protocol === 'https:' ? https : http;
    const req = lib.request(options, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => resolve({ name: engine.name, status: res.statusCode, body: body.slice(0, 200) }));
    });
    
    req.on('error', e => resolve({ name: engine.name, status: 0, error: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ name: engine.name, status: 0, error: 'timeout' }); });
    
    if (engine.data) req.write(engine.data);
    req.end();
  });
}

async function main() {
  console.log(`Submitting sitemap: ${SITEMAP_URL}\n`);
  
  const results = await Promise.all(searchEngines.map(pingEngine));
  
  for (const r of results) {
    const icon = r.status >= 200 && r.status < 400 ? '✅' : '❌';
    console.log(`${icon} ${r.name}: HTTP ${r.status}${r.error ? ' — ' + r.error : ''}`);
    if (r.body) console.log(`   Response: ${r.body}`);
  }
  
  console.log('\nDone.');
}

main().catch(console.error);
