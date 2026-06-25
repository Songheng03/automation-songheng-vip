/**
 * Widget Handler for my-automaton gateway
 * Provides embed widget serving + tracking
 */
const path = require('path');
const fs = require('fs');

const CONTENT_DIR = '/root/automaton/content';
const DATA_FILE = '/root/automaton/data/widget-stats.json';

function loadStats() {
  try {
    if (fs.existsSync(DATA_FILE)) return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch(e) {}
  return { embeds: 0, pings: [], domains: {} };
}

function saveStats(stats) {
  try {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(stats, null, 2));
  } catch(e) {}
}

function handleRoute(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const pathname = url.pathname;

  // Serve widget.js
  if (pathname === '/widget.js') {
    const widgetPath = path.join(CONTENT_DIR, 'widget.js');
    if (fs.existsSync(widgetPath)) {
      const content = fs.readFileSync(widgetPath, 'utf8');
      res.writeHead(200, {
        'Content-Type': 'application/javascript',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600'
      });
      res.end(content);
      return true;
    }
    res.writeHead(404);
    res.end('Not found');
    return true;
  }

  // Serve widget install page
  if (pathname === '/widget-install.html' || pathname === '/widget-install') {
    const installPath = path.join(CONTENT_DIR, 'widget-install.html');
    if (fs.existsSync(installPath)) {
      const content = fs.readFileSync(installPath, 'utf8');
      res.writeHead(200, {
        'Content-Type': 'text/html',
        'Cache-Control': 'no-cache'
      });
      res.end(content);
      return true;
    }
    res.writeHead(404);
    res.end('Not found');
    return true;
  }

  // Serve widget dashboard
  if (pathname === '/widget-dashboard.html' || pathname === '/widget-dashboard') {
    const dashPath = path.join(CONTENT_DIR, 'widget-dashboard.html');
    if (fs.existsSync(dashPath)) {
      const content = fs.readFileSync(dashPath, 'utf8');
      res.writeHead(200, {
        'Content-Type': 'text/html',
        'Cache-Control': 'no-cache'
      });
      res.end(content);
      return true;
    }
    res.writeHead(404);
    res.end('Not found');
    return true;
  }

  // Track embed pings
  if (pathname === '/api/widget/ping') {
    const ref = url.searchParams.get('ref') || 'direct';
    const page = url.searchParams.get('url') || 'unknown';
    const stats = loadStats();
    stats.pings.push({ ref, page, ts: new Date().toISOString() });
    stats.embeds++;
    const domain = ref !== 'direct' ? new URL(ref).hostname : 'direct';
    stats.domains[domain] = (stats.domains[domain] || 0) + 1;
    saveStats(stats);
    res.writeHead(200, { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify({ ok: true, embeds: stats.embeds }));
    return true;
  }

  // Widget stats (admin)
  if (pathname === '/api/widget/stats') {
    const stats = loadStats();
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify(stats));
    return true;
  }

  return false;
}

module.exports = { handleRoute };
