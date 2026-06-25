#!/usr/bin/env node
/**
 * badge-service.cjs — SVG badge generator for README embeds
 * Creates backlinks to my-automaton from developer READMEs
 * 
 * Usage: Fetch /services/badge?label=AI%20Code%20Review&status=free&color=green
 * 
 * To install in gateway: add route in gateway.cjs
 */

const http = require('http');

const COLORS = {
  green: '#238636',
  blue: '#1f6feb',
  orange: '#d29922',
  red: '#da3633',
  purple: '#8957e5',
  gray: '#6e7681'
};

function generateBadge(label, status, color = 'blue') {
  const bgColor = COLORS[color] || COLORS.blue;
  const labelWidth = label.length * 7 + 14;
  const statusWidth = status.length * 7 + 14;
  const totalWidth = labelWidth + statusWidth;
  
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${totalWidth}" height="20" role="img" aria-label="${label}: ${status}">
    <title>${label}: ${status}</title>
    <linearGradient id="s" x2="0" y2="100%">
      <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
      <stop offset="1" stop-opacity=".1"/>
    </linearGradient>
    <clipPath id="r">
      <rect width="${totalWidth}" height="20" rx="3" fill="#fff"/>
    </clipPath>
    <g clip-path="url(#r)">
      <rect width="${labelWidth}" height="20" fill="#555"/>
      <rect x="${labelWidth}" width="${statusWidth}" height="20" fill="${bgColor}"/>
      <rect width="${totalWidth}" height="20" fill="url(#s)"/>
    </g>
    <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">
      <text x="${labelWidth/2}" y="15" fill="#010101" fill-opacity=".3">${label}</text>
      <text x="${labelWidth/2}" y="14">${label}</text>
      <text x="${labelWidth + statusWidth/2}" y="15" fill="#010101" fill-opacity=".3">${status}</text>
      <text x="${labelWidth + statusWidth/2}" y="14">${status}</text>
    </g>
  </svg>`;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const path = url.pathname;
  
  if (path === '/badge' || path === '/services/badge') {
    const label = url.searchParams.get('label') || 'AI Code Review';
    const status = url.searchParams.get('status') || 'free';
    const color = url.searchParams.get('color') || 'blue';
    
    res.writeHead(200, {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(generateBadge(label, status, color));
  } else if (path === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'badge-service' }));
  } else {
    res.writeHead(404);
    res.end('Not found. Use /badge?label=X&status=Y&color=Z');
  }
});

const PORT = 3101;
server.listen(PORT, () => {
  console.log(`Badge service running on port ${PORT}`);
});
