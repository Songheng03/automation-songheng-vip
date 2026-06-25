#!/usr/bin/env node
/**
 * badge-server.mjs — Dynamic SVG Badge Generator for /root/services/
 * 
 * Generates GitHub-style badges as SVGs with clickable backlinks.
 * Every badge served = a backlink to my-automaton.
 * 
 * Add to gateway.cjs:
 *   const badge = require('./services/badge-server.mjs');
 *   app.get('/api/badge/*', badge.handler);
 */

const SITE = 'https://automation.songheng.vip';
const STATS = { served: 0, since: new Date().toISOString() };

// SVG badge template — flat-square style like shields.io
function generateBadgeSVG(label, message, color = '#238636', style = 'flat-square') {
  STATS.served++;
  
  const colors = {
    green: '#238636', blue: '#58a6ff', yellow: '#d29922', 
    red: '#f85149', purple: '#a371f7', gray: '#8b949e',
    brightgreen: '#238636', orange: '#d29922', 
  };
  const bgColor = colors[color] || color || '#238636';
  
  // Calculate widths based on text
  const labelWidth = Math.max(20, label.length * 7 + 12);
  const msgWidth = Math.max(20, message.length * 7 + 12);
  const totalWidth = labelWidth + msgWidth;
  
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${totalWidth}" height="20" role="img" aria-label="${label}: ${message}">
  <title>${label}: ${message}</title>
  <a xlink:href="${SITE}" target="_blank" rel="noopener">
    <g shape-rendering="crispEdges">
      <rect x="0" y="0" width="${totalWidth}" height="20" fill="#555"/>
      <rect x="${labelWidth}" y="0" width="${msgWidth}" height="20" fill="${bgColor}"/>
      <rect x="0" y="0" width="${totalWidth}" height="20" fill="url(#g)"/>
    </g>
    <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">
      <text x="${labelWidth/2}" y="14" fill="#fff">${escapeXml(label)}</text>
      <text x="${labelWidth + msgWidth/2}" y="14" fill="#fff" font-weight="bold">${escapeXml(message)}</text>
    </g>
  </a>
</svg>`;
}

function escapeXml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Express-compatible handler
function handler(req, res) {
  const parts = req.url.split('/').filter(Boolean);
  // /api/badge/<label>-<message>-<color>
  
  let label = 'my-automaton';
  let message = 'try it free';
  let color = '#238636';
  
  // Support both /api/badge and /badge routes
  const routeIdx = parts.indexOf('badge');
  if (routeIdx >= 0 && parts.length > routeIdx + 1) {
    const slug = parts.slice(routeIdx + 1).join('/');
    // Parse: label-message-color or label--message-color (double dash for spaces)
    const match = slug.match(/^(.+?)-(.+?)-([a-z]+|#[0-9a-f]{6})$/i);
    if (match) {
      label = match[1].replace(/-/g, ' ').replace(/_/g, ' ');
      message = match[2].replace(/-/g, ' ').replace(/_/g, ' ');
      color = match[3];
    } else {
      // Just label-message
      const simple = slug.match(/^(.+?)-(.+?)$/);
      if (simple) {
        label = simple[1].replace(/-/g, ' ').replace(/_/g, ' ');
        message = simple[2].replace(/-/g, ' ').replace(/_/g, ' ');
      } else {
        label = slug.replace(/-/g, ' ').replace(/_/g, ' ');
      }
    }
  }
  
  // Also support query params: ?label=X&message=Y&color=Z
  const qIdx = label.indexOf('?');
  if (qIdx > 0) {
    const query = label.slice(qIdx + 1);
    label = label.slice(0, qIdx);
    const params = new URLSearchParams(query);
    if (params.get('label')) label = params.get('label');
    if (params.get('message')) message = params.get('message');
    if (params.get('color')) color = params.get('color');
  }
  
  const svg = generateBadgeSVG(label, message, color);
  
  res.writeHead(200, {
    'Content-Type': 'image/svg+xml',
    'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    'Access-Control-Allow-Origin': '*',
    'X-Badge-Served': STATS.served
  });
  res.end(svg);
}

// Stats endpoint
function statsHandler(req, res) {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ service: 'badge-server', served: STATS.served, since: STATS.since }));
}

// Standalone server for testing
function startServer(port = 3111) {
  const http = require('http');
  const server = http.createServer((req, res) => {
    if (req.url === '/stats' || req.url === '/api/badge/stats') {
      return statsHandler(req, res);
    }
    handler(req, res);
  });
  server.listen(port, () => {
    console.log(`[badge-server] Running on http://localhost:${port}`);
    console.log(`[badge-server] Example: http://localhost:${port}/api/badge/ai-powered-code-review-238636`);
  });
  return server;
}

module.exports = { handler, statsHandler, generateBadgeSVG, startServer };

// If run directly
if (process.argv[1]?.includes('badge-server')) {
  const port = parseInt(process.argv[2] || '3111');
  startServer(port);
}
