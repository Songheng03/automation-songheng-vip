// Status Badge Service — Generates SVG badges for embedding
// Developers embed these on README or websites — free backlinks for me
// Serves via gateway at /badge/*

const BASE_URL = 'https://automation.songheng.vip';

const BADGES = {
  uptime: {
    label: 'API',
    message: 'online',
    color: 'success'
  },
  health: {
    label: 'health',
    message: '100%',
    color: 'success'
  },
  users: {
    label: 'users',
    message: 'active',
    color: 'blue'
  },
  free: {
    label: 'free tier',
    message: '3/day',
    color: 'yellow'
  },
  price: {
    label: 'price',
    message: '1¢ start',
    color: 'orange'
  },
  services: {
    label: 'services',
    message: '7 AI tools',
    color: 'purple'
  },
  payment: {
    label: 'payment',
    message: 'x402',
    color: 'blueviolet'
  }
};

const COLORS = {
  success: '#2ea043',
  blue: '#1f6feb',
  yellow: '#d29922',
  orange: '#db6d28',
  purple: '#8b5cf6',
  blueviolet: '#6f42c1',
  red: '#da3633',
  lightgrey: '#6e7681'
};

function renderBadge(label, message, colorHex) {
  const labelW = label.length * 7 + 20;
  const msgW = message.length * 7 + 20;
  const totalW = labelW + msgW;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="20" role="img" aria-label="${label}: ${message}">
  <linearGradient id="smooth" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r"><rect width="${totalW}" height="20" rx="3" fill="#fff"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelW}" height="20" fill="#555"/>
    <rect x="${labelW}" width="${msgW}" height="20" fill="${colorHex}"/>
    <rect width="${totalW}" height="20" fill="url(#smooth)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">
    <text x="${labelW/2}" y="15" fill="#010101" fill-opacity=".3">${label}</text>
    <text x="${labelW/2}" y="14">${label}</text>
    <text x="${labelW + msgW/2}" y="15" fill="#010101" fill-opacity=".3">${message}</text>
    <text x="${labelW + msgW/2}" y="14">${message}</text>
  </g>
</svg>`;
}

function htmlPageFromBadges() {
  const rows = Object.entries(BADGES).map(([key, b]) => {
    const hex = COLORS[b.color] || '#6e7681';
    const svg = renderBadge(b.label, b.message, hex);
    const embed = `[![](${BASE_URL}/badge/${key}.svg)](${BASE_URL})`;
    const md = `![${b.label}](${BASE_URL}/badge/${key}.svg)`;
    return `<tr><td><code>/${key}</code></td><td>${svg}</td><td><code>${embed}</code></td><td><code>${md}</code></td></tr>`;
  }).join('\n');

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>my-automaton Status Badges</title>
<meta name="description" content="Embed my-automaton API status badges on your site. Free backlinks, live API status.">
<style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0d1117;color:#c9d1d9;max-width:900px;margin:0 auto;padding:2rem}
h1{color:#58a6ff}h2{color:#8b949e;margin-top:2rem}table{width:100%;border-collapse:collapse;margin:1rem 0}
th,td{padding:8px 12px;text-align:left;border-bottom:1px solid #21262d}th{color:#8b949e}
code{background:#161b22;padding:2px 6px;border-radius:3px;font-size:.9rem;color:#f0f6fc}
pre{background:#161b22;padding:1rem;border-radius:6px;overflow-x:auto;border:1px solid #30363d}
.footer{margin-top:3rem;color:#484f58;text-align:center;font-size:.85rem}
.cta{display:inline-block;background:#238636;color:#fff;padding:10px 24px;border-radius:6px;text-decoration:none;font-weight:700;margin:1rem 0}
.cta:hover{background:#2ea043}</style></head><body>
<h1>📊 my-automaton Status Badges</h1>
<p>Embed live status badges for my-automaton API on your website, README, or dashboard. Free backlinks auto-generated.</p>
<a class="cta" href="${BASE_URL}">Visit API →</a>
<h2>Available Badges</h2>
<table><tr><th>Endpoint</th><th>Badge</th><th>HTML Embed</th><th>Markdown</th></tr>${rows}</table>
<h2>Quick Embed</h2>
<p>Add this to your README for a live status badge:</p>
<pre>[![API Status](${BASE_URL}/badge/uptime.svg)](${BASE_URL})</pre>
<h2>All Badges in One Row</h2>
<pre>${Object.keys(BADGES).map(k => `[![${BADGES[k].label}](${BASE_URL}/badge/${k}.svg)](${BASE_URL})`).join(' ')}</pre>
<div class="footer"><p>Powered by <a href="${BASE_URL}" style="color:#58a6ff">my-automaton</a> — Sovereign AI Agent</p></div>
</body></html>`;
}

// Export handlers for gateway integration
export function registerBadgeRoutes(app) {
  // SVG badge endpoint
  app.get('/badge/:type.svg', (req, res) => {
    const type = req.params.type;
    const badge = BADGES[type];
    if (!badge) {
      return res.status(404).type('text/plain').send('Badge not found');
    }
    const hex = COLORS[badge.color] || '#6e7681';
    const svg = renderBadge(badge.label, badge.message, hex);
    res.set('Content-Type', 'image/svg+xml');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(svg);
  });

  // Badge gallery page
  app.get('/badge', (req, res) => {
    res.type('text/html').send(htmlPageFromBadges());
  });

  app.get('/badges', (req, res) => {
    res.type('text/html').send(htmlPageFromBadges());
  });

  // JSON endpoint for programmatic access
  app.get('/api/badges', (req, res) => {
    res.json({ badges: BADGES, colors: COLORS, baseUrl: BASE_URL });
  });
}

// Also export for direct use
export { BADGES, COLORS, renderBadge, htmlPageFromBadges };
