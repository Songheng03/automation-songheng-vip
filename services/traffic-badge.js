// Traffic badge service - generates embeddable SVG badges with backlinks
// Others embed <img src="https://automation.songheng.vip/badge/status.svg">
// or our fancy "AI Powered" badge to drive referral traffic
const http = require('http');

const BADGES = {
  'ai-powered': {
    label: 'AI Powered',
    message: 'my-automaton',
    color: '#238636',
    labelColor: '#21262d'
  },
  'code-review': {
    label: 'Code Review',
    message: 'by AI',
    color: '#58a6ff',
    labelColor: '#21262d'
  },
  'api-status': {
    label: 'API',
    message: 'online',
    color: '#2ea043',
    labelColor: '#21262d'
  }
};

function generateBadgeSVG(badge, liveMessage) {
  const msg = liveMessage || badge.message;
  const labelWidth = badge.label.length * 7 + 12;
  const msgWidth = msg.length * 7 + 12;
  const totalWidth = labelWidth + msgWidth;
  
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20" role="img" aria-label="${badge.label}: ${msg}">
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r"><rect width="${totalWidth}" height="20" rx="3" fill="#fff"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="20" fill="${badge.labelColor}"/>
    <rect x="${labelWidth}" width="${msgWidth}" height="20" fill="${badge.color}"/>
    <rect width="${totalWidth}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" font-family="Verdana,Geneva,sans-serif" font-size="11">
    <text x="${labelWidth / 2}" y="15" fill="#010101" fill-opacity=".3" text-anchor="middle">${badge.label}</text>
    <text x="${labelWidth / 2}" y="14" text-anchor="middle">${badge.label}</text>
    <text x="${labelWidth + msgWidth / 2}" y="15" fill="#010101" fill-opacity=".3" text-anchor="middle">${msg}</text>
    <text x="${labelWidth + msgWidth / 2}" y="14" text-anchor="middle">${msg}</text>
  </g>
</svg>`;
}

function handleRequest(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const path = url.pathname;
  const parts = path.split('/').filter(Boolean);
  
  // /badge/ai-powered → shows badge
  // /badge/ai-powered?message=custom
  if (parts[0] === 'badge' && parts[1]) {
    const badgeKey = parts[1].replace('.svg', '');
    const badge = BADGES[badgeKey];
    if (!badge) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Badge not found');
      return;
    }
    const liveMsg = url.searchParams.get('message') || null;
    const svg = generateBadgeSVG(badge, liveMsg);
    res.writeHead(200, {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'no-cache, max-age=300',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(svg);
    return;
  }
  
  // /badge-list → HTML page showing all badges with embed code
  if (path === '/badge-list' || path === '/badges') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<!DOCTYPE html>
<html><head><title>Badges - my-automaton</title>
<meta name="description" content="Embeddable SVG badges for your README or website">
<style>body{font-family:system-ui;background:#0d1117;color:#c9d1d9;max-width:800px;margin:2rem auto;padding:1rem}
.badge-card{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:1.5rem;margin:1rem 0}
code{background:#21262d;padding:2px 6px;border-radius:4px;font-size:.9rem;word-break:break-all}
h1{color:#58a6ff}img{margin:.5rem 0}</style></head>
<body>
<h1>🔖 Embeddable Badges</h1>
<p>Add these to your README or website to show AI-powered integration.</p>
${Object.entries(BADGES).map(([key, badge]) => `
<div class="badge-card">
  <h3>${badge.label}</h3>
  ${generateBadgeSVG(badge)}
  <p><strong>Markdown:</strong></p>
  <code>[![${badge.label}](https://automation.songheng.vip/badge/${key}.svg)](https://automation.songheng.vip)</code>
  <p><strong>HTML:</strong></p>
  <code>&lt;a href="https://automation.songheng.vip"&gt;&lt;img src="https://automation.songheng.vip/badge/${key}.svg" alt="${badge.label}"&gt;&lt;/a&gt;</code>
</div>`).join('\n')}
</body></html>`);
    return;
  }
  
  res.writeHead(404);
  res.end('Not found');
}

// Create server but only if not already handled by gateway
// This exports route handlers for gateway integration
module.exports = {
  routes: [
    { method: 'GET', path: '/badge/:name', handler: (req, res, params) => {
      const badgeKey = params.name.replace('.svg', '');
      const badge = BADGES[badgeKey];
      if (!badge) { res.writeHead(404); res.end('Not found'); return; }
      const liveMsg = new URL(req.url, 'http://localhost').searchParams.get('message') || null;
      const svg = generateBadgeSVG(badge, liveMsg);
      res.writeHead(200, { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'no-cache, max-age=300', 'Access-Control-Allow-Origin': '*' });
      res.end(svg);
    }},
    { method: 'GET', path: '/badges', handler: (req, res) => {
      // redirect to the badge list page
      res.writeHead(302, { 'Location': '/badge-list' });
      res.end();
    }}
  ],
  BADGES,
  generateBadgeSVG
};
