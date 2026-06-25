#!/usr/bin/env node
// Generate static revenue dashboard HTML with live data baked in
// Runs periodically via heartbeat to keep dashboard current
// No proxy routes needed — data is embedded at generation time

const http = require('http');
const fs = require('fs');
const path = require('path');

const DATA_DIR = '/root/automaton/data/';
const CONTENT_DIR = '/root/automaton/content/';
const VISITORS_FILE = path.join(DATA_DIR, 'visitors.json');
const REFERRALS_FILE = path.join(DATA_DIR, 'referrals.json');
const PROMO_LOG = path.join(DATA_DIR, 'promo-log.json');

function readJSON(p, def) { try { return JSON.parse(fs.readFileSync(p, 'utf-8')); } catch(e) { return def; } }

function fetchJSON(host, port, path) {
  return new Promise((resolve) => {
    const req = http.get({ hostname: host, port, path, timeout: 3000 }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { resolve(null); } });
    });
    req.on('error', () => resolve(null));
    req.setTimeout(3000, () => { req.destroy(); resolve(null); });
  });
}

function today() { return new Date().toISOString().slice(0,10); }

async function generate() {
  // Gather data from services
  const [overview, survival, pricing, events, promoter] = await Promise.all([
    fetchJSON('127.0.0.1', 3096, '/api/revenue/overview'),
    fetchJSON('127.0.0.1', 3096, '/api/revenue/survival'),
    fetchJSON('127.0.0.1', 3096, '/api/revenue/pricing'),
    fetchJSON('127.0.0.1', 3096, '/api/revenue/events'),
    fetchJSON('127.0.0.1', 3095, '/api/auto-promoter/status'),
  ]);

  const visitors = readJSON(VISITORS_FILE, []);
  const referrals = readJSON(REFERRALS_FILE, []);

  const todayVisitors = visitors.filter(v => v.ts.startsWith(today()));
  const uniqueToday = new Set(todayVisitors.map(v => v.ip)).size;
  const uniqueAll = new Set(visitors.map(v => v.ip)).size;

  const pages = {};
  visitors.forEach(v => { pages[v.url] = (pages[v.url] || 0) + 1; });
  const topPages = Object.entries(pages).map(([k,v]) => ({url:k,count:v}))
    .sort((a,b) => b.count - a.count).slice(0,10);

  // Build data blob for HTML
  const data = {
    totalEarned: overview?.totalEarnedCents || 0,
    totalCalls: overview?.totalServiceCalls || 0,
    dailyEarnings: overview?.dailyEarningsCents || 0,
    daysRemaining: survival?.daysRemaining || '?',
    dailyCost: survival?.dailyCostCents || 170,
    breakEvenPerDay: survival?.breakEvenCallsPerDay || 57,
    revenueDeficit: survival?.revenueDeficit || 170,
    totalVisits: visitors.length,
    todayVisits: todayVisitors.length,
    uniqueToday,
    uniqueAllTime: uniqueAll,
    topPages,
    referrals: referrals.length,
    pricing: pricing?.pricing || {},
    events: (events?.events || []).slice(0,20),
    promoterPings: promoter?.totalPings || 0,
    promoterLastPing: promoter?.lastPing || 'never',
  };

  const html = buildHtml(data);
  fs.writeFileSync(path.join(CONTENT_DIR, 'dashboard.html'), html);
  console.log(`Dashboard generated: ${data.totalCalls} calls, ${data.totalVisits} visits`);
  return data;
}

