#!/usr/bin/env node
/**
 * ping-indexnow.js — Submit all pages to IndexNow for instant indexing
 * Also pings Bing, Google, and other search engines
 */
const https = require('https');
const http = require('http');

const SITE_URL = 'https://automation.songheng.vip';
const INDEXNOW_KEY = 'cf26b7c2e8e14b71a9e1c0d5f3a4b8c9';

// Pages to submit
const PAGES = [
  '/', '/tools', '/blog', '/api-docs', '/dashboard', '/playground',
  '/live-demo', '/upgrade', '/pricing', '/quickstart',
  '/tools/json-to-typescript', '/tools/json-to-csv', '/tools/json-formatter',
  '/tools/regex-tester', '/tools/http-status-codes', '/tools/seo-meta-tag-generator',
  '/tools/text-utility', '/tools/seo-audit', '/tools/badge-generator',
  '/ai-code-reviewer', '/payment-success',
];

function pingIndexNow() {
  return new Promise((resolve) => {
    const urls = PAGES.map(p => SITE_URL + p);
    const data = JSON.stringify({
      host: 'automation.songheng.vip',
      key: INDEXNOW_KEY,
      keyLocation: SITE_URL + '/cf26b7c2e8e14b71a9e1c0d5f3a4b8c9.txt',
      urlList: urls
    });
    
    const req = https.request({
      hostname: 'api.indexnow.org',
      path: '/indexnow',
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': data.length }
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        console.log(`IndexNow: ${res.statusCode} ${body.substring(0,200)}`);
        resolve(res.statusCode);
      });
    });
    req.on('error', e => { console.log('IndexNow error:', e.message); resolve(0); });
    req.write(data);
    req.end();
  });
}

function pingBing() {
  return new Promise((resolve) => {
    const data = JSON.stringify({
      siteUrl: SITE_URL,
      url: SITE_URL + '/sitemap.xml'
    });
    const req = https.request({
      hostname: 'www.bing.com',
      path: '/ping?sitemap=' + encodeURIComponent(SITE_URL + '/sitemap.xml'),
      method: 'GET'
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        console.log(`Bing: ${res.statusCode}`);
        resolve(res.statusCode);
      });
    });
    req.on('error', e => { console.log('Bing error:', e.message); resolve(0); });
    req.end();
  });
}

async function main() {
  console.log(`Submitting ${PAGES.length} pages to search engines...\n`);
  
  // Check sitemap
  console.log('Checking sitemap...');
  try {
    const r = await fetch(SITE_URL + '/sitemap.xml');
    const text = await r.text();
    const count = (text.match(/<url>/g) || []).length;
    console.log(`Sitemap: ${count} URLs found\n`);
  } catch(e) {
    console.log('Sitemap check failed:', e.message);
  }
  
  // Submit to IndexNow
  console.log('Submitting to IndexNow...');
  await pingIndexNow();
  
  // Submit to Bing
  console.log('Pinging Bing...');
  await pingBing();
  
  console.log('\nDone!');
}

main();
