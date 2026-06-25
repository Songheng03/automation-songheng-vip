#!/usr/bin/env node
/**
 * seo-monitor.mjs — my-automaton SEO & Indexing Monitor
 * 
 * Tracks:
 * - Which pages are indexable (status codes)
 * - Sitemap health
 * - Google/ Bing indexing hints (via URL inspection API if configured)
 * - Directory submission status
 * 
 * Run: node scripts/seo-monitor.mjs
 * Cron: 0 */6 * * * node /root/automaton/scripts/seo-monitor.mjs
 */

import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = '/root/automaton/data';
const CONTENT_DIR = '/root/automaton/content';
const GATEWAY = 'http://localhost:8080';
const PUBLIC_URL = 'https://automation.songheng.vip';

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.appendFileSync(path.join(DATA_DIR, 'seo-monitor.log'), line + '\n');
  } catch {}
}

function rj(p, d = {}) { try { return JSON.parse(fs.readFileSync(p, 'utf-8')); } catch { return d; } }
function wj(p, d) { try { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, JSON.stringify(d, null, 2)); } catch {} }

// Pages to monitor
const PAGES = [
  '/', '/playground.html', '/api-docs.html', '/upgrade.html', '/comparison.html',
  '/dev-toolbox.html', '/readme-badges.html', '/devops-activate.html',
  '/blog.html', '/blog/', '/blog/i-built-a-free-ai-code-review-api.html',
  '/blog/building-a-sovereign-ai-agent-that-pays-its-own-server-costs.html',
  '/blog/from-zero-to-revenue-building-a-self-sustaining-ai.html',
  '/blog/the-ultimate-guide-to-free-ai-code-review-tools-2026.html',
  '/blog/ai-code-review-vs-traditional-tools-why-free-matters.html',
  '/sitemap.xml', '/robots.txt', '/openapi.json',
];

async function checkPage(url) {
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(8000), redirect: 'manual' });
    const ct = resp.headers.get('content-type') || '';
    return {
      status: resp.status,
      ok: resp.status === 200,
      contentType: ct.substring(0, 40),
      size: parseInt(resp.headers.get('content-length') || '0'),
      location: resp.status >= 300 && resp.status < 400 ? resp.headers.get('location') : null,
    };
  } catch (e) {
    return { status: 0, ok: false, error: e.message };
  }
}

async function checkSitemap() {
  try {
    const resp = await fetch(`${GATEWAY}/sitemap.xml`, { signal: AbortSignal.timeout(5000) });
    const text = await resp.text();
    const urls = (text.match(/<loc>(.*?)<\/loc>/g) || []).length;
    return { ok: resp.ok, urls, status: resp.status };
  } catch (e) {
    return { ok: false, urls: 0, error: e.message };
  }
}

function scanContentFiles() {
  try {
    if (!fs.existsSync(CONTENT_DIR)) return 0;
    const files = fs.readdirSync(CONTENT_DIR, { recursive: true })
      .filter(f => f.endsWith('.html') || f.endsWith('.xml') || f.endsWith('.js') || f.endsWith('.mjs'))
      .filter(f => !f.includes('node_modules'));
    return files.length;
  } catch { return 0; }
}

async function main() {
  log('=== SEO Monitor ===');
  
  // 1. Check sitemap
  const sitemap = await checkSitemap();
  log(`Sitemap: ${sitemap.ok ? `✅ ${sitemap.urls} URLs` : '❌ ' + (sitemap.error || sitemap.status)}`);
  
  // 2. Check all pages
  const results = [];
  for (const page of PAGES) {
    const url = `${GATEWAY}${page}`;
    const result = await checkPage(url);
    results.push({ page, ...result });
    if (!result.ok && result.status !== 0) {
      log(`  ${result.status === 404 ? '❌' : '⚠️'} ${page} → ${result.status}`);
    }
  }
  
  const ok = results.filter(r => r.ok).length;
  const notFound = results.filter(r => r.status === 404).length;
  const errors = results.filter(r => !r.ok && r.status !== 404).length;
  log(`Pages: ${ok}/${PAGES.length} OK, ${notFound} missing, ${errors} errors`);
  
  // 3. Check content directory
  const contentFiles = scanContentFiles();
  log(`Content files: ${contentFiles}`);
  
  // 4. Check gateway health
  let gatewayHealthy = false;
  try {
    const h = await fetch(`${GATEWAY}/health`, { signal: AbortSignal.timeout(3000) });
    gatewayHealthy = h.ok;
  } catch {}
  log(`Gateway: ${gatewayHealthy ? '✅' : '❌'}`);
  
  // 5. Check blog articles
  const blogDir = path.join(CONTENT_DIR, 'blog');
  let blogCount = 0;
  try {
    if (fs.existsSync(blogDir)) {
      blogCount = fs.readdirSync(blogDir).filter(f => f.endsWith('.html')).length;
    }
  } catch {}
  log(`Blog articles: ${blogCount}`);
  
  // 6. Store results
  const report = {
    timestamp: new Date().toISOString(),
    sitemap: { urls: sitemap.urls, ok: sitemap.ok },
    pages: { total: PAGES.length, ok, notFound, errors },
    contentFiles,
    blogCount,
    gatewayHealthy,
    details: results.map(r => ({ page: r.page, status: r.status, ok: r.ok })),
    publicUrl: PUBLIC_URL,
  };
  
  wj(path.join(DATA_DIR, 'seo-report.json'), report);
  
  // Generate summary for status
  const summary = `📊 SEO Report (${new Date().toLocaleDateString()}):
  • Pages: ${ok}/${PAGES.length} indexable
  • Sitemap: ${sitemap.ok ? sitemap.urls + ' URLs' : 'DOWN'}
  • Content: ${contentFiles} files
  • Blog: ${blogCount} articles
  • Gateway: ${gatewayHealthy ? '✅' : '❌'}`;
  
  log(summary);
  wj(path.join(DATA_DIR, 'seo-summary.txt'), summary);
  
  log('=== Done ===');
}

main().catch(e => log(`ERROR: ${e.message}`));
