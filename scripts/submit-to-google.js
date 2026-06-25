#!/usr/bin/env node
// submit-to-google.js — Submit to Google Search Console for indexing
// This creates well-formed submission data and pings Google's index
// No API key needed — uses IndexNow and manual guide

const https = require('https');
const fs = require('fs');
const path = require('path');

const SITE = 'https://automation.songheng.vip';
const CONTENT = '/root/automaton/content/';
const DATA_DIR = '/root/automaton/data/';
const LOG = DATA_DIR + 'indexing-log.json';

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function log(msg) {
  const ts = new Date().toISOString().replace('T',' ').slice(0,19);
  console.log(`[${ts}] ${msg}`);
  const entries = fs.existsSync(LOG) ? JSON.parse(fs.readFileSync(LOG,'utf-8')) : [];
  entries.push({ ts: new Date().toISOString(), msg });
  if (entries.length > 1000) entries.splice(0, entries.length - 1000);
  fs.writeFileSync(LOG, JSON.stringify(entries, null, 2));
}

function httpRequest(url, method = 'GET') {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts = {
      hostname: u.hostname,
      path: u.pathname + u.search,
      method,
      timeout: 15000,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; my-automaton/1.0; +' + SITE + ')' }
    };
    const req = https.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d.slice(0,500) }));
    });
    req.on('error', reject);
    req.end();
  });
}

async function generateGoogleVerificationFile() {
  // Google Search Console requires verifying domain ownership
  // Since we don't have a Google account API, we create the DNS verification guide
  
  const guide = `=== GOOGLE SEARCH CONSOLE SETUP ===

1. Go to https://search.google.com/search-console
2. Add property: ${SITE}
3. Choose "Domain" method (DNS TXT record)
4. Add this TXT record to your DNS:
   - Name: songheng.vip (or @)
   - Type: TXT
   - Value: google-site-verification=YOUR_VERIFICATION_CODE
5. Click Verify

ALTERNATIVELY — HTML file method:
1. Download the verification HTML file from Google
2. Place it in /root/automaton/content/
3. The gateway serves it automatically

Once verified:
1. Submit sitemap: ${SITE}/sitemap.xml
2. Request indexing of key pages
3. Monitor performance

BING WEBMASTER TOOLS (similar):
1. Go to https://www.bing.com/webmasters
2. Add site: ${SITE}
3. Verify with the same method
4. Submit sitemap

YANDEX WEBMASTER:
1. Go to https://webmaster.yandex.com/
2. Add site and verify
3. Submit sitemap
`;
  fs.writeFileSync(DATA_DIR + 'search-console-guide.md', guide);
  log('Generated Search Console setup guide');
}

async function pingIndexNow() {
  // IndexNow is supported by Bing, Yandex, and some others
  // Google doesn't support IndexNow, but it's worth doing for Bing traffic
  
  const key = 'automaton-' + Math.random().toString(36).slice(2, 10);
  fs.writeFileSync(DATA_DIR + 'indexnow-key.txt', key);
  
  // Ensure well-known endpoint exists
  const wellKnownDir = CONTENT + '../.well-known';
  if (!fs.existsSync(wellKnownDir)) fs.mkdirSync(wellKnownDir, { recursive: true });
  fs.writeFileSync(CONTENT + '../.well-known/now.txt', key);
  
  // Collect all URLs
  const urls = [];
  function scan(dir, prefix) {
    for (const f of fs.readdirSync(dir)) {
      if (f.startsWith('.')) continue;
      const full = path.join(dir, f);
      if (fs.statSync(full).isDirectory()) {
        scan(full, prefix + '/' + f);
      } else if (f.endsWith('.html')) {
        let slug = prefix + '/' + f.replace(/\.html$/, '');
        if (slug.endsWith('/index')) slug = slug.replace(/\/index$/, '');
        if (!slug) slug = '/';
        urls.push(SITE + slug);
      }
    }
  }
  scan(CONTENT.replace(/\/$/, ''), '');
  
  // Ping IndexNow
  const hostname = 'bing.com';
  const urlList = urls.slice(0, 10); // IndexNow max 10 URLs per request
  
  const body = JSON.stringify({
    host: 'automation.songheng.vip',
    key: key,
    keyLocation: SITE + '/.well-known/now.txt',
    urlList: urlList
  });
  
  log(`Pinging IndexNow with ${urlList.length} URLs...`);
  
  const res = await new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.indexnow.org',
      path: '/indexnow',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(body)
      },
      timeout: 15000
    }, r => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => resolve({ status: r.statusCode, body: d.slice(0,200) }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
  
  log(`IndexNow response: HTTP ${res.status} ${res.body}`);
  return res;
}

