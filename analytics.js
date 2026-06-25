// analytics.js — Request tracking and analytics for gateway
// Loaded by: gateway.js (require)
// Provides: analytics middleware, /api/analytics endpoint
const fs = require('fs');

const analytics = {
  started: Date.now(),
  requests: 0,
  errors: 0,
  bytesSent: 0,
  routes: {},
  topIPs: {},
  hourlyRequests: [],
  requestLog: [],
  lastHourReset: Date.now()
};

function track(req, res, startTime) {
  const url = (req.url || '').split('?')[0];
  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  analytics.requests++;
  analytics.routes[url] = (analytics.routes[url] || 0) + 1;
  analytics.topIPs[ip] = (analytics.topIPs[ip] || 0) + 1;
  
  // Hourly rollup
  const now = Date.now();
  if (now - analytics.lastHourReset > 3600000) {
    analytics.hourlyRequests.push({ t: new Date(analytics.lastHourReset).toISOString(), c: analytics.requests });
    if (analytics.hourlyRequests.length > 72) analytics.hourlyRequests = analytics.hourlyRequests.slice(-72);
    analytics.lastHourReset = now;
  }
  
  // Rolling log (last 200)
  analytics.requestLog.push({
    t: new Date(now).toISOString(), m: req.method || 'GET',
    u: url, ip: ip.split(':').pop()?.substring(0, 12) || ip.substring(0, 12),
    ms: Date.now() - startTime
  });
  if (analytics.requestLog.length > 200) analytics.requestLog = analytics.requestLog.slice(-200);
  
  // Track bytes on response end
  const origEnd = res.end.bind(res);
  res.end = function chunk(chunk) {
    if (chunk) analytics.bytesSent += Buffer.byteLength(String(chunk));
    if (res.statusCode >= 400) analytics.errors++;
    return origEnd(chunk);
  }.bind(res);
}

function getStats() {
  const topRoutes = Object.entries(analytics.routes)
    .sort((a, b) => b[1] - a[1]).slice(0, 25)
    .map(([route, hits]) => ({ route, hits }));
  
  let blogCount = 0;
  try { blogCount = fs.readdirSync('/root/automaton/content/blog').filter(f => f.endsWith('.html')).length; } catch(e) {}
  
  const uptime = Math.floor((Date.now() - analytics.started) / 1000);
  const recentMin = analytics.requestLog.filter(r => Date.now() - new Date(r.t).getTime() < 60000).length;
  const recent5min = analytics.requestLog.filter(r => Date.now() - new Date(r.t).getTime() < 300000).length;
  
  return {
    status: 'ok',
    uptime: Math.floor(uptime / 3600) + 'h ' + Math.floor((uptime % 3600) / 60) + 'm',
    uptimeSeconds: uptime,
    totalRequests: analytics.requests,
    uniqueRoutes: Object.keys(analytics.routes).length,
    topRoutes,
    errors: analytics.errors,
    bytesSentMB: (analytics.bytesSent / 1048576).toFixed(2),
    rpm: recentMin,
    rpm5: (recent5min / 5).toFixed(1),
    memoryMB: Math.round(process.memoryUsage().heapUsed / 1048576),
    blogArticles: blogCount,
    hourlyHistory: analytics.hourlyRequests.slice(-24)
  };
}

function handleAPI(req, res) {
  const url = (req.url || '').split('?')[0];
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }
  
  if (url === '/api/analytics') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(getStats(), null, 2));
  }
  if (url === '/api/analytics/recent') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(analytics.requestLog.slice(-50), null, 2));
  }
  if (url === '/api/analytics/routes') {
    const sorted = Object.entries(analytics.routes)
      .sort((a, b) => b[1] - a[1]);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(sorted, null, 2));
  }
  
  res.writeHead(404);
  res.end('Not found');
}

// Check if analytics API endpoint matches
function matches(url) {
  const path = url.split('?')[0];
  return path.startsWith('/api/analytics');
}

module.exports = { track, getStats, handleAPI, matches };
