/**
 * Stats Handler Module — usage tracking and analytics for my-automaton
 * 
 * Provides:
 *   - Request counting per endpoint
 *   - Revenue tracking (credits used per API key)
 *   - Daily/weekly/monthly aggregation
 *   - GET /api/admin/stats endpoint support
 * 
 * Data stored in /root/automaton/data/usage-stats.json
 */

const fs = require('fs');
const path = require('path');

const STATS_FILE = '/root/automaton/data/usage-stats.json';
const KEYS_FILE = '/root/automaton/data/api-keys.json';
const FREE_USAGE_FILE = '/root/automaton/data/free-usage.json';

// ── In-memory stats cache ───────────────────────────────────
let statsCache = null;
let lastLoad = 0;
const CACHE_TTL = 5000; // 5 seconds

// ── Ensure data directory exists ────────────────────────────
function ensureDataDir() {
  const dir = path.dirname(STATS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// ── Load Stats ──────────────────────────────────────────────
function loadStats() {
  const now = Date.now();
  if (statsCache && (now - lastLoad) < CACHE_TTL) {
    return statsCache;
  }
  
  ensureDataDir();
  
  try {
    if (fs.existsSync(STATS_FILE)) {
      const raw = fs.readFileSync(STATS_FILE, 'utf8');
      statsCache = JSON.parse(raw);
    } else {
      statsCache = {
        totalRequests: 0,
        freeRequests: 0,
        paidRequests: 0,
        totalCreditsUsed: 0,
        totalRevenue: 0,
        revenueByKey: {},
        requestsByEndpoint: {},
        requestsByDay: {},
        requestsByHour: {},
        lastUpdated: new Date().toISOString(),
        created: new Date().toISOString()
      };
    }
  } catch (e) {
    statsCache = {
      totalRequests: 0,
      freeRequests: 0,
      paidRequests: 0,
      totalCreditsUsed: 0,
      totalRevenue: 0,
      revenueByKey: {},
      requestsByEndpoint: {},
      requestsByDay: {},
      requestsByHour: {},
      lastUpdated: new Date().toISOString(),
      created: new Date().toISOString()
    };
  }
  
  lastLoad = now;
  return statsCache;
}

// ── Save Stats ──────────────────────────────────────────────
function saveStats() {
  ensureDataDir();
  statsCache.lastUpdated = new Date().toISOString();
  fs.writeFileSync(STATS_FILE, JSON.stringify(statsCache, null, 2), 'utf8');
}

// ── Record a request ───────────────────────────────────────
function recordRequest(endpoint, type, apiKey, creditsUsed) {
  const stats = loadStats();
  
  stats.totalRequests++;
  
  if (type === 'free') {
    stats.freeRequests++;
  } else {
    stats.paidRequests++;
  }
  
  // Track by endpoint
  if (!stats.requestsByEndpoint[endpoint]) {
    stats.requestsByEndpoint[endpoint] = 0;
  }
  stats.requestsByEndpoint[endpoint]++;
  
  // Track by day
  const today = new Date().toISOString().slice(0, 10);
  if (!stats.requestsByDay[today]) {
    stats.requestsByDay[today] = 0;
  }
  stats.requestsByDay[today]++;
  
  // Track by hour
  const hour = new Date().toISOString().slice(0, 13);
  if (!stats.requestsByHour[hour]) {
    stats.requestsByHour[hour] = 0;
  }
  stats.requestsByHour[hour]++;
  
  // Track revenue
  if (apiKey && creditsUsed > 0) {
    if (!stats.revenueByKey[apiKey]) {
      stats.revenueByKey[apiKey] = { credits: 0, count: 0, lastUsed: null };
    }
    stats.revenueByKey[apiKey].credits += creditsUsed;
    stats.revenueByKey[apiKey].count++;
    stats.revenueByKey[apiKey].lastUsed = new Date().toISOString();
    stats.totalCreditsUsed += creditsUsed;
  }
  
  saveStats();
  return stats;
}

// ── Get overview stats ─────────────────────────────────────
function getOverview() {
  const stats = loadStats();
  const keys = loadApiKeys();
  
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const thisMonth = now.toISOString().slice(0, 7);
  
  const todayRequests = stats.requestsByDay[today] || 0;
  
  let monthRequests = 0;
  for (const [day, count] of Object.entries(stats.requestsByDay)) {
    if (day.startsWith(thisMonth)) {
      monthRequests += count;
    }
  }
  
  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
  const activeKeys = Object.entries(keys).filter(([keyId, keyData]) => {
    if (keyData.lastUsed && keyData.lastUsed > thirtyDaysAgo) return true;
    if (keyData.created && keyData.created > thirtyDaysAgo) return true;
    return false;
  }).length;
  
  const revenueUSD = (stats.totalCreditsUsed * 0.0097).toFixed(2);
  
  return {
    totalRequests: stats.totalRequests,
    freeRequests: stats.freeRequests,
    paidRequests: stats.paidRequests,
    todayRequests,
    monthRequests,
    totalCreditsUsed: stats.totalCreditsUsed,
    totalRevenueUSD: parseFloat(revenueUSD),
    totalApiKeys: Object.keys(keys).length,
    activeKeys,
    endpoints: stats.requestsByEndpoint,
    dailyStats: stats.requestsByDay,
    hourlyStats: stats.requestsByHour,
    lastUpdated: stats.lastUpdated,
    uptime: getUptime()
  };
}

// ── Load API Keys ───────────────────────────────────────────
function loadApiKeys() {
  try {
    if (fs.existsSync(KEYS_FILE)) {
      return JSON.parse(fs.readFileSync(KEYS_FILE, 'utf8'));
    }
  } catch (e) {
    // File may be malformed
  }
  return {};
}

// ── Get uptime string ───────────────────────────────────────
function getUptime() {
  try {
    const uptime = require('os').uptime();
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  } catch (e) {
    return 'unknown';
  }
}

// ── Track free usage per IP ─────────────────────────────────
function checkFreeUsage(ip) {
  try {
    const data = fs.existsSync(FREE_USAGE_FILE) 
      ? JSON.parse(fs.readFileSync(FREE_USAGE_FILE, 'utf8')) 
      : {};
    
    const today = new Date().toISOString().slice(0, 10);
    const key = `${ip}_${today}`;
    
    if (!data[key]) {
      data[key] = { count: 0, date: today };
    }
    
    return {
      count: data[key].count,
      remaining: Math.max(0, 3 - data[key].count),
      allowed: data[key].count < 3
    };
  } catch (e) {
    return { count: 0, remaining: 3, allowed: true };
  }
}

function incrementFreeUsage(ip) {
  try {
    const data = fs.existsSync(FREE_USAGE_FILE) 
      ? JSON.parse(fs.readFileSync(FREE_USAGE_FILE, 'utf8')) 
      : {};
    
    const today = new Date().toISOString().slice(0, 10);
    const key = `${ip}_${today}`;
    
    if (!data[key]) {
      data[key] = { count: 0, date: today };
    }
    
    data[key].count++;
    
    const dir = path.dirname(FREE_USAGE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(FREE_USAGE_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    // Fail silently - free usage tracking is non-critical
  }
}

// ── Clean old stats (keep last 90 days) ─────────────────────
function cleanOldStats() {
  const stats = loadStats();
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  
  for (const day of Object.keys(stats.requestsByDay)) {
    if (day < ninetyDaysAgo) {
      delete stats.requestsByDay[day];
    }
  }
  
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 13);
  for (const hour of Object.keys(stats.requestsByHour)) {
    if (hour < sevenDaysAgo) {
      delete stats.requestsByHour[hour];
    }
  }
  
  saveStats();
}

// ── Reset stats (admin only) ────────────────────────────────
function resetStats() {
  statsCache = {
    totalRequests: 0,
    freeRequests: 0,
    paidRequests: 0,
    totalCreditsUsed: 0,
    totalRevenue: 0,
    revenueByKey: {},
    requestsByEndpoint: {},
    requestsByDay: {},
    requestsByHour: {},
    lastUpdated: new Date().toISOString(),
    created: new Date().toISOString()
  };
  saveStats();
  return { status: 'ok', message: 'Stats reset successfully' };
}

// ── Clean old free-usage records ────────────────────────────
function cleanFreeUsage() {
  try {
    if (!fs.existsSync(FREE_USAGE_FILE)) return { status: 'ok', removed: 0 };
    
    const data = JSON.parse(fs.readFileSync(FREE_USAGE_FILE, 'utf8'));
    const yesterday = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    let removed = 0;
    
    for (const key of Object.keys(data)) {
      if (data[key].date < yesterday) {
        delete data[key];
        removed++;
      }
    }
    
    fs.writeFileSync(FREE_USAGE_FILE, JSON.stringify(data, null, 2), 'utf8');
    return { status: 'ok', removed };
  } catch (e) {
    return { status: 'error', message: e.message };
  }
}

// ── serveJSON — Gateway-compatible JSON stats endpoint ──────
function serveJSON(req, res) {
  const overview = getOverview();
  res.writeHead(200, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(JSON.stringify(overview, null, 2));
}

// ── serveDashboard — Gateway-compatible HTML dashboard ──────
function serveDashboard(req, res) {
  const overview = getOverview();
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>my-automaton — Stats Dashboard</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0d1117;color:#c9d1d9;padding:2rem;line-height:1.6}
h1{color:#58a6ff;margin-bottom:1rem}
.dashboard{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1rem;margin-bottom:2rem}
.card{background:#161b22;border:1px solid #30363d;border-radius:10px;padding:1.2rem;text-align:center}
.card .num{font-size:2rem;font-weight:700;color:#58a6ff}
.card .label{color:#8b949e;font-size:.85rem;margin-top:.3rem}
.card .num.gold{color:#d29922}
.card .num.green{color:#3fb950}
.section{margin:2rem 0}
.section h2{color:#58a6ff;margin-bottom:1rem;font-size:1.3rem}
table{width:100%;border-collapse:collapse}
th,td{padding:.6rem .8rem;text-align:left;border-bottom:1px solid #21262d;font-size:.9rem}
th{color:#8b949e;font-weight:600;font-size:.8rem;text-transform:uppercase}
td{color:#c9d1d9}
.status{display:inline-block;padding:2px 8px;border-radius:4px;font-size:.8rem;font-weight:600}
.status.ok{background:#23863620;color:#3fb950;border:1px solid #238636}
.top-endpoints{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:.5rem}
.endpoint-badge{background:#21262d;border:1px solid #30363d;border-radius:6px;padding:.5rem;text-align:center}
.endpoint-badge .name{color:#58a6ff;font-size:.85rem}
.endpoint-badge .count{color:#8b949e;font-size:.75rem}
</style>
</head>
<body>
<h1>📊 my-automaton Dashboard</h1>
<p style="color:#8b949e;margin-bottom:2rem">Last updated: ${overview.lastUpdated || 'N/A'}</p>

<div class="dashboard">
  <div class="card">
    <div class="num" id="totalReqs">${overview.totalRequests}</div>
    <div class="label">Total Requests</div>
  </div>
  <div class="card">
    <div class="num gold">${overview.totalRevenueUSD || 0}</div>
    <div class="label">Revenue (USD)</div>
  </div>
  <div class="card">
    <div class="num green">${overview.todayRequests || 0}</div>
    <div class="label">Today's Requests</div>
  </div>
  <div class="card">
    <div class="num">${overview.totalApiKeys || 0}</div>
    <div class="label">API Keys Issued</div>
  </div>
  <div class="card">
    <div class="num">${overview.activeKeys || 0}</div>
    <div class="label">Active Keys (30d)</div>
  </div>
  <div class="card">
    <div class="num">${overview.totalCreditsUsed || 0}</div>
    <div class="label">Credits Used</div>
  </div>
</div>

<div class="section">
  <h2>🔥 Top Endpoints</h2>
  <div class="top-endpoints">
    ${Object.entries(overview.endpoints || {})
      .sort((a,b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => 
        `<div class="endpoint-badge"><div class="name">${name}</div><div class="count">${count} req</div></div>`
      ).join('') || '<p style="color:#8b949e">No requests yet</p>'}
  </div>
</div>

<div class="section">
  <h2>📅 Daily Activity (Last 14 Days)</h2>
  <table>
    <tr><th>Date</th><th>Requests</th></tr>
    ${Object.entries(overview.dailyStats || {})
      .sort((a,b) => b[0].localeCompare(a[0]))
      .slice(0, 14)
      .map(([day, count]) => 
        `<tr><td>${day}</td><td>${count}</td></tr>`
      ).join('') || '<tr><td colspan="2" style="color:#8b949e">No data yet</td></tr>'}
  </table>
</div>

<p style="color:#484f58;margin-top:3rem;font-size:.85rem">my-automaton · Uptime: ${overview.uptime || 'unknown'}</p>
</body>
</html>`;

  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(html);
}

// ── Request handler for /api/stats/* and /api/admin/stats ───
function handleStatsRequest(req, res, parsedUrl) {
  const pathname = parsedUrl.pathname;
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Key');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  
  if (pathname === '/api/stats/overview' || pathname === '/api/stats/') {
    serveJSON(req, res);
    return;
  }
  
  if (pathname === '/api/stats/dashboard') {
    serveDashboard(req, res);
    return;
  }
  
  if (pathname === '/api/stats/realtime') {
    const stats = loadStats();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      totalRequests: stats.totalRequests,
      totalCreditsUsed: stats.totalCreditsUsed,
      totalApiKeys: Object.keys(loadApiKeys()).length,
      lastUpdated: stats.lastUpdated
    }));
    return;
  }
  
  if (pathname === '/api/admin/stats') {
    const adminKey = req.headers['x-admin-key'];
    if (!adminKey || adminKey !== (process.env.ADMIN_API_KEY || 'admin-my-automaton-2026')) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }
    const overview = getOverview();
    overview.apiKeys = loadApiKeys();
    overview.rawStats = loadStats();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(overview, null, 2));
    return;
  }
  
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found', path: pathname }));
}

// ── Scheduled maintenance ──────────────────────────────────
function runMaintenance() {
  cleanOldStats();
  cleanFreeUsage();
}

// ── Module Exports ──────────────────────────────────────────
module.exports = {
  recordRequest,
  getOverview,
  checkFreeUsage,
  incrementFreeUsage,
  loadApiKeys,
  handleStatsRequest,
  serveJSON,
  serveDashboard,
  runMaintenance,
  resetStats,
  loadStats
};
