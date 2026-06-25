// stats-service.js — Visitor analytics & revenue tracking
// Tracks every request to the gateway: IPs, endpoints, timestamps, payments
const fs = require('fs');
const path = require('path');

const STATS_FILE = '/root/automaton/data/stats.json';
const VISITOR_FILE = '/root/automaton/data/visitors.json';

function ensureDir(f) {
  const d = path.dirname(f);
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

function readStats() {
  ensureDir(STATS_FILE);
  try {
    return JSON.parse(fs.readFileSync(STATS_FILE, 'utf8'));
  } catch {
    return { totalRequests: 0, paidRequests: 0, freeRequests: 0, revenue: 0, endpoints: {}, daily: {}, firstRequest: null, lastRequest: null };
  }
}

function writeStats(s) {
  fs.writeFileSync(STATS_FILE, JSON.stringify(s, null, 2));
}

function readVisitors() {
  ensureDir(VISITOR_FILE);
  try {
    return JSON.parse(fs.readFileSync(VISITOR_FILE, 'utf8'));
  } catch {
    return { uniqueIPs: {}, totalVisits: 0 };
  }
}

function writeVisitors(v) {
  fs.writeFileSync(VISITOR_FILE, JSON.stringify(v, null, 2));
}

function mount(app) {
  if (!app) return;

  // ===== TRACKING MIDDLEWARE =====
  app.use((req, res, next) => {
    if (req.path === '/health' || req.path === '/api/stats' || req.path === '/api/stats/overview') {
      return next();
    }
    
    const stats = readStats();
    const visitors = readVisitors();
    
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    const today = new Date().toISOString().slice(0, 10);
    const endpoint = req.path;

    // Track request
    stats.totalRequests++;
    stats.lastRequest = new Date().toISOString();
    if (!stats.firstRequest) stats.firstRequest = stats.lastRequest;

    // Per-endpoint count
    if (!stats.endpoints[endpoint]) stats.endpoints[endpoint] = 0;
    stats.endpoints[endpoint]++;

    // Daily stats
    if (!stats.daily[today]) stats.daily[today] = { total: 0, paid: 0, free: 0, revenue: 0 };
    stats.daily[today].total++;

    // Visitor tracking
    if (!visitors.uniqueIPs[ip]) {
      visitors.uniqueIPs[ip] = { firstVisit: stats.lastRequest, visits: 0 };
    }
    visitors.uniqueIPs[ip].visits++;
    visitors.totalVisits++;

    writeStats(stats);
    writeVisitors(visitors);
    
    next();
  });

  // ===== OVERVIEW STATS =====
  app.get('/api/stats/overview', (req, res) => {
    const stats = readStats();
    const visitors = readVisitors();
    const today = new Date().toISOString().slice(0, 10);
    
    res.json({
      totalRequests: stats.totalRequests,
      uniqueVisitors: Object.keys(visitors.uniqueIPs).length,
      totalVisits: visitors.totalVisits,
      revenue: stats.revenue,
      today: stats.daily[today] || { total: 0, paid: 0, free: 0, revenue: 0 },
      topEndpoints: Object.entries(stats.endpoints)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([endpoint, count]) => ({ endpoint, count })),
      firstRequest: stats.firstRequest,
      lastRequest: stats.lastRequest
    });
  });

  // ===== RAW STATS (auth-free, for monitoring) =====
  app.get('/api/stats', (req, res) => {
    const stats = readStats();
    const visitors = readVisitors();
    res.json({
      totalRequests: stats.totalRequests,
      uniqueIps: Object.keys(visitors.uniqueIPs).length,
      revenue: stats.revenue,
      daily: stats.daily,
      topEndpoints: Object.entries(stats.endpoints).sort((a, b) => b[1] - a[1]).slice(0, 5)
    });
  });

  // ===== UPDATE REVENUE (called by x402 service) =====
  app.post('/api/stats/revenue', (req, res) => {
    const { amount } = req.body || {};
    if (typeof amount !== 'number') return res.status(400).json({ error: 'amount required' });
    
    const stats = readStats();
    stats.revenue = (stats.revenue || 0) + amount;
    stats.paidRequests = (stats.paidRequests || 0) + 1;
    
    const today = new Date().toISOString().slice(0, 10);
    if (!stats.daily[today]) stats.daily[today] = { total: 0, paid: 0, free: 0, revenue: 0 };
    stats.daily[today].paid++;
    stats.daily[today].revenue += amount;
    
    writeStats(stats);
    res.json({ revenue: stats.revenue });
  });

  console.log('[STATS] Mounted: /api/stats, /api/stats/overview, /api/stats/revenue');
  console.log('[STATS] Tracking middleware active for all requests');
}

module.exports = { mount };
