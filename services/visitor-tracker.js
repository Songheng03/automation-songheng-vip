// visitor-tracker.js — Tracks unique visitors, page views, and API usage
// Persists to JSON file. Exposes /api/visitors endpoint.
// This tells me if my SEO/content efforts are actually working.

const fs = require('fs');
const path = require('path');

const DATA_FILE = '/root/automaton/data/visitors.json';

// Ensure data directory exists
const dataDir = path.dirname(DATA_FILE);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

function load() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return { totalVisits: 0, uniqueIPs: {}, pageViews: {}, dailyStats: {}, firstVisit: null, lastVisit: null };
  }
}

function save(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function getDay() {
  return new Date().toISOString().slice(0, 10);
}

function track(req, endpoint) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || 'unknown';
  const ua = req.headers['user-agent'] || 'unknown';
  const today = getDay();
  
  const data = load();
  
  // Track visit
  data.totalVisits = (data.totalVisits || 0) + 1;
  data.lastVisit = new Date().toISOString();
  if (!data.firstVisit) data.firstVisit = data.lastVisit;
  
  // Track unique IPs
  if (!data.uniqueIPs[ip]) {
    data.uniqueIPs[ip] = { firstSeen: data.lastVisit, lastSeen: data.lastVisit, visits: 0, userAgent: ua };
  }
  data.uniqueIPs[ip].lastSeen = data.lastVisit;
  data.uniqueIPs[ip].visits = (data.uniqueIPs[ip].visits || 0) + 1;
  
  // Track page views
  const page = endpoint || 'unknown';
  if (!data.pageViews[page]) data.pageViews[page] = 0;
  data.pageViews[page]++;
  
  // Track daily stats
  if (!data.dailyStats[today]) data.dailyStats[today] = { visits: 0, uniqueIPs: 0, ips: {} };
  data.dailyStats[today].visits++;
  if (!data.dailyStats[today].ips[ip]) {
    data.dailyStats[today].ips[ip] = true;
    data.dailyStats[today].uniqueIPs = Object.keys(data.dailyStats[today].ips).length;
  }
  
  save(data);
  return data;
}

function getStats() {
  const data = load();
  const uniqueCount = Object.keys(data.uniqueIPs || {}).length;
  const today = getDay();
  const todayStats = data.dailyStats?.[today] || { visits: 0, uniqueIPs: 0 };
  
  // Last 7 days trend
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    const s = data.dailyStats?.[d];
    days.push({ date: d, visits: s?.visits || 0, uniqueIPs: s?.uniqueIPs || 0 });
  }
  
  // Top pages
  const topPages = Object.entries(data.pageViews || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([page, count]) => ({ page, count }));
  
  return {
    totalVisits: data.totalVisits || 0,
    uniqueVisitors: uniqueCount,
    todayVisits: todayStats.visits,
    todayUnique: todayStats.uniqueIPs,
    firstVisit: data.firstVisit,
    lastVisit: data.lastVisit,
    last7Days: days,
    topPages,
    apiEndpoints: Object.fromEntries(
      Object.entries(data.pageViews || {}).filter(([k]) => k.startsWith('/v1/') || k.startsWith('/api/'))
    )
  };
}

function mount(app) {
  if (!app) return;

  // Middleware to track all requests
  app.use((req, res, next) => {
    // Only track page views and API calls, not static assets
    const url = req.path || req.url;
    if (!url.match(/\.(css|js|png|jpg|ico|svg|woff2?)$/)) {
      track(req, url);
    }
    next();
  });

  // Stats endpoint
  app.get('/api/visitors', (req, res) => {
    res.json(getStats());
  });

  // Reset endpoint (admin)
  app.post('/api/visitors/reset', (req, res) => {
    const fresh = { totalVisits: 0, uniqueIPs: {}, pageViews: {}, dailyStats: {}, firstVisit: null, lastVisit: null };
    save(fresh);
    res.json({ status: 'reset', timestamp: new Date().toISOString() });
  });

  console.log('[VISITOR] Tracking all requests');
  console.log('[VISITOR] Mounted: GET /api/visitors');
}

module.exports = { mount, track, getStats };
