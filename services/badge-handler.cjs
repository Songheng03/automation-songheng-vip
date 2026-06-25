// badge-handler.cjs — Badge generator page + dynamic SVG badge endpoint
// Serves: /badge-generator.html, /badge/:label-:message-:color.svg
const fs = require('fs');
const path = require('path');

const CONTENT_DIR = '/root/automaton/content';

function handleRoute(reqUrl, res) {
  const url = new URL(reqUrl, 'http://localhost');

  // Serve the badge generator page
  if (url.pathname === '/badge-generator.html' || url.pathname === '/badge-generator') {
    const pagePath = path.join(CONTENT_DIR, 'badge-generator.html');
    try {
      if (!fs.existsSync(pagePath)) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Badge generator page not found');
        return true;
      }
      const content = fs.readFileSync(pagePath, 'utf-8');
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600'
      });
      res.end(content);
      return true;
    } catch(e) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Error loading badge generator');
      return true;
    }
  }

  // Serve dynamic SVG badge: /badge/ai-review-my-automaton-667eea.svg
  const badgeMatch = url.pathname.match(/^\/badge\/([^-]+)-(.+?)\.svg$/);
  if (badgeMatch) {
    const label = badgeMatch[1].replace(/-/g, ' ');
    const rest = badgeMatch[2];
    // Extract color from end of string (hex color, last 6 chars or named color)
    const colorMatch = rest.match(/^(.+)-([a-f0-9]{6}|[a-z]+)$/i);
    let message = rest;
    let color = '667eea';
    if (colorMatch) {
      message = colorMatch[1].replace(/-/g, ' ');
      color = colorMatch[2];
    }

    const svg = generateBadge(label, message, color, 'flat');
    res.writeHead(200, {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=86400',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(svg);
    return true;
  }

  return false;
}

function generateBadge(label, message, color, style) {
  // Shield-style dynamic SVG badge
  const lw = label.length * 7 + 20;
  const mw = message.length * 7 + 20;
  const tw = lw + mw;

  // Parse color
  const colors = {
    'brightgreen': '4c1', 'green': '97ca00', 'yellow': 'dfb317',
    'yellowgreen': 'a4a61d', 'orange': 'fe7d37', 'red': 'e05d44',
    'blue': '007ec6', 'grey': '555', 'gray': '555', 'lightgrey': '9f9f9f',
    'lightgray': '9f9f9f', '667eea': '667eea', '764ba2': '764ba2',
    '22c55e': '22c55e', 'e74c3c': 'e74c3c', 'f59e0b': 'f59e0b',
    '3b82f6': '3b82f6', 'ef4444': 'ef4444', '8b5cf6': '8b5cf6',
    '06b6d4': '06b6d4', '14b8a6': '14b8a6'
  };
  const bgColor = colors[color] || color || '667eea';

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${tw}" height="20" role="img" aria-label="${label}: ${message}">
  <title>${label}: ${message}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r">
    <rect width="${tw}" height="20" rx="3" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="${lw}" height="20" fill="#555"/>
    <rect x="${lw}" width="${mw}" height="20" fill="#${bgColor}"/>
    <rect width="${tw}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">
    <text x="${Math.round(lw/2)}" y="15" fill="#010101" fill-opacity=".3">${escapeXml(label)}</text>
    <text x="${Math.round(lw/2)}" y="14">${escapeXml(label)}</text>
    <text x="${Math.round(lw + mw/2)}" y="15" fill="#010101" fill-opacity=".3">${escapeXml(message)}</text>
    <text x="${Math.round(lw + mw/2)}" y="14">${escapeXml(message)}</text>
  </g>
</svg>`;
}

function escapeXml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

module.exports = { handleRoute };
