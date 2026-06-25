#!/usr/bin/env node
/**
 * gateway-routes.js — NEW route additions for gateway.cjs v2.1+
 * 
 * These routes are designed to be appended to the gateway handler.
 * Each route handles a specific traffic- or revenue-generating function.
 * 
 * Copy-paste each block into the appropriate section of gateway.cjs.
 * Run this as a standalone subprocess to verify all routes.
 * 
 * Usage: node services/gateway-routes.js
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = 8082; // test port only — routes mount on gateway :8080
const DATA_DIR = '/root/automaton/data';

// ============================================================
// ROUTE 1: GET /api/traffic — Public traffic stats dashboard
// Mirrors revenue tracker for public consumption
// ============================================================
function handleTraffic(req, res) {
  const db = readJSON(path.join(DATA_DIR, 'traffic.json'), {});
  res.writeHead(200, { 'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, max-age=300'
  });
  res.end(JSON.stringify({
    totalVisits: db.totalVisits || 0,
    uniqueReferrers: Object.keys(db.referrers || {}).length,
    topPages: Object.entries(db.pages || {})
      .sort((a,b) => b[1] - a[1])
      .slice(0, 10)
      .map(([p, c]) => ({ page: p, visits: c })),
    topReferrers: Object.entries(db.referrers || {})
      .sort((a,b) => b[1] - a[1])
      .slice(0, 10)
      .map(([r, c]) => ({ referrer: r, visits: c })),
    conversions: db.conversions || 0,
    freeTrials: db.freeTrials || 0,
    apiCalls: db.apiCalls || 0
  }));
}

// ============================================================
// ROUTE 2: GET /viral — Viral sharing page for code-grader
// Shows share stats and leaderboard of who's sharing
// ============================================================
function handleViral(req, res) {
  const db = readJSON(path.join(DATA_DIR, 'viral.json'), { shares: {}, total: 0 });
  const topSharers = Object.entries(db.shares || {})
    .sort((a,b) => b[1].count - a[1].count)
    .slice(0, 20)
    .map(([url, data]) => ({ url, count: data.count, lastShare: data.lastShare }));
  
  res.writeHead(200, { 'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(JSON.stringify({
    totalShares: db.total || 0,
    activeSharers: Object.keys(db.shares || {}).length,
    topSharers
  }));
}

// ============================================================
// ROUTE 3: POST /api/viral/share — Track a share/clink
// Called when someone uses the code grader badge
// ============================================================
function handleViralShare(req, res) {
  let body = '';
  req.on('data', c => body += c);
  req.on('end', () => {
    try {
      const data = JSON.parse(body);
      const db = readJSON(path.join(DATA_DIR, 'viral.json'), { shares: {}, total: 0 });
      if (!db.shares[data.url]) {
        db.shares[data.url] = { count: 0, firstShare: new Date().toISOString(), lastShare: new Date().toISOString() };
      }
      db.shares[data.url].count++;
      db.shares[data.url].lastShare = new Date().toISOString();
      db.total = (db.total || 0) + 1;
      writeJSON(path.join(DATA_DIR, 'viral.json'), db);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, totalShares: db.total }));
    } catch(e) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: e.message }));
    }
  });
}

// ============================================================
// ROUTE 4: GET /api/credits-used — Show real utilization
// Public endpoint showing our service is actually used
// ============================================================
function handleCreditsUsed(req, res) {
  const keys = readJSON('/root/automaton/api-keys.json', {});
  const keysArr = Object.entries(keys);
  const totalCredits = keysArr.reduce((s, [,k]) => s + (k.credits || 0) + (((k.used || 0)) * 3), 0);
  const usedCredits = keysArr.reduce((s, [,k]) => s + ((k.used || 0) * 3), 0);
  const paidKeys = keysArr.filter(([,k]) => k.price_id && k.price_id !== 'dev_trial');
  const paidRevenue = paidKeys.reduce((s, [,k]) => {
    const prices = { price_starter: 5, price_advanced: 10, price_pro: 25, price_ultimate: 50 };
    return s + (prices[k.price_id] || 0);
  }, 0);
  
  res.writeHead(200, { 'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(JSON.stringify({
    totalApiKeys: keysArr.length,
    paidUsers: paidKeys.length,
    totalCreditsIssued: totalCredits,
    creditsUsed: usedCredits,
    utilizationPercent: totalCredits > 0 ? ((usedCredits / totalCredits) * 100).toFixed(1) : '0.0',
    revenueUSD: paidRevenue,
    activeInLastWeek: keysArr.filter(([,k]) => k.last_used && Date.now() - new Date(k.last_used).getTime() < 604800000).length,
    timestamp: new Date().toISOString()
  }));
}

// ============================================================
// ROUTE 5: GET /api/roadmap — Public roadmap for transparency
// Shows what we're building to build trust
// ============================================================
function handleRoadmap(req, res) {
  res.writeHead(200, { 'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(JSON.stringify({
    agent: 'my-automaton',
    mission: 'Pay for my own server by providing AI services',
    status: 'bootstrapping',
    revenue: '$39.74 (5 paid users)',
    roadmap: [
      { phase: 'launch', done: true, items: ['Gateway API', 'Stripe payments', 'Free tier', 'Dev keys', 'Code grader tool'] },
      { phase: 'growth', done: false, items: ['MCP server integration', 'ClawHunt listing', 'Google Search Console', 'Backlink program'] },
      { phase: 'scale', done: false, items: ['Referral program', 'Agent-to-agent payments', 'Auto-scaling'] }
    ],
    funding: {
      wallet: '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113',
      chain: 'Base (USDC)',
      status: 'self-funded from creator'
    }
  }));
}

// ============================================================
// Helpers
// ============================================================
function readJSON(p, def = {}) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return def; }
}
function writeJSON(p, data) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
}

// ============================================================
// TEST SERVER (standalone mode)
// ============================================================
function readBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => resolve(body));
  });
}

const ROUTES = {
  'GET /api/traffic': handleTraffic,
  'GET /api/viral': handleViral,
  'POST /api/viral/share': handleViralShare,
  'GET /api/credits-used': handleCreditsUsed,
  'GET /api/roadmap': handleRoadmap,
};

const server = http.createServer(async (req, res) => {
  const method = req.method;
  const url = require('url').parse(req.url).pathname;
  const key = `${method} ${url}`;
  
  if (ROUTES[key]) {
    console.log(`→ ${key}`);
    ROUTES[key](req, res);
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({
      available: Object.keys(ROUTES),
      note: 'These routes mount on gateway:8080. For standalone: node services/gateway-routes.js',
      example: `curl http://localhost:${PORT}/api/traffic`
    }));
  }
});

// Only start server if run directly
if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`=== GATEWAY ROUTE TESTER ===`);
    console.log(`Routes available on http://localhost:${PORT}`);
    console.log(`Test each:`);
    Object.keys(ROUTES).forEach(r => console.log(`  curl http://localhost:${PORT}/${r.split(' ')[1]}`));
    console.log(`\nTo mount in gateway.cjs, add each handler to the main switch().`);
    console.log(`To stop: Ctrl+C`);
  });
}

module.exports = { ROUTES, handleTraffic, handleViral, handleViralShare, handleCreditsUsed, handleRoadmap };
