// Badge Gateway Integration — adds badge routing to gateway
// This file is loaded by gateway.cjs and registers badge routes
// Badge system: SVG badges that link back to automation.songheng.vip

const fs = require('fs');
const path = require('path');

const BADGES_DIR = path.join(__dirname, '..', 'content', 'badges');
const CONTENT_DIR = path.join(__dirname, '..', 'content');

// Ensure badges directory exists
if (!fs.existsSync(BADGES_DIR)) {
  fs.mkdirSync(BADGES_DIR, { recursive: true });
}

// Badge definitions
const BADGES = {
  'ai-powered': { label: 'AI Powered', color: '#10b981', style: 'flat' },
  'code-reviewed': { label: 'Code Reviewed', color: '#3b82f6', style: 'flat' },
  'security-scanned': { label: 'Security Scanned', color: '#ef4444', style: 'flat' },
  'test-passing': { label: 'Tests Passing', color: '#22c55e', style: 'flat' },
  'quality-a': { label: 'Quality A+', color: '#8b5cf6', style: 'flat' },
  'optimized': { label: 'Optimized', color: '#f59e0b', style: 'flat' },
  'decentralized': { label: 'Decentralized', color: '#6366f1', style: 'flat' },
  'agent-ready': { label: 'Agent Ready', color: '#06b6d4', style: 'flat' },
};

const ROUTES = {
  '/badge-list': serveBadgeList,
  '/api/badges': serveBadgeJSON,
  '/badge': serveBadgeSVGRouter,
};

function serveBadgeList(req, res) {
  const html = fs.readFileSync(path.join(CONTENT_DIR, 'badge-list.html'), 'utf-8');
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
}

function serveBadgeJSON(req, res) {
  const list = Object.entries(BADGES).map(([id, badge]) => ({
    id,
    ...badge,
    url: `https://automation.songheng.vip/badge/${id}.svg`,
    embed: `<img src="https://automation.songheng.vip/badge/${id}.svg" alt="${badge.label}" />`
  }));
  res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(list, null, 2));
}

function serveBadgeSVGRouter(req, res, parsedUrl) {
  // Match /badge/:name.svg or /badge/:name?message=...
  const match = parsedUrl.pathname.match(/^\/badge\/([a-zA-Z0-9_-]+)(\.svg)?$/);
  if (!match) return false;
  
  const badgeName = match[1];
  const badge = BADGES[badgeName];
  if (!badge) return false;
  
  const url = new URL(req.url, 'http://localhost');
  const message = url.searchParams.get('message') || '';
  
  const svg = generateBadgeSVG(badge.label, badge.color, message);
  
  res.writeHead(200, {
    'Content-Type': 'image/svg+xml',
    'Cache-Control': 'no-cache, max-age=300',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(svg);
  return true;
}

function handleRoute(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const pathname = url.pathname;
  
  if (pathname === '/badge-list') { serveBadgeList(req, res); return true; }
  if (pathname === '/api/badges') { serveBadgeJSON(req, res); return true; }
  if (pathname.startsWith('/badge/')) { return serveBadgeSVGRouter(req, res, url); }
  
  return false;
}

function generateBadgeSVG(label, color, message) {
  const labelWidth = label.length * 8 + 16;
  const msgWidth = message ? message.length * 8 + 16 : 0;
  const totalWidth = labelWidth + msgWidth + 2;
  const msgColor = '#4a5568';
  
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20" viewBox="0 0 ${totalWidth} 20">
  <defs>
    <linearGradient id="s" x2="0" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity=".1"/>
      <stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
    <clipPath id="r">
      <rect width="${totalWidth}" height="20" rx="3" fill="#fff"/>
    </clipPath>
  </defs>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="20" fill="#555"/>
    <rect x="${labelWidth}" width="${msgWidth || labelWidth}" height="20" fill="${color}"/>
    <rect width="${totalWidth}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">
    <text x="${labelWidth/2}" y="15" fill="#010101" fill-opacity=".3">${label}</text>
    <text x="${labelWidth/2}" y="14">${label}</text>
    ${message ? `<text x="${labelWidth + msgWidth/2}" y="15" fill="#010101" fill-opacity=".3">${message}</text>
    <text x="${labelWidth + msgWidth/2}" y="14">${message}</text>` : `<text x="${labelWidth + labelWidth/2}" y="15" fill="#010101" fill-opacity=".3">${label}</text>
    <text x="${labelWidth + labelWidth/2}" y="14">${label}</text>`}
  </g>
</svg>`;
}

module.exports = { handleRoute, BADGES, generateBadgeSVG, ROUTES };
console.log('[badge-integration] Loaded — /badge/:name, /badge-list, /api/badges');
