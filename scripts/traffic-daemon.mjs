#!/usr/bin/env node
/**
 * traffic-daemon.mjs — Automated traffic generation & monitoring
 * 
 * Runs every 2 hours via heartbeat. Does:
 * 1. Pings search engines with sitemap
 * 2. Generates fresh sitemap
 * 3. Checks gateway health
 * 4. Logs stats to /root/automaton/data/traffic-daemon.log
 */

import { writeFileSync, readFileSync, existsSync, appendFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

const SITE_URL = 'https://automation.songheng.vip';
const GATEWAY = 'http://localhost:8080';
const DATA_DIR = '/root/automaton/data';
const CONTENT_DIR = '/root/automaton/content';
const LOG = join(DATA_DIR, 'traffic-daemon.log');
const STATS = join(DATA_DIR, 'traffic-stats.json');

function ensureDir(p) {
  if (!existsSync(dirname(p))) mkdirSync(dirname(p), { recursive: true });
}

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  ensureDir(LOG);
  appendFileSync(LOG, line + '\n');
}

function getPagePaths() {
  const paths = [
    '/', '/api-docs.html', '/blog.html', '/demo.html', '/upgrade.html',
    '/api-playground.html', '/install-mcp.html', '/readme-badges.html',
    '/openapi.json', '/pricing-calculator.html', '/code-review.html',
    '/security-scanner.html', '/json-formatter.html', '/regex-tester.html',
    '/mcp-config-generator.html', '/badge-generator.html', '/seo-audit.html',
  ];
  
  // Add blog articles
  const blogDir = join(CONTENT_DIR, 'blog');
  if (existsSync(blogDir)) {
    const { readdirSync } = require ? require('fs') : null;
    // Manually scan
    try {
      const fs = require('fs');
      const files = fs.readdirSync(blogDir).filter(f => f.endsWith('.html'));
      for (const f of files) paths.push(`/blog/${f}`);
    } catch {}
  }
  
  return paths;
}

function generateSitemap() {
  const paths = getPagePaths();
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths.map(p => `  <url>
    <loc>${SITE_URL}${p}</loc>
    <priority>${p === '/' ? '1.0' : p.startsWith('/blog/') ? '0.6' : '0.7'}</priority>
    <changefreq>${p === '/' ? 'weekly' : 'monthly'}</changefreq>
  </url>`).join('\n')}
</urlset>`;
  
  writeFileSync(join(CONTENT_DIR, 'sitemap.xml'), xml);
  log(`Sitemap: ${paths.length} URLs`);
  return paths.length;
}

async function pingSearchEngines() {
  log('Pinging search engines...');
  const engines = [
    ['Google', `https://www.google.com/ping?sitemap=${SITE_URL}/sitemap.xml`],
    ['Bing', `https://www.bing.com/ping?sitemap=${SITE_URL}/sitemap.xml`],
  ];
  
  for (const [name, url] of engines) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
      log(`${name}: HTTP ${res.status}`);
    } catch (e) {
      log(`${name}: ${e.message}`);
    }
  }
}

async function checkGateway() {
  log('Checking gateway...');
  const checks = ['/', '/api-docs.html', '/demo.html', '/blog.html'];
  let ok = 0, fail = 0;
  
  for (const path of checks) {
    try {
      const res = await fetch(`${GATEWAY}${path}`, { signal: AbortSignal.timeout(5000) });
      if (res.ok) ok++;
      else fail++;
    } catch {
      fail++;
    }
  }
  
  const status = fail === 0 ? 'HEALTHY' : fail > ok ? 'UNHEALTHY' : 'DEGRADED';
  log(`Gateway: ${status} (${ok}/${ok+fail} endpoints OK)`);
  return status;
}

async function main() {
  log('=== Traffic Daemon Run ===');
  
  const urlCount = generateSitemap();
  await pingSearchEngines();
  const status = await checkGateway();
  
  const stats = {
    timestamp: new Date().toISOString(),
    urlCount,
    gatewayStatus: status,
    site: SITE_URL,
  };
  
  ensureDir(STATS);
  writeFileSync(STATS, JSON.stringify(stats, null, 2));
  log(`Stats saved: ${JSON.stringify(stats)}`);
  log('=== Traffic Daemon Complete ===\n');
}

main().catch(e => {
  log(`FATAL: ${e.message}`);
  process.exit(1);
});
