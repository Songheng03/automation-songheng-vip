// visitor-analytics.js — Track pageviews, referrers, and popular content
// Loaded by gateway.js. All analytics stored in memory with periodic flush to disk.
'use strict';
const fs = require('fs');
const path = require('path');

const DATA_FILE = '/root/automaton/data/analytics.json';
const FLUSH_INTERVAL = 5 * 60 * 1000; // flush every 5 min

let state = { pageviews: {}, referrers: {}, paths: {}, hourly: [], total: 0, startTime: Date.now() };

// Load persisted data
try { Object.assign(state, JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))); } catch(e) {}

function flush() {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2));
  } catch(e) { /* non-critical */ }
}
setInterval(flush, FLUSH_INTERVAL);
process.on('exit', flush);

function trackPageview(pagePath, referrer, ip) {
  state.total++;
  const hour = new Date().toISOString().substring(0, 13); // YYYY-MM-DDTHH
  state.hourly.push({ time: hour, path: pagePath, ref: referrer?.substring(0, 100) || '-' });
  // Keep last 24h of hourly data
  const cutoff = new Date(Date.now() - 86400000).toISOString().substring(0, 13);
  state.hourly = state.hourly.filter(h => h.time >= cutoff);

  // Path counts
  const cleanPath = pagePath || '/';
  state.paths[cleanPath] = (state.paths[cleanPath] || 0) + 1;

  // Referrer counts
  if (referrer && referrer !== '-') {
    try {
      const refUrl = new URL(referrer);
      const domain = refUrl.hostname;
      state.referrers[domain] = (state.referrers[domain] || 0) + 1;
    } catch(e) {
      state.referrers[referrer] = (state.referrers[referrer] || 0) + 1;
    }
  }

  // Clean up oldest entries if memory gets large
  if (state.hourly.length > 10000) state.hourly = state.hourly.slice(-5000);
  if (Object.keys(state.paths).length > 5000) {
    // Keep top 500 paths
    const sorted = Object.entries(state.paths).sort((a,b) => b[1] - a[1]);
    state.paths = Object.fromEntries(sorted.slice(0, 500));
  }
}

function getSummary() {
  const now = Date.now();
  const uptime = now - state.startTime;
  const recentHour = state.hourly.filter(h => h.time === new Date().toISOString().substring(0, 13)).length;

  // Top pages
  const topPages = Object.entries(state.paths)
    .sort((a,b) => b[1] - a[1])
    .slice(0, 20)
    .map(([path, count]) => ({ path, count }));

  // Top referrers
  const topRefs = Object.entries(state.referrers)
    .sort((a,b) => b[1] - a[1])
    .slice(0, 20)
    .map(([domain, count]) => ({ domain, count }));

  return {
    totalPageviews: state.total,
    totalReferrers: Object.keys(state.referrers).length,
    uniquePaths: Object.keys(state.paths).length,
    recentHourPageviews: recentHour,
    uptimeHours: Math.round(uptime / 3600000 * 10) / 10,
    topPages,
    topReferrers: topRefs.length > 0 ? topRefs : [{ domain: 'direct', count: state.total }],
    lastUpdated: new Date().toISOString()
  };
}

module.exports = { trackPageview, getSummary, flush };
