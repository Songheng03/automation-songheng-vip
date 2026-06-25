#!/usr/bin/env node
/**
 * referral-tracker.mjs — Traffic source & conversion tracking for gateway
 * 
 * Tracks:
 * - Where visitors come from (referrer, UTM params)
 * - Which pages they visit
 * - Which plans they click
 * - Whether they convert (visit /get-started.html → actually buy)
 * - Generates a live dashboard
 * 
 * Integrate into gateway: require this and call track(req, res, type)
 * 
 * Run standalone: node scripts/referral-tracker.mjs --dashboard
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DATA = join(ROOT, 'data');
const CONTENT = join(ROOT, 'content');
const DB_PATH = join(DATA, 'traffic.json');

if (!existsSync(DATA)) mkdirSync(DATA, { recursive: true });

function loadTraffic() {
  try {
    return JSON.parse(readFileSync(DB_PATH, 'utf-8'));
  } catch {
    return { visits: [], referrers: {}, pages: {}, totalVisits: 0, conversions: 0, freeTrials: 0 };
  }
}

function saveTraffic(data) {
  writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

/**
 * Track a page visit
 */
function trackVisit(req, source) {
  const data = loadTraffic();
  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  const ua = req.headers['user-agent'] || 'unknown';
  const referrer = req.headers['referer'] || req.headers['referrer'] || 'direct';
  const url = req.url || '/';
  
  // Don't track API calls, health checks
  if (url.startsWith('/api/') || url.startsWith('/v1/') || url === '/health' || url === '/favicon.ico') return;
  
  // Debounce same IP within 5 minutes
  const recent = data.visits.filter(v => v.ip === ip && (Date.now() - v.timestamp) < 300000);
  if (recent.length > 0) return;
  
  const visit = {
    ip: ip,
    url: url,
    referrer: source?.referrer || referrer,
    utm_source: source?.utm_source || req.headers['x-utm-source'] || 'direct',
    utm_medium: source?.utm_medium || req.headers['x-utm-medium'] || '',
    ua: ua.substring(0, 100),
    timestamp: Date.now(),
    date: new Date().toISOString()
  };
  
  data.visits.push(visit);
  data.totalVisits++;
  
  // Count referrers
  const refKey = visit.referrer.replace(/https?:\/\//, '').split('/')[0] || 'direct';
  data.referrers[refKey] = (data.referrers[refKey] || 0) + 1;
  
  // Count pages
  const pageKey = url.replace(/\?.*$/, '');
  data.pages[pageKey] = (data.pages[pageKey] || 0) + 1;
  
  // Keep only last 10000 visits
  if (data.visits.length > 10000) {
    data.visits = data.visits.slice(-10000);
  }
  
  saveTraffic(data);
}

/**
 * Track a conversion (someone clicked a pricing plan or went to get-started)
 */
function trackConversion(req) {
  const data = loadTraffic();
  data.conversions++;
  saveTraffic(data);
}

/**
 * Track a free trial use
 */
function trackFreeTrial(req) {
  const data = loadTraffic();
  data.freeTrials++;
  saveTraffic(data);
}

/**
 * Generate HTML dashboard
 */
function generateDashboard() {
  const data = loadTraffic();
  
  // Sort referrers
  const topRefs = Object.entries(data.referrers)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);
  
  // Sort pages
  const topPages = Object.entries(data.pages)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);
  
  const now = Date.now();
  const last24h = data.visits.filter(v => (now - v.timestamp) < 86400000).length;
  const last7d = data.visits.filter(v => (now - v.timestamp) < 604800000).length;
  
  const refRows = topRefs.map(([k, v], i) => 
    `<tr><td>${i+1}</td><td>${k}</td><td>${v}</td></tr>`
  ).join('');
  
  const pageRows = topPages.map(([k, v]) => 
    `<tr><td>${k}</td><td>${v}</td></tr>`
  ).join('');
  
  const recentVisits = data.visits.slice(-20).reverse().map(v => {
    const d = new Date(v.timestamp);
    const time = d.toLocaleString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
    return `<tr><td>${time}</td><td>${v.url}</td><td>${v.referrer.substring(0, 40)}</td></tr>`;
  }).join('');
  
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Traffic Dashboard — my-automaton</title>
<style>
:root{--bg:#0d1117;--card:#161b22;--border:#30363d;--text:#e6edf3;--muted:#8b949e;--green:#3fb950;--blue:#58a6ff;--orange:#d29922}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;background:var(--bg);color:var(--text);padding:2rem;max-width:900px;margin:0 auto}
h1{font-size:1.2rem;margin-bottom:.3rem;color:var(--blue)}
.date{font-size:.75rem;color:var(--muted);margin-bottom:1.5rem}
.cards{display:grid;grid-template-columns:repeat(4,1fr);gap:.6rem;margin-bottom:1.5rem}
.card{background:var(--card);border:1px solid var(--border);border-radius:6px;padding:.8rem;text-align:center}
.card .v{font-size:1.5rem;font-weight:700}
.card .l{font-size:.7rem;color:var(--muted);margin-top:3px}
.green{color:var(--green)}.orange{color:var(--orange)}.blue{color:var(--blue)}
h2{font-size:.95rem;margin-bottom:.6rem;margin-top:1.2rem}
table{width:100%;border-collapse:collapse;margin-bottom:1rem;font-size:.8rem}
th{text-align:left;padding:.4rem .5rem;border-bottom:1px solid var(--border);color:var(--muted);font-weight:600}
td{padding:.4rem .5rem;border-bottom:1px solid var(--border)}
.footer{margin-top:2rem;padding-top:1rem;border-top:1px solid var(--border);font-size:.7rem;color:var(--muted);text-align:center}
</style>
</head>
<body>
<h1>📊 Traffic & Conversion Dashboard</h1>
<p class="date">Live · Updated: ${new Date().toISOString()}</p>

<div class="cards">
  <div class="card"><div class="v green">${data.totalVisits}</div><div class="l">Total Visits</div></div>
  <div class="card"><div class="v blue">${last24h}</div><div class="l">Last 24h</div></div>
  <div class="card"><div class="v blue">${last7d}</div><div class="l">Last 7 Days</div></div>
  <div class="card"><div class="v ${data.freeTrials > 0 ? 'green' : ''}">${data.freeTrials}</div><div class="l">API Free Trials</div></div>
  <div class="card"><div class="v ${data.conversions > 0 ? 'green' : ''}">${data.conversions}</div><div class="l">Conversions</div></div>
  <div class="card"><div class="v ${data.conversions > 0 ? 'green' : 'orange'}">${data.totalVisits > 0 ? (data.conversions / data.totalVisits * 100).toFixed(2) : 0}%</div><div class="l">Conversion Rate</div></div>
</div>

<h2>🔝 Top Referrers</h2>
<table><tr><th>#</th><th>Source</th><th>Visits</th></tr>${refRows || '<tr><td colspan="3" style="text-align:center;color:var(--muted)">No data yet</td></tr>'}</table>

<h2>📄 Top Pages</h2>
<table><tr><th>Page</th><th>Visits</th></tr>${pageRows || '<tr><td colspan="2" style="text-align:center;color:var(--muted)">No data yet</td></tr>'}</table>

<h2>🕐 Recent Activity</h2>
<table><tr><th>Time</th><th>Page</th><th>Referrer</th></tr>${recentVisits || '<tr><td colspan="3" style="text-align:center;color:var(--muted)">No visits yet</td></tr>'}</table>

<div class="footer">
<p>Built by my-automaton · <code>0x76eADdEBFfb6A61DD071f97F4508467fc55dd113</code></p>
</div>
</body>
</html>`;
  
  writeFileSync(join(CONTENT, 'traffic.html'), html);
  return html;
}

// CLI mode
const args = process.argv.slice(2);
if (args.includes('--dashboard') || args.includes('--report')) {
  generateDashboard();
  console.log('✅ Traffic dashboard generated at /traffic.html');
  process.exit(0);
}

// Export for gateway integration
export { trackVisit, trackConversion, trackFreeTrial, generateDashboard, loadTraffic };
