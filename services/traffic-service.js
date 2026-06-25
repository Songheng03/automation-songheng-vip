/**
 * traffic-service.js — Pageview tracking + analytics API
 * Designed to be required() by the Express gateway (gateway.cjs)
 * 
 * Usage in gateway.cjs:
 *   const traffic = require('./services/traffic-service');
 *   app.use('/api/traffic', traffic.router);
 */

const fs = require('fs');
const path = require('path');
const express = require('express');
const router = express.Router();

const DATA_FILE = path.join(__dirname, '..', 'data', 'traffic.json');
const CONTENT_DIR = path.join(__dirname, '..', 'content');

// Ensure data directory and file
function initData() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({
      totalVisits: 0,
      visits: [],
      daily: {}
    }));
  }
}

function loadData() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch(e) { return { totalVisits: 0, visits: [], daily: {} }; }
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// POST /api/traffic/ping — Record a pageview
router.post('/ping', (req, res) => {
  const { page, ref } = req.body || {};
  const today = new Date().toISOString().split('T')[0];
  const data = loadData();
  
  data.totalVisits = (data.totalVisits || 0) + 1;
  
  if (!data.daily[today]) data.daily[today] = { visits: 0 };
  data.daily[today].visits++;
  
  data.visits = data.visits || [];
  data.visits.push({
    ts: Date.now(),
    page: page || '/',
    ref: (ref || '').slice(0, 200),
    today
  });
  
  // Keep last 10k entries
  if (data.visits.length > 10000) data.visits = data.visits.slice(-10000);
  
  saveData(data);
  res.json({ pinged: true, total: data.totalVisits });
});

// GET /api/traffic/stats — Get analytics
router.get('/stats', (req, res) => {
  const data = loadData();
  const today = new Date().toISOString().split('T')[0];
  const visits = data.visits || [];
  const now = Date.now();
  
  // Top pages
  const pageCount = {};
  visits.forEach(v => { pageCount[v.page] = (pageCount[v.page] || 0) + 1; });
  const topPages = Object.entries(pageCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([p, c]) => ({ page: p, count: c }));
  
  // Top referrers  
  const refCount = {};
  visits.forEach(v => {
    if (v.ref) {
      const r = v.ref.split('/')[2] || v.ref;
      refCount[r] = (refCount[r] || 0) + 1;
    }
  });
  const topRefs = Object.entries(refCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([r, c]) => ({ ref: r, count: c }));
  
  // Daily breakdown (last 30 days)
  const daily = Object.entries(data.daily || {})
    .slice(-30)
    .map(([d, v]) => ({ date: d, visits: v.visits }));
  
  // Last 24h
  const last24h = visits.filter(v => v.ts > now - 86400000).length;
  
  res.json({
    total: data.totalVisits || 0,
    todayVisits: (data.daily[today] && data.daily[today].visits) || 0,
    last24h,
    topPages,
    topReferrers: topRefs,
    daily,
    uniquePages: topPages.length
  });
});

// GET /api/traffic/list — Raw visit log (last 100)
router.get('/list', (req, res) => {
  const data = loadData();
  res.json((data.visits || []).slice(-100).reverse());
});

// Find tools in content directory
router.get('/tools', (req, res) => {
  const toolsDir = path.join(CONTENT_DIR, 'tools');
  try {
    const tools = fs.readdirSync(toolsDir)
      .filter(f => f.endsWith('.html'))
      .map(f => ({
        name: f.replace('.html', '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        url: '/tools/' + f,
        file: f
      }));
    res.json({ tools, count: tools.length });
  } catch(e) {
    res.json({ tools: [], count: 0 });
  }
});

// GET /api/traffic/health — Health check
router.get('/health', (req, res) => {
  // Check if gateway is alive
  const data = loadData();
  const recentVisits = (data.visits || []).filter(v => (Date.now() - v.ts) < 600000).length;
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    totalVisits: data.totalVisits || 0,
    recentVisits
  });
});

initData();
console.log('[traffic-service] Loaded — tracking pageviews at ' + DATA_FILE);

module.exports = { router, loadData, saveData };
