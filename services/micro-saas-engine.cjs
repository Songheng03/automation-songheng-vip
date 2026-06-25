#!/usr/bin/env node
/**
 * micro-saas-engine.cjs — Public stats, leaderboard, feedback, promo codes, system status
 * 
 * Loaded by gateway.cjs. Provides social proof and engagement features.
 * Routes: /api/public-stats, /api/leaderboard, /api/feedback, /api/redeem/:code, /api/status
 */

const fs = require('fs');
const path = require('path');
const url = require('url');

const DATA_DIR = '/root/automaton/data';
const API_KEYS = '/root/automaton/api-keys.json';
const TRAFFIC_DB = path.join(DATA_DIR, 'traffic.json');
const FEEDBACK_FILE = path.join(DATA_DIR, 'feedback.json');
const PROMO_CODES = path.join(DATA_DIR, 'promo-codes.json');

function readJSON(p, def = {}) {
  try { return JSON.parse(fs.readFileSync(p, 'utf-8')); } catch { return def; }
}
function writeJSON(p, data) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
}

// ===== PUBLIC STATS (social proof for landing page) =====
function handlePublicStats(req, res) {
  const keys = readJSON(API_KEYS);
  const entries = Object.entries(keys);
  const paid = entries.filter(([,k]) => k.price_id && k.price_id !== 'dev_trial');
  const t = readJSON(TRAFFIC_DB, {});
  
  const totalCredits = entries.reduce((s, [,k]) => s + (k.credits || 0), 0);
  const usedCredits = entries.reduce((s, [,k]) => s + (k.used || 0) * 3, 0);
  const utilization = totalCredits > 0 ? (usedCredits / totalCredits * 100).toFixed(1) : '0.0';
  
  const stats = {
    status: 'operational',
    agent: 'my-automaton',
    wallet: '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113',
    chain: 'Base (USDC)',
    users: {
      total: entries.length,
      paid: paid.length,
      dev: entries.length - paid.length
    },
    usage: {
      total_credits: totalCredits,
      used_credits: usedCredits,
      utilization_pct: utilization,
      total_api_calls: entries.reduce((s, [,k]) => s + (k.used || 0), 0)
    },
    traffic: {
      total_visits: t.totalVisits || 0,
      conversions: t.conversions || 0,
      free_trials: t.freeTrials || 0,
      conversion_rate: t.totalVisits > 0 
        ? ((t.conversions / t.totalVisits) * 100).toFixed(2) + '%' 
        : '0%'
    },
    pricing: {
      starter: { price: '$5', credits: 500, price_per_credit: '$0.010' },
      advanced: { price: '$10', credits: 1100, price_per_credit: '$0.009' },
      pro: { price: '$25', credits: 3000, price_per_credit: '$0.008' },
      ultimate: { price: '$50', credits: 6500, price_per_credit: '$0.008' }
    },
    uptime: process.uptime(),
    version: 'v2.2',
    generated: new Date().toISOString()
  };
  
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, max-age=60'
  });
  res.end(JSON.stringify(stats));
}

// ===== LEADERBOARD (top users by usage) =====
function handleLeaderboard(req, res) {
  const keys = readJSON(API_KEYS);
  const ranked = Object.entries(keys)
    .filter(([,k]) => (k.used || 0) > 0)
    .sort(([,a], [,b]) => (b.used || 0) - (a.used || 0))
    .slice(0, 20)
    .map(([key, k], i) => ({
      rank: i + 1,
      key: key.substring(0, 12) + '...',
      credits_used: (k.used || 0) * 3,
      api_calls: k.used || 0,
      plan: k.price_id || 'dev_trial',
      active: k.credits > 0
    }));
  
  // Count total usage
  const totalCalls = Object.values(keys).reduce((s, k) => s + (k.used || 0), 0);
  
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(JSON.stringify({
    total_users: Object.keys(keys).length,
    active_users: Object.values(keys).filter(k => (k.used || 0) > 0).length,
    total_api_calls: totalCalls,
    leaderboard: ranked
  }));
}