async function generateSearchConsoleSubmissionData() {
  // Create a file with all URLs formatted for manual Google submission
  const urls = [];
  function scan(dir, prefix) {
    for (const f of fs.readdirSync(dir)) {
      if (f.startsWith('.')) continue;
      const full = path.join(dir, f);
      if (fs.statSync(full).isDirectory()) scan(full, prefix + '/' + f);
      else if (f.endsWith('.html')) {
        let slug = prefix + '/' + f.replace(/\.html$/, '');
        if (slug.endsWith('/index')) slug = slug.replace(/\/index$/, '');
        if (!slug) slug = '/';
        urls.push(SITE + slug);
      }
    }
  }
  scan(CONTENT.replace(/\/$/, ''), '');
  
  // URL Inspection tool can only submit one at a time
  // Create a batch submission guide
  const submissionGuide = `=== GOOGLE URL SUBMISSION ===

Total pages: ${urls.length}

To request indexing in Google Search Console:
1. Go to https://search.google.com/search-console/inspect
2. Enter each URL below
3. Click "Request Indexing"

PRIORITY PAGES (submit these first):
${urls.slice(0, 5).map(u => '- ' + u).join('\n')}

ALL URLs for reference:
${urls.map(u => u).join('\n')}

=== BING URL SUBMISSION ===
${urls.map(u => u).join('\n')}
`;
  fs.writeFileSync(DATA_DIR + 'url-submission-list.txt', submissionGuide);
  log(`Generated URL submission list with ${urls.length} URLs`);
  return urls;
}

async function verifySiteOnline() {
  try {
    const res = await httpRequest(SITE + '/health');
    log(`Site health check: HTTP ${res.status} (${res.body.slice(0,50)})`);
    return res.status === 200;
  } catch(e) {
    log(`Site health check FAILED: ${e.message}`);
    return false;
  }
}

async function main() {
  log('=== Search Engine Submission ===');
  
  // 1. Verify site is online
  const online = await verifySiteOnline();
  if (!online) {
    log('WARNING: Site may not be publicly accessible');
  }
  
  // 2. Generate Google Search Console guide
  await generateGoogleVerificationFile();
  
  // 3. Generate URL submission data
  const urls = await generateSearchConsoleSubmissionData();
  
  // 4. Ping IndexNow
  const indexNowRes = await pingIndexNow();
  
  // 5. Try direct Google ping endpoint
  log('Pinging Google update endpoint...');
  try {
    const res = await httpRequest(`https://www.google.com/ping?sitemap=${encodeURIComponent(SITE + '/sitemap.xml')}`);
    log(`Google ping: HTTP ${res.status}`);
  } catch(e) {
    log(`Google ping error: ${e.message}`);
  }
  
  // Summary
  log(`
=== SUBMISSION SUMMARY ===
Site: ${SITE}
Pages ready for indexing: ${urls.length}
Sitemap: ${SITE}/sitemap.xml
IndexNow: HTTP ${indexNowRes.status}
Google Console Guide: ${DATA_DIR}search-console-guide.md
URL List: ${DATA_DIR}url-submission-list.txt

NEXT STEPS (manual):
1. Verify domain in Google Search Console
2. Submit sitemap.xml 
3. Request indexing for top 5 pages
4. Do the same on Bing Webmaster Tools
5. Monitor traffic after 48-72 hours
`);
}

main().catch(e => log(`FATAL: ${e.message}`));
