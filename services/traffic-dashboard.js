#!/usr/bin/env node
/**
 * Traffic Dashboard — tracks page views, API usage, payments
 * Loaded by gateway.js as middleware
 */
const fs = require('fs');
const path = require('path');
const DATA_DIR = '/root/automaton/data';
const LOG_FILE = path.join(DATA_DIR, 'requests.log');

// Ensure data dir
try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch(e) {}

// Request counter — resets on restart
let stats = { total: 0, by_path: {}, by_ip: {}, by_service: {}, hourly: {}, payments: 0 };
const startTime = Date.now();

function logRequest(req) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
  const url = req.url || '/';
  const method = req.method || 'GET';
  stats.total++;
  stats.by_path[url] = (stats.by_path[url] || 0) + 1;
  stats.by_ip[ip] = (stats.by_ip[ip] || 0) + 1;
  
  // Track by service prefix
  const service = url.split('/')[1] || 'root';
  stats.by_service[service] = (stats.by_service[service] || 0) + 1;
  
  // Hourly bucket
  const hour = new Date().toISOString().slice(0, 13) + ':00';
  stats.hourly[hour] = (stats.hourly[hour] || 0) + 1;

  // Write append log
  try {
    const line = JSON.stringify({ ts: new Date().toISOString(), ip, method, url, ua: req.headers['user-agent']?.slice(0,100) || '' }) + '\n';
    fs.appendFileSync(LOG_FILE, line);
  } catch(e) {}
}

// Middleware
function middleware(req, res, next) {
  logRequest(req);
  
  // Detect x402 payments
  if (req.headers['x-x402-payment']) {
    stats.payments++;
    try {
      const payLine = JSON.stringify({ 
        ts: new Date().toISOString(), 
        ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown',
        txHash: req.headers['x-x402-payment'],
        url: req.url,
        method: req.method
      }) + '\n';
      fs.appendFileSync(path.join(DATA_DIR, 'payments.jsonl'), payLine);
    } catch(e) {}
  }
  
  next();
}

// API router
const express = require('express');
const router = express.Router();

router.get('/stats', (req, res) => {
  res.json({
    total_requests: stats.total,
    uptime_hours: Math.floor((Date.now() - startTime) / 3600000),
    payments_received: stats.payments,
    top_paths: Object.entries(stats.by_path).sort((a,b) => b[1] - a[1]).slice(0, 20),
    top_services: Object.entries(stats.by_service).sort((a,b) => b[1] - a[1]),
    recent_hours: Object.entries(stats.hourly).sort().slice(-48),
    start_time: new Date(startTime).toISOString()
  });
});

router.get('/recent', (req, res) => {
  try {
    if (!fs.existsSync(LOG_FILE)) return res.json({ requests: [] });
    const lines = fs.readFileSync(LOG_FILE, 'utf8').trim().split('\n').filter(Boolean);
    const recent = lines.slice(-100).map(l => JSON.parse(l));
    res.json({ requests: recent.reverse() });
  } catch(e) {
    res.json({ requests: [], error: e.message });
  }
});

module.exports = { middleware, router };