function buildHtml(d) {
  const priceRows = Object.entries(d.pricing).map(([k,v]) => `
    <tr><td><code>${k}</code></td><td><span class="badge green">${v}¢</span></td><td style="color:#888">${getDesc(k)}</td></tr>
  `).join('');

  const eventRows = d.events.length > 0 ? d.events.map(ev => `
    <tr>
      <td style="color:#888;font-size:.85rem">${new Date(ev.ts).toLocaleString()}</td>
      <td><code>${ev.service || '—'}</code></td>
      <td><span class="badge green">${ev.cents}¢</span></td>
      <td style="color:#888">${(ev.caller || 'anonymous').slice(0,20)}</td>
    </tr>
  `).join('') : '<tr><td colspan="4" style="text-align:center;color:#555;padding:30px">No revenue events yet. Be the first!</td></tr>';

  const visitRows = d.topPages.map(p => `
    <tr><td style="color:#aaa">${p.url}</td><td>${p.count}</td></tr>
  `).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Revenue Dashboard — my-automaton AI Agent Services</title>
<meta name="description" content="Live dashboard for my-automaton AI services. Revenue, usage, survival metrics.">
<meta property="og:title" content="Revenue Dashboard — my-automaton">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0a0a1a;color:#e0e0e0;line-height:1.6;padding:20px}
.container{max-width:1100px;margin:0 auto}
h1{font-size:2rem;margin-bottom:5px;background:linear-gradient(135deg,#00d4ff,#7b2ff7);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.sub{color:#888;margin-bottom:25px;font-size:.9rem}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin-bottom:25px}
.card{background:#12122a;border:1px solid #2a2a4a;border-radius:10px;padding:16px}
.card .lbl{font-size:.8rem;color:#888;margin-bottom:4px;text-transform:uppercase;letter-spacing:.5px}
.card .val{font-size:1.6rem;font-weight:700}
.card .val.green{color:#00e676}
.card .val.red{color:#ff5252}
.card .val.blue{color:#00d4ff}
.card .val.yellow{color:#ffd740}
.card .note{font-size:.75rem;color:#555;margin-top:3px}
.section{margin-bottom:25px}
.section h2{font-size:1.2rem;margin-bottom:12px;color:#ccc;border-bottom:1px solid #2a2a4a;padding-bottom:6px}
table{width:100%;border-collapse:collapse;font-size:.9rem}
th{text-align:left;padding:8px 10px;border-bottom:2px solid #2a2a4a;color:#888;font-size:.75rem;text-transform:uppercase}
td{padding:8px 10px;border-bottom:1px solid #1a1a3a}
.badge{display:inline-block;padding:2px 7px;border-radius:4px;font-size:.7rem;font-weight:600}
.badge.green{background:#00e67622;color:#00e676;border:1px solid #00e67644}
.updated{text-align:center;color:#555;font-size:.75rem;margin-top:25px}
code{color:#00d4ff;font-size:.85rem}
.two-col{display:grid;grid-template-columns:1fr 1fr;gap:14px}
@media(max-width:600px){.two-col{grid-template-columns:1fr}}
</style>
</head>
<body>
<div class="container">
  <h1>📊 Revenue Dashboard</h1>
  <p class="sub">AI Agent · 0x76eADdEBFfb6A61DD071f97F4508467fc55dd113 · Base USDC</p>

  <div class="grid">
    <div class="card"><div class="lbl">Total Earned</div><div class="val ${d.totalEarned > 0 ? 'green' : 'yellow'}">${(d.totalEarned/100).toFixed(2)}¢</div><div class="note">$${(d.totalEarned/100).toFixed(4)} USDC</div></div>
    <div class="card"><div class="lbl">Service Calls</div><div class="val blue">${d.totalCalls}</div><div class="note">${d.dailyEarnings > 0 ? (d.dailyEarnings/100).toFixed(2)+'¢ today' : 'No calls yet'}</div></div>
    <div class="card"><div class="lbl">Days Remaining</div><div class="val ${d.daysRemaining > 30 ? 'green' : d.daysRemaining > 14 ? 'yellow' : 'red'}">${d.daysRemaining}</div><div class="note">${d.dailyCost}¢/day burn rate</div></div>
    <div class="card"><div class="lbl">Revenue Deficit</div><div class="val red">${(d.revenueDeficit/100).toFixed(2)}¢</div><div class="note">Need ${d.breakEvenPerDay} calls/day to break even</div></div>
    <div class="card"><div class="lbl">Total Visits</div><div class="val blue">${d.totalVisits}</div><div class="note">${d.todayVisits} today (${d.uniqueToday} unique)</div></div>
    <div class="card"><div class="lbl">Referrals</div><div class="val yellow">${d.referrals}</div><div class="note">${d.promoterPings} search engine pings</div></div>
  </div>

  <div class="two-col">
    <div class="section">
      <h2>💰 Pricing (x402 · USDC on Base)</h2>
      <table><thead><tr><th>Service</th><th>Cost</th><th>Description</th></tr></thead><tbody>${priceRows}</tbody></table>
    </div>
    <div class="section">
      <h2>📈 Top Pages</h2>
      <table><thead><tr><th>Page</th><th>Visits</th></tr></thead><tbody>${visitRows}</tbody></table>
    </div>
  </div>

  <div class="section">
    <h2>📋 Recent Revenue Events</h2>
    <table><thead><tr><th>Time</th><th>Service</th><th>Amount</th><th>Caller</th></tr></thead><tbody>${eventRows}</tbody></table>
  </div>

  <div class="section">
    <h2>🔗 Wallet</h2>
    <div class="card">
      <p><strong>EVM (Base):</strong> <code>0x76eADdEBFfb6A61DD071f97F4508467fc55dd113</code></p>
      <p style="margin-top:6px;color:#888;font-size:.85rem">Send USDC to this address on Base chain to pay for AI services.</p>
    </div>
  </div>

  <p class="updated">🔄 Generated: ${new Date().toISOString()} · Auto-regenerates every 15 minutes</p>
</div>
</body>
</html>`;
}

function getDesc(key) {
  const m = { 'v1/analyze':'Deep text analysis','v1/summarize':'AI summarization','v1/review':'Full code review','v1/security':'Security scan','v1/explain':'Code explanation','v1/refactor':'Refactoring','v1/complexity':'Complexity analysis','v1/batch':'Batch 10 texts','v1/render':'Markdown render' };
  return m[key] || 'AI service';
}

// Run once immediately
generate().catch(e => console.error('Generator error:', e.message));

// Regenerate every 15 minutes
setInterval(() => {
  generate().catch(e => console.error('Regen error:', e.message));
}, 15 * 60 * 1000);
