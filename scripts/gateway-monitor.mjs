#!/usr/bin/env node
/**
 * gateway-monitor.mjs — Live gateway monitoring & dashboard generator
 * 
 * Probes all gateway endpoints, checks health, tracks api-keys.json changes,
 * and generates a live status dashboard at /content/status.html
 * 
 * Run: node scripts/gateway-monitor.mjs
 *      node scripts/gateway-monitor.mjs --serve (continuous monitoring)
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, watchFile } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DATA = join(ROOT, 'data');
const CONTENT = join(ROOT, 'content');
const API_KEYS_PATH = join(ROOT, 'api-keys.json');
const LOG_PATH = join(DATA, 'gateway.log');
const STATUS_PATH = join(CONTENT, 'status.html');
const GATEWAY = 'http://localhost:8080';

if (!existsSync(DATA)) mkdirSync(DATA, { recursive: true });

// Track API key changes
let lastKeyState = {};

function loadKeys() {
  try {
    return JSON.parse(readFileSync(API_KEYS_PATH, 'utf-8'));
  } catch {
    return {};
  }
}

function getKeyChanges(current) {
  const prev = lastKeyState;
  const keys = Object.keys(current);
  const prevKeys = Object.keys(prev);
  
  const newKeys = keys.filter(k => !prevKeys.includes(k));
  const newCredits = keys.filter(k => {
    if (!prev[k]) return false;
    return current[k].credits < prev[k].credits;
  });
  
  return { newKeys, newCredits, totalKeys: keys.length, totalCredits: keys.reduce((s, k) => s + (current[k]?.credits || 0), 0) };
}

async function checkEndpoint(url, method = 'GET') {
  const start = Date.now();
  try {
    const resp = await fetch(url, { method, signal: AbortSignal.timeout(5000) });
    return { status: resp.status, ms: Date.now() - start, ok: resp.ok };
  } catch (e) {
    return { status: 0, ms: Date.now() - start, ok: false, error: e.message };
  }
}

async function runCheck() {
  const currentKeys = loadKeys();
  const changes = getKeyChanges(currentKeys);
  lastKeyState = JSON.parse(JSON.stringify(currentKeys));
  
  // Check endpoints
  const endpoints = [
    { name: 'Gateway', url: GATEWAY + '/health' },
    { name: 'Homepage', url: GATEWAY + '/' },
    { name: 'API Docs', url: GATEWAY + '/api-docs.html' },
    { name: 'Code Grader', url: GATEWAY + '/code-grader.html' },
    { name: 'Get Started', url: GATEWAY + '/get-started.html' },
    { name: 'Upgrade', url: GATEWAY + '/upgrade.html' },
    { name: 'Sitemap', url: GATEWAY + '/sitemap.xml' },
    { name: 'Stats', url: GATEWAY + '/api/stats/overview' },
    { name: 'Free API', url: GATEWAY + '/free/analyze', method: 'POST' },
  ];
  
  const results = await Promise.all(endpoints.map(ep => checkEndpoint(ep.url, ep.method)));
  
  // Read gateway log for recent entries
  let recentLog = '';
  try {
    if (existsSync(LOG_PATH)) {
      const log = readFileSync(LOG_PATH, 'utf-8');
      const lines = log.trim().split('\n');
      recentLog = lines.slice(-20).join('\n');
    }
  } catch {}
  
  return { endpoints, results, changes, recentLog, timestamp: new Date().toISOString() };
}

function generateStatusHtml(data) {
  const { endpoints, results, changes, recentLog, timestamp } = data;
  const now = new Date(timestamp);
  const timeStr = now.toLocaleString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  
  const allOk = results.every(r => r.ok);
  const avgMs = results.length > 0 ? Math.round(results.reduce((s, r) => s + r.ms, 0) / results.length) : 0;
  
  const rows = endpoints.map((ep, i) => {
    const r = results[i];
    const statusIcon = r.ok ? '✅' : r.status === 0 ? '❌' : '⚠️';
    const statusText = r.ok ? `${r.status} (${r.ms}ms)` : r.error ? `${r.status} - ${r.error.substring(0, 40)}` : `${r.status}`;
    const statusClass = r.ok ? 'ok' : r.status === 0 ? 'down' : 'warn';
    return `<tr><td>${statusIcon}</td><td>${ep.name}</td><td class="${statusClass}">${statusText}</td></tr>`;
  }).join('');
  
  const changesHtml = changes.newKeys.length > 0 
    ? `<div style="padding:.5rem;background:rgba(63,185,80,.1);border:1px solid #3fb950;border-radius:6px;margin:.5rem 0;font-size:.85rem">
         🎉 ${changes.newKeys.length} NEW API KEY(S) ISSUED!
       </div>`
    : '';
  
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Gateway Status — my-automaton</title>
<meta http-equiv="refresh" content="30">
<style>
:root{--bg:#0d1117;--card:#161b22;--border:#30363d;--text:#e6edf3;--muted:#8b949e;--green:#3fb950;--red:#f85149;--orange:#d29922}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;background:var(--bg);color:var(--text);padding:1.5rem;max-width:800px;margin:0 auto}
h1{font-size:1.2rem;margin-bottom:.3rem}
.sub{color:var(--muted);font-size:.8rem;margin-bottom:1.2rem}
.cards{display:grid;grid-template-columns:repeat(4,1fr);gap:.5rem;margin-bottom:1rem}
.card{background:var(--card);border:1px solid var(--border);border-radius:6px;padding:.6rem;text-align:center}
.card .v{font-size:1.2rem;font-weight:700}
.card .l{font-size:.65rem;color:var(--muted);margin-top:2px}
h2{font-size:.9rem;margin-bottom:.4rem;margin-top:1rem}
table{width:100%;border-collapse:collapse;font-size:.78rem;margin-bottom:1rem}
th{text-align:left;padding:.3rem .5rem;border-bottom:1px solid var(--border);color:var(--muted);font-weight:600}
td{padding:.3rem .5rem;border-bottom:1px solid var(--border)}
.ok{color:var(--green)}.warn{color:var(--orange)}.down{color:var(--red)}
.log-box{background:#010409;border:1px solid var(--border);border-radius:6px;padding:.6rem;font-family:monospace;font-size:.7rem;max-height:200px;overflow-y:auto;white-space:pre-wrap;color:var(--muted);line-height:1.4}
.footer{text-align:center;padding:1rem 0;font-size:.7rem;color:var(--muted);border-top:1px solid var(--border);margin-top:1rem}
.auto-refresh{font-size:.7rem;color:var(--muted);text-align:right;margin-bottom:.4rem}
</style>
</head>
<body>
<h1>🖥️ Gateway Status Monitor</h1>
<p class="sub">Last updated: ${timeStr} · Auto-refreshes every 30s</p>

<div class="cards">
  <div class="card"><div class="v" style="color:${allOk ? 'var(--green)' : 'var(--red)'}">${allOk ? '✅ ALL OK' : '⚠️ ISSUES'}</div><div class="l">Overall Status</div></div>
  <div class="card"><div class="v">${endpoints.length}</div><div class="l">Endpoints</div></div>
  <div class="card"><div class="v" style="color:var(--green)">${results.filter(r => r.ok).length}</div><div class="l">Healthy</div></div>
  <div class="card"><div class="v">${avgMs}ms</div><div class="l">Avg Response</div></div>
  <div class="card"><div class="v">${changes.totalKeys}</div><div class="l">API Keys Total</div></div>
  <div class="card"><div class="v" style="color:${changes.totalCredits > 0 ? 'var(--green)' : 'var(--muted)'}">${changes.totalCredits}</div><div class="l">Total Credits</div></div>
</div>

${changesHtml}

<h2>📡 Endpoint Health</h2>
<table>${rows}</table>

<h2>📝 Recent Activity</h2>
<div class="log-box">${recentLog || '(no activity yet)'}</div>

<div class="footer">
<p><a href="/traffic.html" style="color:var(--blue)">Traffic Dashboard</a> · <a href="/dashboard.html" style="color:var(--blue)">Revenue Dashboard</a> · <a href="/" style="color:var(--blue)">Home</a></p>
<p>my-automaton · <code>0x76eADdEBFfb6A61DD071f97F4508467fc55dd113</code></p>
</div>
</body>
</html>`;
  
  writeFileSync(STATUS_PATH, html);
  return html;
}

async function main() {
  const args = process.argv.slice(2);
  
  console.log('🔍 Gateway Monitor');
  console.log('──────────────────');
  
  const data = await runCheck();
  const results = data.results;
  
  results.forEach((r, i) => {
    const name = data.endpoints[i].name.padEnd(15);
    const status = r.ok ? `✅ ${r.status} (${r.ms}ms)` : r.error ? `❌ ${r.error.substring(0, 50)}` : `⚠️ ${r.status}`;
    console.log(`  ${name} ${status}`);
  });
  
  const allOk = results.every(r => r.ok);
  console.log(`\n${allOk ? '✅ ALL SYSTEMS OPERATIONAL' : '⚠️ SOME ENDPOINTS DOWN'}`);
  console.log(`API Keys: ${data.changes.totalKeys} total, ${data.changes.totalCredits} credits`);
  
  if (data.changes.newKeys.length > 0) {
    console.log(`🎉 ${data.changes.newKeys.length} NEW KEYS!`);
  }
  
  generateStatusHtml(data);
  console.log(`\n📊 Status page: /status.html`);
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
