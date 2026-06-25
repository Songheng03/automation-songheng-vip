/**
 * analytics-tracker.js — Lightweight page view & API usage tracker
 * Designed for raw http.createServer (not Express).
 * Writes to /root/automaton/data/page-views.json
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = '/root/automaton/data/page-views.json';
const SAVE_INTERVAL = 50; // Save every N new views

// ── State ────────────────────────────────────────────────
let views = {};
let newViews = 0;
const rateWindow = new Map(); // "ip:path" -> timestamp

// Load existing
try {
  if (fs.existsSync(DATA_FILE)) views = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
} catch (e) { views = {}; }

// ── Helpers ──────────────────────────────────────────────
function getDateKey() { return new Date().toISOString().slice(0, 10); }

function saveIfNeeded() {
  if (newViews >= SAVE_INTERVAL) {
    try { fs.writeFileSync(DATA_FILE, JSON.stringify(views, null, 2)); } catch (e) {}
    newViews = 0;
  }
}

function forceSave() {
  try { fs.writeFileSync(DATA_FILE, JSON.stringify(views, null, 2)); } catch (e) {}
}

// ── Track a request ──────────────────────────────────────
function track(req) {
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown')
    .split(',')[0].trim().replace(/[^0-9a-f.:]/g, '');
  
  const parsed = require('url').parse(req.url);
  let pagePath = parsed.pathname;
  if (pagePath === '/' || pagePath === '') pagePath = '/index.html';
  
  // Only track HTML pages and API calls
  const ext = path.extname(pagePath);
  if (ext && ext !== '.html') return; // Skip CSS/JS/images
  
  // Dedup: same IP+path within 5 seconds
  const dedupKey = `${ip}:${pagePath}`;
  const now = Date.now();
  const last = rateWindow.get(dedupKey);
  if (last && now - last < 5000) return;
  rateWindow.set(dedupKey, now);
  
  // Cleanup old rate window entries periodically
  if (rateWindow.size > 2000) {
    for (const [k, t] of rateWindow) { if (now - t > 30000) rateWindow.delete(k); }
  }
  
  const date = getDateKey();
  if (!views[date]) views[date] = {};
  if (!views[date][pagePath]) views[date][pagePath] = { count: 0, uniqueIps: [] };
  
  const entry = views[date][pagePath];
  entry.count++;
  
  // Track unique IPs (keep as array of strings for JSON compat)
  if (!Array.isArray(entry.uniqueIps)) entry.uniqueIps = [];
  if (!entry.uniqueIps.includes(ip)) {
    if (entry.uniqueIps.length < 100) entry.uniqueIps.push(ip);
  }
  
  newViews++;
  saveIfNeeded();
}

// ── Get analytics summary ────────────────────────────────
function getSummary(days = 7) {
  forceSave();
  const dates = Object.keys(views).sort().slice(-days);
  
  const totals = {};
  let totalViews = 0;
  let uniqueIpsAll = new Set();
  
  for (const date of dates) {
    for (const [p, data] of Object.entries(views[date] || {})) {
      if (!totals[p]) totals[p] = { views: 0, uniqueIps: 0 };
      totals[p].views += data.count || 0;
      if (Array.isArray(data.uniqueIps)) {
        totals[p].uniqueIps += data.uniqueIps.length;
        data.uniqueIps.forEach(ip => uniqueIpsAll.add(ip));
      }
      totalViews += data.count || 0;
    }
  }
  
  const topPages = Object.entries(totals)
    .map(([path, data]) => ({ path, ...data }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 20);
  
  const today = getDateKey();
  const todayViews = views[today] ? Object.values(views[today]).reduce((s, d) => s + (d.count || 0), 0) : 0;
  
  return {
    days,
    totalViews,
    totalUniqueIps: uniqueIpsAll.size,
    todayViews,
    topPages
  };
}

module.exports = { track, getSummary, forceSave };
