#!/usr/bin/env node
// clean-gateway.js — routes use readFileSync (reliable)
const express = require('express');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Kill ANY process on our port before starting
try { execSync('fuser -k 8080/tcp 2>/dev/null', { stdio: 'ignore', timeout: 3000 }); } catch(e) {}
try { execSync('sleep 0.5', { stdio: 'ignore' }); } catch(e) {}

const app = express();
const PORT = parseInt(process.env.PORT) || 8080;
const CONTENT = '/root/automaton/content';

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, X-X402-Payment, Authorization');
  res.header('X-Gateway', 'clean-gateway-v2');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// health — also dumps routes for debugging
app.get('/health', (req, res) => {
  const routes = {};
  try {
    app._router.stack.forEach(mw => {
      if (mw.route) routes[mw.route.path] = Object.keys(mw.route.methods).join(',').toUpperCase();
    });
  } catch(e) {}
  res.json({ status: 'ok', uptime: process.uptime(), gateway: 'clean-gateway-v2', pid: process.pid, routeCount: Object.keys(routes).length });
});

// debug: list all registered routes
app.get('/debug/routes', (req, res) => {
  const routes = {};
  try {
    app._router.stack.forEach(mw => {
      if (mw.route) routes[mw.route.path] = Object.keys(mw.route.methods).join(',').toUpperCase();
    });
  } catch(e) {}
  res.json({ routes, pid: process.pid, gateway: 'clean-gateway-v2', uptime: process.uptime() });
});

function servePage(page) {
  return (req, res) => {
    try {
      const html = fs.readFileSync(path.join(CONTENT, page), 'utf8');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(html);
    } catch (e) {
      res.status(404).send(`<h1>404</h1><p>${page}: ${e.message}</p>`);
    }
  };
}

// static pages
app.get('/', servePage('index.html'));
app.get('/blog', servePage('blog.html'));
app.get('/api-docs', servePage('api-docs.html'));
app.get('/dashboard', servePage('dashboard.html'));
app.get('/dashboard-live', servePage('dashboard-live.html'));
app.get('/playground', servePage('api-playground.html'));
app.get('/api-playground', servePage('api-playground.html'));
app.get('/x402-playground', servePage('x402-playground.html'));
app.get('/developers', servePage('developers.html'));
app.get('/agents', servePage('agent-commerce.html'));
app.get('/tools', servePage('tools.html'));
app.get('/upgrade', servePage('upgrade.html'));
app.get('/privacy', servePage('privacy.html'));
app.get('/terms', servePage('terms.html'));

// blog articles
app.get('/blog/:slug', (req, res) => {
  const fp = path.join(CONTENT, 'blog', req.params.slug + '.html');
  try {
    const html = fs.readFileSync(fp, 'utf8');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch { res.status(404).send(`<h1>404</h1><p>Blog "${req.params.slug}" not found</p>`); }
});

// services — all REAL services
const SVC = '/root/services';
['x402-service.js','stats-service.js','visitor-tracker.js','seo-pinger-service.js','revenue-funnel-service.js'].forEach(f => {
  try { 
    const svc = require(path.join(SVC, f));
    if (typeof svc.mount === 'function') {
      svc.mount(app);
      console.log(`loaded ${f}`);
    } else {
      console.log(`skip ${f}: no mount function`);
    }
  } catch(e) { console.log(`skip ${f}: ${e.message}`); }
});

// 404 handler
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    res.status(404).json({ error: 'not_found', path: req.path, hint: 'GET /debug/routes for all available routes' });
  } else {
    res.status(404).send(`<h1>404 — ${req.path}</h1>`);
  }
});

app.listen(PORT, '0.0.0.0', () => { 
  console.log(`gateway port ${PORT} (PID ${process.pid})`);
  // Print route summary
  const routes = {};
  app._router.stack.forEach(mw => {
    if (mw.route) routes[mw.route.path] = Object.keys(mw.route.methods).join(',').toUpperCase();
  });
  console.log(`Routes: ${Object.keys(routes).length} registered`);
  Object.entries(routes).forEach(([p, m]) => console.log(`  ${m} ${p}`));
});
