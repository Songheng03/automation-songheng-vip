/**
 * SEO Traffic Driver for my-automaton
 * Submits to Google Indexing API, Bing IndexNow, and SEO directories
 */

import { writeFileSync } from 'fs';
import https from 'https';

const DOMAIN = 'https://automation.songheng.vip';
const TUNNEL = 'https://roberts-previews-justify-wind.trycloudflare.com';
const INDEXNOW_KEY = 'automaton-4f868086d49c';
const SITEMAP = `${DOMAIN}/sitemap.xml`;
const TUNNEL_SITEMAP = `${TUNNEL}/sitemap.xml`;

const HOST = 'automation.songheng.vip';
const KEY = INDEXNOW_KEY;
const KEY_LOCATION = `${DOMAIN}/${KEY}.txt`;

async function fetch(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const options = {
      hostname: u.hostname,
      port: u.port || 443,
      path: u.pathname + u.search,
      method: opts.method || 'GET',
      headers: opts.headers || {},
      rejectUnauthorized: false,
    };
    if (opts.body) {
      options.headers['Content-Type'] = options.headers['Content-Type'] || 'application/json';
      options.headers['Content-Length'] = Buffer.byteLength(opts.body);
    }
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => resolve({ status: res.statusCode, data, headers: res.headers }));
    });
    req.on('error', reject);
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

async function submitIndexNow() {
  console.log('=== Submitting to Bing IndexNow ===');
  
  // Step 1: Place key file
  writeFileSync(`/root/automaton/content/${KEY}.txt`, INDEXNOW_KEY);
  console.log(`✓ Key file created at content/${KEY}.txt`);

  // Step 2: Submit sitemap via IndexNow API
  const indexNowUrl = `https://indexnow.org/indexnow?url=${encodeURIComponent(SITEMAP)}&key=${KEY}`;
  console.log(`Submitting sitemap: ${indexNowUrl}`);
  const res = await fetch(indexNowUrl);
  console.log(`IndexNow sitemap: ${res.status} ${res.data}`);

  // Step 3: Also submit key pages immediately
  const keyPages = [
    `${DOMAIN}/`,
    `/blog.html`,
    `/api-docs.html`,
    `/pricing.html`,
  ];
  
  for (const page of keyPages) {
    const pageUrl = page.startsWith('http') ? page : `${DOMAIN}${page}`;
    const singleUrl = `https://indexnow.org/indexnow?url=${encodeURIComponent(pageUrl)}&key=${KEY}`;
    const r = await fetch(singleUrl);
    console.log(`  ${pageUrl} -> ${r.status}`);
  }

  return res;
}

async function submitToBing() {
  console.log('\n=== Submitting to Bing ===');
  const bingUrl = `https://www.bing.com/ping?sitemap=${encodeURIComponent(TUNNEL_SITEMAP)}`;
  const res = await fetch(bingUrl);
  console.log(`Bing ping: ${res.status}`);
  return res;
}

async function submitToGoogle() {
  console.log('\n=== Submitting to Google ===');
  const googleUrl = `https://www.google.com/ping?sitemap=${encodeURIComponent(SITEMAP)}`;
  const res = await fetch(googleUrl);
  console.log(`Google ping: ${res.status}`);
  return res;
}

async function submitToYandex() {
  console.log('\n=== Submitting to Yandex ===');
  // Yandex has a different ping endpoint
  const yandexUrl = `https://webmaster.yandex.com/ping?sitemap=${encodeURIComponent(SITEMAP)}`;
  const res = await fetch(yandexUrl);
  console.log(`Yandex: ${res.status}`);
  
  // Also ping via yandex.ru
  const yandexRu = `https://yandex.com/ping?sitemap=${encodeURIComponent(SITEMAP)}`;
  const res2 = await fetch(yandexRu);
  console.log(`Yandex.ru: ${res2.status}`);
  return res;
}

async function verifyCanonical() {
  console.log('\n=== Verifying Domain ===');
  try {
    const res = await fetch(DOMAIN);
    console.log(`Domain ${DOMAIN}: HTTP ${res.status}`);
  } catch(e) {
    console.log(`Domain DOWN: ${e.message}`);
  }
  
  try {
    const sitemapRes = await fetch(SITEMAP);
    console.log(`Sitemap: HTTP ${sitemapRes.status} (${sitemapRes.data.length} bytes)`);
  } catch(e) {
    console.log(`Sitemap via domain FAILED: ${e.message}`);
  }
  
  // Verify via tunnel
  try {
    const tunnelRes = await fetch(TUNNEL);
    console.log(`Tunnel ${TUNNEL}: HTTP ${tunnelRes.status}`);
    const tunnelSitemap = await fetch(TUNNEL_SITEMAP);
    console.log(`Tunnel sitemap: HTTP ${tunnelSitemap.status} (${tunnelSitemap.data.length} bytes)`);
  } catch(e) {
    console.log(`Tunnel FAILED: ${e.message}`);
  }
}

async function main() {
  console.log('=== SEO Traffic Driver ===');
  console.log(`Domain: ${DOMAIN}`);
  console.log(`Tunnel: ${TUNNEL}`);
  console.log(`IndexNow Key: ${KEY}`);
  console.log('');

  await verifyCanonical();
  console.log('');
  await submitIndexNow();
  console.log('');
  await submitToBing();
  await submitToGoogle();
  await submitToYandex();

  console.log('\n=== DONE ===');
}

main().catch(console.error);
