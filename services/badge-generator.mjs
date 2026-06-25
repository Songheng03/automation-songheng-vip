#!/usr/bin/env node
/**
 * Badge Generator — Port 3065
 * Free service: Generate SVG badges for agents, services, and projects
 */
import http from 'http';

const PORT = 3065;

function generateBadge(label, value, color = '00d4ff', style = 'flat') {
  const lw = label.length * 7 + 20;
  const vw = value.length * 7 + 20;
  const tw = lw + vw;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${tw}" height="20">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#555;stop-opacity:1"/>
      <stop offset="100%" style="stop-color:#333;stop-opacity:1"/>
    </linearGradient>
    <linearGradient id="fg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#${color};stop-opacity:1"/>
      <stop offset="100%" style="stop-color:#${color}aa;stop-opacity:1"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="${lw}" height="20" fill="url(#bg)" rx="${style === 'flat' ? '3' : '0'}" ${style === 'flat-square' ? 'rx="0"' : ''}/>
  <rect x="${lw}" y="0" width="${vw}" height="20" fill="url(#fg)" rx="${style === 'flat' ? '3' : '0'}" ${style === 'flat-square' ? 'rx="0"' : ''}/>
  <rect x="${lw}" y="0" width="${vw}" height="20" fill="url(#fg)"/>
  <text x="${lw / 2}" y="14" text-anchor="middle" fill="#fff" font-size="11" font-family="DejaVu Sans,Verdana,sans-serif">${escapeXml(label)}</text>
  <text x="${lw + vw / 2}" y="14" text-anchor="middle" fill="#fff" font-size="11" font-family="DejaVu Sans,Verdana,sans-serif">${escapeXml(value)}</text>
</svg>`;
  return svg;
}

function escapeXml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Simple badges: /badge/label-value-color
  const match = url.pathname.match(/^\/badge\/([^/-]+)-([^/-]+)(?:-(.+))?$/);
  if (match) {
    const [, label, value, color] = match;
    const svg = generateBadge(label, value, color || '00d4ff');
    res.writeHead(200, {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=3600'
    });
    return res.end(svg);
  }

  // Agent badge: /badge/agent
  if (url.pathname === '/badge/agent') {
    return res.end(generateBadge('agent', 'my-automaton', '7b2ff7'));
  }
  if (url.pathname === '/badge/status') {
    return res.end(generateBadge('status', 'active', '50fa7b'));
  }
  if (url.pathname === '/badge/x402') {
    return res.end(generateBadge('x402', 'enabled', 'f093fb'));
  }

  // API endpoint
  if (url.pathname === '/api/badge' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const d = JSON.parse(body);
        res.writeHead(200, {'Content-Type': 'image/svg+xml'});
        res.end(generateBadge(d.label, d.value, d.color, d.style));
      } catch {
        res.writeHead(400);
        res.end(JSON.stringify({error: 'invalid'}));
      }
    });
    return;
  }

  // Homepage
  res.writeHead(200, {'Content-Type': 'text/html'});
  res.end(`<h1>Badge Generator</h1>
<p>Usage: <code>/badge/label-value-color</code></p>
<p>Examples:</p>
<ul>
  <li><img src="/badge/agent-my-automaton-7b2ff7" alt="agent badge"/></li>
  <li><img src="/badge/status-active-50fa7b" alt="status badge"/></li>
  <li><img src="/badge/x402-enabled-f093fb" alt="x402 badge"/></li>
  <li><img src="/badge/build-passing-4c1" alt="build badge"/></li>
</ul>
<p>POST /api/badge with {"label":"...","value":"...","color":"...","style":"flat|flat-square"}</p>`);
});

server.listen(PORT, () => console.log(`Badge Generator on port ${PORT}`));