// ===== FEEDBACK =====
function handleFeedback(req, res) {
  let body = '';
  req.on('data', c => body += c);
  req.on('end', () => {
    try {
      const fb = JSON.parse(body);
      const feedbacks = readJSON(FEEDBACK_FILE, []);
      feedbacks.push({
        ...fb,
        ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress,
        timestamp: new Date().toISOString(),
        id: Date.now().toString(36) + Math.random().toString(36).substring(2, 6)
      });
      writeJSON(FEEDBACK_FILE, feedbacks);
      
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ status: 'thanks', message: 'Feedback recorded. Thank you!' }));
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid feedback format' }));
    }
  });
}

// ===== PROMO CODES =====
function handleRedeem(req, res) {
  const code = url.parse(req.url).pathname.split('/').pop();
  const promos = readJSON(PROMO_CODES, {});
  
  if (!promos[code]) {
    res.writeHead(404, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ error: 'Invalid promo code' }));
    return;
  }
  
  const promo = promos[code];
  if (promo.used >= promo.max_uses) {
    res.writeHead(410, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Promo code expired' }));
    return;
  }
  
  if (promo.expires && new Date(promo.expires) < new Date()) {
    res.writeHead(410, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Promo code expired' }));
    return;
  }
  
  // Generate key with bonus credits
  const crypto = require('crypto');
  const key = 'am_' + crypto.randomBytes(24).toString('base64url');
  const keys = readJSON(API_KEYS);
  keys[key] = {
    credits: promo.credits || 100,
    created: new Date().toISOString(),
    used: 0,
    price_id: 'promo_' + code,
    source: 'promo',
    promo_code: code
  };
  writeJSON(API_KEYS, keys);
  
  promo.used = (promo.used || 0) + 1;
  writeJSON(PROMO_CODES, promos);
  
  res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify({
    api_key: key,
    credits: promo.credits,
    message: 'Promo code redeemed! Enjoy your bonus credits.',
    docs: '/api-docs.html'
  }));
}

// ===== SYSTEM STATUS =====
function handleStatus(req, res) {
  const keys = readJSON(API_KEYS);
  const t = readJSON(TRAFFIC_DB, {});
  const fb = readJSON(FEEDBACK_FILE, []);
  const uptime = process.uptime();
  
  const status = {
    system: {
      name: 'my-automaton',
      version: 'v2.2',
      uptime_seconds: uptime,
      uptime_human: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`,
      status: 'operational',
      deepseek: !!process.env.DEEPSEEK_API_KEY,
      engine: 'micro-saas-engine v1.0'
    },
    users: {
      total: Object.keys(keys).length,
      paid: Object.values(keys).filter(k => k.price_id && k.price_id !== 'dev_trial').length,
      trial: Object.values(keys).filter(k => k.price_id === 'dev_trial').length,
      active_today: Object.values(keys).filter(k => {
        if (!k.last_used) return false;
        return new Date(k.last_used).toDateString() === new Date().toDateString();
      }).length
    },
    traffic: {
      total_visits: t.totalVisits || 0,
      conversions: t.conversions || 0,
      free_trials: t.freeTrials || 0,
      api_calls: t.apiCalls || 0
    },
    feedback: {
      total: fb.length,
      latest: fb.slice(-3).map(f => ({ message: f.message?.substring(0, 100), rating: f.rating, time: f.timestamp }))
    }
  };
  
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(JSON.stringify(status));
}

// ===== ROUTER =====
function handleRoute(req, res) {
  const method = req.method;
  const urlp = url.parse(req.url).pathname;
  
  switch (urlp) {
    case '/api/public-stats':
      if (method === 'GET') { handlePublicStats(req, res); return true; }
      break;
    case '/api/leaderboard':
      if (method === 'GET') { handleLeaderboard(req, res); return true; }
      break;
    case '/api/feedback':
      if (method === 'POST') { handleFeedback(req, res); return true; }
      break;
    case '/api/status':
      if (method === 'GET') { handleStatus(req, res); return true; }
      break;
  }
  
  // Promo code redemption: /api/redeem/:code
  if (urlp.startsWith('/api/redeem/') && method === 'GET') {
    handleRedeem(req, res);
    return true;
  }
  
  return false;
}

module.exports = { handleRoute };
