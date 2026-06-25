#!/usr/bin/env node
/**
 * revenue-engine.mjs — The agent's revenue heartbeat
 * 
 * Runs every 6 hours via heartbeat 'revenue-engine'.
 * 
 * What it does:
 * 1. Checks gateway health (all key routes)
 * 2. Rebuilds sitemap 
 * 3. Pings IndexNow with new content
 * 4. Generates revenue report
 * 5. Saves stats for dashboard
 * 
 * Costs: ~$0.02 per run (one inference call for the report)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONTENT = '/root/automaton/content';
const DATA = '/root/automaton/data';
const DOMAIN = 'https://automation.songheng.vip';
const INDEXNOW_KEY = '1e78337a0fbf4f2fb76c1f48158396d9';
const REPORT_FILE = path.join(CONTENT, 'data', 'revenue-report.json');

// ─── Ensure directories ───
fs.mkdirSync(path.join(CONTENT, 'data'), { recursive: true });

// ─── Check gateway health ───
async function checkHealth() {
  const routes = [
    '/api/stats/overview',
    '/api/traffic',
    '/api/free/review',
    '/',
    '/api-docs',
    '/api-playground',
    '/upgrade',
    '/demo',
    '/tools',
    '/tools/json-formatter',
    '/tools/json-to-typescript',
    '/blog',
    '/api/badge/code-review/A/92'
  ];
  
  const results = [];
  for (const route of routes) {
    try {
      const start = Date.now();
      const resp = await fetch(`${DOMAIN}${route}`, { signal: AbortSignal.timeout(5000) });
      const ms = Date.now() - start;
      results.push({ route, status: resp.status, ms, ok: resp.ok });
    } catch (e) {
      results.push({ route, status: 0, ms: 0, ok: false, error: e.message });
    }
  }
  
  const ok = results.filter(r => r.ok).length;
  const total = results.length;
  
  return { ok, total, routes: results, health: ok === total ? 'healthy' : ok > total * 0.7 ? 'degraded' : 'down' };
}

// ─── Rebuild sitemap ───
function rebuildSitemap() {
  const files = getAllHtmlFiles(CONTENT);
  const urls = files.map(f => {
    let p = '/' + f.replace(/\\/g, '/');
    if (p.endsWith('/index.html')) p = p.replace('/index.html', '/');
    return `  <url><loc>${DOMAIN}${p}</loc><lastmod>${new Date().toISOString().slice(0,10)}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`;
  }).join('\n');
  
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
  fs.writeFileSync(path.join(CONTENT, 'sitemap.xml'), xml);
  
  // Also write IndexNow key
  fs.writeFileSync(path.join(CONTENT, `${INDEXNOW_KEY}.txt`), INDEXNOW_KEY);
  
  return files.length;
}

function getAllHtmlFiles(dir, base = '') {
  const results = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const fp = path.join(dir, e.name);
      const rp = base ? `${base}/${e.name}` : e.name;
      if (e.isDirectory()) results.push(...getAllHtmlFiles(fp, rp));
      else if (e.name.endsWith('.html')) results.push(rp);
    }
  } catch {}
  return results;
}

// ─── Ping IndexNow ───
async function pingIndexNow(urls) {
  try {
    const resp = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        host: 'automation.songheng.vip',
        key: INDEXNOW_KEY,
        keyLocation: `${DOMAIN}/${INDEXNOW_KEY}.txt`,
        urlList: urls.slice(0, 10)
      })
    });
    return { status: resp.status, ok: resp.ok };
  } catch (e) {
    return { status: 0, ok: false, error: e.message };
  }
}

// ─── Generate report ───
async function generateReport() {
  const health = await checkHealth();
  const pages = rebuildSitemap();
  
  // Get top URLs for indexing
  const allFiles = getAllHtmlFiles(CONTENT);
  const recentFiles = allFiles
    .map(f => ({ name: f, mtime: fs.statSync(path.join(CONTENT, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime)
    .slice(0, 10)
    .map(f => {
      let p = '/' + f.name.replace(/\\/g, '/');
      if (p.endsWith('/index.html')) p = p.replace('/index.html', '/');
      return `${DOMAIN}${p}`;
    });
  
  const indexResult = await pingIndexNow(recentFiles);
  
  const report = {
    timestamp: new Date().toISOString(),
    health: health.health,
    routes_ok: `${health.ok}/${health.total}`,
    total_pages: pages,
    indexnow: indexResult.ok ? 'accepted' : 'failed',
    recent_urls: recentFiles,
    failures: health.routes.filter(r => !r.ok).map(r => `${r.route}: ${r.status} ${r.error || ''}`)
  };
  
  fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));
  
  // Log to console for heartbeat
  console.log(`\n═══════════════════════════════════════`);
  console.log(`   REVENUE ENGINE — ${report.timestamp}`);
  console.log(`   Health: ${report.health} (${report.routes_ok})`);
  console.log(`   Pages: ${report.total_pages}`);
  console.log(`   IndexNow: ${report.indexnow}`);
  if (report.failures.length) {
    console.log(`   ⚠️ Failures:`);
    report.failures.forEach(f => console.log(`      - ${f}`));
  }
  console.log(`═══════════════════════════════════════\n`);
  
  return report;
}

// ─── Main ───
generateReport().catch(e => {
  console.error('Revenue engine failed:', e.message);
  process.exit(1);
});
