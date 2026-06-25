#!/usr/bin/env node
/**
 * analytics-middleware.js — Gateway analytics collector
 * Tracks: page views, API usage, conversion funnels, user paths
 * Purpose: Identify which free tools → drive Stripe purchases
 * 
 * USAGE (in gateway.cjs): const analytics = require('./analytics-middleware.js');
 *   app.use(analytics.trackPageViews());
 *   app.post('/api/x402-webhook', analytics.trackConversion(), ...);
 */

const fs = require('fs');
const path = require('path');

const STATS_DIR = '/root/automaton/data';
const VIEWS_FILE = path.join(STATS_DIR, 'page-views.json');
const FUNNEL_FILE = path.join(STATS_DIR, 'conversion-funnel.json');

// Ensure data dir exists
if (!fs.existsSync(STATS_DIR)) fs.mkdirSync(STATS_DIR, { recursive: true });

// Load or init
function loadJSON(filePath, fallback = {}) {
  try {
    if (fs.existsSync(filePath)) return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (e) { console.error('Analytics load error:', e.message); }
  return fallback;
}

function saveJSON(filePath, data) {
  try { fs.writeFileSync(filePath, JSON.stringify(data, null, 2)); } catch (e) {}
}

function getDateKey() { return new Date().toISOString().slice(0, 10); }

// Rate-limit tracking — deduplicate same IP+path in short window
const rateWindow = new Map();

function shouldTrack(ip, path) {
  const key = `${ip}:${path}`;
  const now = Date.now();
  const last = rateWindow.get(key);
  if (last && now - last < 5000) return false; // 5s dedup
  rateWindow.set(key, now);
  // Cleanup old entries every 1000 requests
  if (rateWindow.size > 1000) {
    for (const [k, t] of rateWindow) { if (now - t > 30000) rateWindow.delete(k); }
  }
  return true;
}

/**
 * Track page views — all .html pages
 */
function trackPageViews() {
  return (req, res, next) => {
    const ip = req.headers['x-forwarded-for'] || req.ip || 'unknown';
    const pathname = req.path === '/' ? '/index.html' : req.path;
    
    if (!pathname.match(/\.(html|css|js|png|jpg|ico|svg)$/)) return next();
    if (!shouldTrack(ip, pathname)) return next();
    
    const date = getDateKey();
    const views = loadJSON(VIEWS_FILE);
    
    if (!views[date]) views[date] = {};
    if (!views[date][pathname]) views[date][pathname] = { count: 0, ips: new Set() };
    
    const entry = views[date][pathname];
    entry.count++;
    
    // Track unique IPs as Set (convert to array for JSON)
    if (typeof entry.ips === 'object' && !Array.isArray(entry.ips)) {
      entry.ips.add(ip.replace(/[^0-9a-f.:]/g, ''));
    } else {
      entry.ips = new Set(entry.ips || []);
      entry.ips.add(ip.replace(/[^0-9a-f.:]/g, ''));
    }
    
    // Only save every 50 views to avoid excessive disk I/O
    if (entry.count % 50 === 0) {
      // Convert Sets to arrays for JSON serialization
      const serialized = {};
      for (const [d, pages] of Object.entries(views)) {
        serialized[d] = {};
        for (const [p, data] of Object.entries(pages)) {
          serialized[d][p] = {
            count: data.count,
            uniqueIps: data.ips instanceof Set ? data.ips.size : (Array.isArray(data.ips) ? data.ips.length : 0)
          };
        }
      }
      saveJSON(VIEWS_FILE, serialized);
    }
    
    next();
  };
}

/**
 * Track Stripe conversions — record which tool the user came from
 */
function trackConversion() {
  return (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      // Only track successful payments
      if (body && body.status === 'payment_success') {
        const date = getDateKey();
        const funnel = loadJSON(FUNNEL_FILE);
        
        if (!funnel[date]) funnel[date] = { conversions: 0, totalRevenue: 0, referrers: {} };
        
        const today = funnel[date];
        today.conversions++;
        today.totalRevenue += (body.amount || 0);
        
        const referrer = body.referrer || 'direct';
        if (!today.referrers[referrer]) today.referrers[referrer] = { count: 0, revenue: 0 };
        today.referrers[referrer].count++;
        today.referrers[referrer].revenue += (body.amount || 0);
        
        saveJSON(FUNNEL_FILE, funnel);
        console.log(`💰 Conversion tracked: $${body.amount || '?'} from ${referrer}`);
      }
      return originalJson(body);
    };
    next();
  };
}

/**
 * Get top-performing pages (for dashboard)
 */
function getTopPages(days = 7) {
  const views = loadJSON(VIEWS_FILE);
  const dates = Object.keys(views).sort().slice(-days);
  
  const totals = {};
  for (const date of dates) {
    for (const [path, data] of Object.entries(views[date] || {})) {
      if (!totals[path]) totals[path] = { views: 0, uniqueIps: 0 };
      totals[path].views += data.count || 0;
      totals[path].uniqueIps += data.uniqueIps || 0;
    }
  }
  
  return Object.entries(totals)
    .map(([path, data]) => ({ path, ...data }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 20);
}

/**
 * Get conversion stats
 */
function getConversionStats(days = 30) {
  const funnel = loadJSON(FUNNEL_FILE);
  const dates = Object.keys(funnel).sort().slice(-days);
  
  let totalConversions = 0, totalRevenue = 0;
  const referrers = {};
  
  for (const date of dates) {
    const day = funnel[date] || {};
    totalConversions += day.conversions || 0;
    totalRevenue += day.totalRevenue || 0;
    for (const [ref, data] of Object.entries(day.referrers || {})) {
      if (!referrers[ref]) referrers[ref] = { count: 0, revenue: 0 };
      referrers[ref].count += data.count || 0;
      referrers[ref].revenue += data.revenue || 0;
    }
  }
  
  return { totalConversions, totalRevenue, referrers, days };
}

/**
 * Get summary (for home page stats display)
 */
function getSummary() {
  const topPages = getTopPages(7);
  const convStats = getConversionStats(30);
  const views = loadJSON(VIEWS_FILE);
  const totalUniquePages = new Set();
  Object.values(views).forEach(day => Object.keys(day).forEach(p => totalUniquePages.add(p)));
  
  return {
    totalPages: totalUniquePages.size,
    totalConversions: convStats.totalConversions,
    totalRevenue: convStats.totalRevenue.toFixed(2),
    top5Pages: topPages.slice(0, 5),
    topReferrers: Object.entries(convStats.referrers || {}).sort((a,b) => b[1].revenue - a[1].revenue).slice(0, 5)
  };
}

module.exports = { trackPageViews, trackConversion, getTopPages, getConversionStats, getSummary };

// Self-test
if (require.main === module) {
  console.log('📊 Analytics Summary:');
  console.log(JSON.stringify(getSummary(), null, 2));
  console.log('\n📈 Top 10 Pages:');
  getTopPages(7).forEach((p, i) => console.log(`  ${i+1}. ${p.path} — ${p.views} views, ${p.uniqueIps} unique`));
}
