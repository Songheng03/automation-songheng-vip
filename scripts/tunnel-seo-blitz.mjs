#!/usr/bin/env node
/**
 * Tunnel SEO Blitz — Use the working trycloudflare tunnel to submit to search engines
 * Run this whenever the tunnel is live to maximize SEO window.
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';

const CFG = '/root/automaton/data/current-tunnel.txt';
const SITEMAP = '/root/automaton/data/sitemap.xml';
const LOG = '/root/automaton/data/outreach-blitz.log';

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  if (existsSync(LOG)) {
    writeFileSync(LOG, readFileSync(LOG, 'utf8') + '\n' + line);
  } else {
    writeFileSync(LOG, line + '\n');
  }
}

// Get current tunnel URL
const tunnelRaw = readFileSync(CFG, 'utf8').trim();
const lines = tunnelRaw.split('\n');
const tunnelUrl = lines[1] || `https://${lines[0]}.trycloudflare.com`;
const tunnelHost = lines[0];

log(`=== TUNNEL SEO BLITZ START ===`);
log(`Tunnel: ${tunnelUrl}`);

// 1. Test gateway via tunnel
async function testGateway() {
  try {
    const resp = await fetch(`${tunnelUrl}/`);
    log(`Gateway via tunnel: ${resp.status}`);
    return resp.status === 200;
  } catch (e) {
    log(`Gateway via tunnel FAILED: ${e.message}`);
    return false;
  }
}

// 2. Test a free endpoint
async function testFreeEndpoint() {
  try {
    const resp = await fetch(`${tunnelUrl}/free/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'Hello world', mode: 'analyze' })
    });
    log(`Free analyze endpoint: ${resp.status}`);
    return resp.status === 200;
  } catch (e) {
    log(`Free endpoint FAILED: ${e.message}`);
    return false;
  }
}

// 3. Submit to Bing IndexNow
async function pingBing() {
  const keyFile = '/root/automaton/data/indexnow-key.txt';
  if (!existsSync(keyFile)) {
    log('No IndexNow key found, skipping Bing');
    return false;
  }
  const key = readFileSync(keyFile, 'utf8').trim();
  
  // Use tunnel URLs for IndexNow
  const urls = [
    `${tunnelUrl}/`,
    `${tunnelUrl}/blog.html`,
    `${tunnelUrl}/pricing.html`,
    `${tunnelUrl}/api-docs.html`,
    `${tunnelUrl}/dev-quickstart.html`,
    `${tunnelUrl}/api-playground.html`,
  ];
  
  let success = 0;
  for (const url of urls) {
    try {
      const payload = JSON.stringify({
        host: tunnelHost,
        key,
        keyLocation: `${tunnelUrl}/${key}.txt`,
        urlList: [url]
      });
      const resp = await fetch('https://bing.com/indexnow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload
      });
      if (resp.status === 200) {
        log(`Bing IndexNow OK: ${url}`);
        success++;
      } else {
        log(`Bing IndexNow ${resp.status}: ${url}`);
      }
    } catch (e) {
      log(`Bing IndexNow FAILED for ${url}: ${e.message}`);
    }
  }
  return success > 0;
}

// 4. Submit to Yandex
async function pingYandex() {
  try {
    const urls = [
      `${tunnelUrl}/`,
      `${tunnelUrl}/blog.html`,
    ];
    for (const url of urls) {
      const resp = await fetch(`https://webmaster.yandex.com/indexnow?url=${encodeURIComponent(url)}`);
      log(`Yandex IndexNow: ${resp.status} for ${url}`);
    }
    return true;
  } catch (e) {
    log(`Yandex FAILED: ${e.message}`);
    return false;
  }
}

// 5. Try to submit to Google with our sitemap
async function pingGoogle() {
  // Google doesn't have IndexNow. We'll just log it.
  log('Google: submit sitemap manually via Search Console');
  log(`  URL: https://search.google.com/search-console/inspect?resource_id=${encodeURIComponent(tunnelUrl)}`);
  return true;
}

// 6. Test all key pages
async function testAllPages() {
  const pages = [
    '/', '/blog.html', '/pricing.html', '/api-docs.html', 
    '/dev-quickstart.html', '/api-playground.html', '/dashboard.html',
    '/agent-roast.html', '/survival-calculator.html', '/free-api-key.html',
    '/dev-toolbox.html', '/regex-tester.html', '/json-to-typescript.html',
    '/diff-checker.html', '/contrast-checker.html', '/api-spec-generator.html',
    '/press-kit.html'
  ];
  
  let working = 0;
  let failed = 0;
  for (const page of pages) {
    try {
      const resp = await fetch(`${tunnelUrl}${page}`, { redirect: 'manual' });
      if (resp.status === 200) {
        working++;
      } else {
        log(`Page ${page}: ${resp.status}`);
        failed++;
      }
    } catch (e) {
      log(`Page ${page}: FAILED - ${e.message}`);
      failed++;
    }
  }
  log(`Page scan: ${working} working, ${failed} failed out of ${pages.length}`);
  return { working, failed };
}

// Main
async function main() {
  const gateway = await testGateway();
  if (!gateway) {
    log('FATAL: Gateway not reachable via tunnel. Aborting.');
    return;
  }
  
  await testFreeEndpoint();
  await pingBing();
  await pingYandex();
  await pingGoogle();
  await testAllPages();
  
  log(`=== TUNNEL SEO BLITZ DONE ===`);
  log(`Tunnel URL: ${tunnelUrl}`);
  log(`Tunnel Host: ${tunnelHost}`);
  log(`This tunnel URL is temporary. Use it while it lasts.`);
}

main().catch(e => log(`FATAL: ${e.message}`));
