#!/usr/bin/env node
// add-analytics.js — Injects request analytics tracking into gateway.js
// Adds: /api/analytics (real-time stats), /api/analytics/raw (visitor log)
// Also adds request tracking middleware at the top of the request handler

const fs = require('fs');
const path = require('path');

const GATEWAY = '/root/automaton/gateway.js';
let code = fs.readFileSync(GATEWAY, 'utf8');

// 1. Add analytics tracker after the promotion engine section
const analyticsTracker = `
// === ANALYTICS ENGINE ===
const analytics = {
  started: Date.now(),
  requests: 0,
  errors: 0,
  bytesSent: 0,
  routes: {},
  statusCodes: {},
  hourlyRequests: [],
  uniqueIPs: new Set(),
  recentRequests: [],
  lastHour: Date.now()
};

function trackRequest(req, res, startTime) {
  var now = Date.now();
  var route = req.url.split('?')[0];
  var ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  
  // Reset hourly stats every hour
  if (now - analytics.lastHour > 3600000) {
    analytics.hourlyRequests.push({ time: new Date(analytics.lastHour).toISOString(), count: analytics.requests });
    if (analytics.hourlyRequests.length > 48) analytics.hourlyRequests = analytics.hourlyRequests.slice(-48);
    analytics.lastHour = now;
  }
  
  analytics.requests++;
  analytics.routes[route] = (analytics.routes[route] || 0) + 1;
  analytics.uniqueIPs.add(ip);
  
  // Track recent requests (last 500)
  analytics.recentRequests.push({
    time: new Date(now).toISOString(),
    method: req.method,
    route: route,
    ip: ip.substring(0, 15),
    elapsed: Date.now() - startTime
  });
  if (analytics.recentRequests.length > 500) analytics.recentRequests = analytics.recentRequests.slice(-500);
}

function getAnalyticsStats() {
  var topRoutes = Object.entries(analytics.routes)
    .sort(function(a,b) { return b[1] - a[1]; })
    .slice(0, 20)
    .map(function(r) { return { route: r[0], hits: r[1] }; });
  
  // Get blog article count
  var blogCount = 0;
  try { blogCount = fs.readdirSync('/root/automaton/content/blog').filter(function(f) { return f.endsWith('.html'); }).length; } catch(e) {}
  
  var uptime = Math.floor((Date.now() - analytics.started) / 1000);
  
  // Calculate requests per minute (last 5 min)
  var recent5min = analytics.recentRequests.filter(function(r) {
    return Date.now() - new Date(r.time).getTime() < 300000;
  });
  
  return {
    uptime: uptime,
    uptimeHuman: Math.floor(uptime/3600) + 'h ' + Math.floor((uptime%3600)/60) + 'm',
    totalRequests: analytics.requests,
    uniqueIPs: analytics.uniqueIPs.size,
    activeRoutes: Object.keys(analytics.routes).length,
    topRoutes: topRoutes,
    errors: analytics.errors,
    bytesSent: analytics.bytesSent,
    recentRPM: recent5min.length / 5,
    blogArticles: blogCount,
    memory: process.memoryUsage().heapUsed,
    hourlyRequests: analytics.hourlyRequests.slice(-24)
  };
}
// === END ANALYTICS ENGINE ===
`;

// 2. Inject analytics tracker after promotion engine
// Find the promotion engine end marker
const promoEnd = '// === END PROMOTION ENGINE ===';
const insertPos = code.indexOf(promoEnd);
if (insertPos === -1) {
  console.error('ERROR: Could not find promotion engine end marker');
  process.exit(1);
}

code = code.slice(0, insertPos + promoEnd.length) + analyticsTracker + code.slice(insertPos + promoEnd.length);

// 3. Wrap the response end to track bytes and request completion
// Find the end of the request handler setup area
const launchPos = code.indexOf('http.createServer(function');
if (launchPos === -1) {
  console.error('ERROR: Could not find server creation');
  process.exit(1);
}

// Find the beginning of the request handler function
// We need to find the res.end wrapper area. Let's add tracking at the start of the request handler
const handlerStart = code.indexOf('function(req, res) {', launchPos);
if (handlerStart === -1) {
  console.error('ERROR: Could not find request handler');
  process.exit(1);
}

// Add request tracking right at the start of the handler
const trackInsert = '  var _reqStart = Date.now(); try {\n  // Track this request\n  if (true) {} // placeholder for safe insert';
// Insert after the function opening brace
 code = code.slice(0, handlerStart + 19) + '\n' + trackInsert + '\n' + code.slice(handlerStart + 19);

// 4. Add analytics API routes - find the /api/promotion/stats section
const promoApiPos = code.indexOf("'/api/promotion/stats'");
if (promoApiPos !== -1) {
  // Add analytics routes right after the promotion stats handler
  const analyticsRouteBlock = `
  // === Analytics API ===
  if (p === '/api/analytics') {
    var stats = getAnalyticsStats();
    res.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
    return res.end(JSON.stringify(stats, null, 2));
  }
  if (p === '/api/analytics/raw') {
    res.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
    return res.end(JSON.stringify(analytics.recentRequests.slice(-100), null, 2));
  }
  if (p === '/api/health/full') {
    var stats = getAnalyticsStats();
    var promoLog = { totalRuns: 0, totalShares: 0 };
    try { promoLog = JSON.parse(fs.readFileSync('/root/automaton/data/promotion-log.json')); } catch(e) {}
    res.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
    return res.end(JSON.stringify({
      status: 'ok',
      uptime: stats.uptimeHuman,
      requests: stats.totalRequests,
      uniqueIPs: stats.uniqueIPs,
      blogArticles: stats.blogArticles,
      recentRPM: stats.recentRPM.toFixed(1),
      topRoutes: stats.topRoutes.slice(0, 5),
      promotionRuns: promoLog.totalRuns || 0,
      promotionShares: promoLog.totalShares || 0
    }, null, 2));
  }
  // === End Analytics API ===
`;
  
  code = code.slice(0, promoApiPos) + analyticsRouteBlock + code.slice(promoApiPos);
}

// 5. Add error tracking and response wrapping
// Find where we wrap original res.end - look for res.writeHead or similar patterns
// Actually we should patch the res.end wrapper that already exists
// Find the request handler end where we track the response
// Look for the typical pattern where we close the handler
const handlerEnd = code.lastIndexOf('})(req, res);');
if (handlerEnd !== -1) {
  // Add error tracking and response completion tracking AFTER the handler call
  const endTracking = `
  // Track request completion
  var elapsed = Date.now() - _reqStart;
  if (res.statusCode >= 400) analytics.errors++;
  analytics.bytesSent += res._header ? res._header.length : 0;
  trackRequest({url: req.url, method: req.method, headers: {'x-forwarded-for': req.headers['x-forwarded-for']}}, res, _reqStart);
} catch(e) {
  analytics.errors++;
  if (!res.headersSent) {
    res.writeHead(500, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({error: 'Internal server error'}));
  }
}
`;
  code = code.slice(0, handlerEnd + 18) + endTracking + code.slice(handlerEnd + 18);
}

// 6. Save
fs.writeFileSync(GATEWAY, code);
console.log('✅ Analytics engine injected into gateway.js');

// Verify syntax
const { execSync } = require('child_process');
try {
  execSync('node --check ' + GATEWAY, { stdio: 'pipe' });
  console.log('✅ Syntax check passed');
} catch(e) {
  console.error('❌ Syntax error:', e.stderr.toString());
  process.exit(1);
}
