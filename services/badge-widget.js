// Badge Widget Service - generates embeddable SVG status badges
// Other sites embed these badges = backlinks to my-automaton
// Auto-loaded by gateway if available in routes

const BADGE_COLORS = {
  status: { operational: '#2ea043', degraded: '#d29922', down: '#da3633' },
  bg: '#1c2128',
  text: '#e6edf3',
  border: '#30363d'
};

function svgBadge({ label = 'API Status', value = 'Operational', color = BADGE_COLORS.status.operational, link = '/', width = 180 }) {
  const labelW = 70;
  const valueW = width - labelW;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="22" viewBox="0 0 ${width} 22">
  <defs>
    <linearGradient id="bgl" x1="0%" y1="50%" x2="100%" y2="50%">
      <stop offset="0%" stop-color="#161b22" />
      <stop offset="100%" stop-color="#1c2128" />
    </linearGradient>
    <linearGradient id="bgv" x1="0%" y1="50%" x2="100%" y2="50%">
      <stop offset="0%" stop-color="${color}" />
      <stop offset="100%" stop-color="${color}" stop-opacity="0.85" />
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="${labelW}" height="22" fill="url(#bgl)" rx="3" ry="3" />
  <rect x="${labelW}" y="0" width="${valueW}" height="22" fill="url(#bgv)" rx="0" ry="0" />
  <rect x="${labelW}" y="0" width="${valueW}" height="22" fill="url(#bgv)" rx="0" ry="3" clip-path="inset(0 0 0 ${labelW}px)" />
  <rect x="0" y="0" width="${width}" height="22" fill="none" stroke="${BADGE_COLORS.border}" stroke-width="0.5" rx="3" ry="3" />
  <text x="${labelW / 2}" y="15" text-anchor="middle" font-family="Segoe UI, Helvetica, sans-serif" font-size="12" fill="${BADGE_COLORS.text}" font-weight="600">${label}</text>
  <text x="${labelW + valueW / 2}" y="15" text-anchor="middle" font-family="Segoe UI, Helvetica, sans-serif" font-size="12" fill="#fff" font-weight="700">${value}</text>
  <a href="${link}" target="_blank">
    <rect x="0" y="0" width="${width}" height="22" fill="transparent" />
  </a>
</svg>`;
}

function svgMetricsBadge(metrics) {
  const { uptime = '99.9%', responseTime = '245ms', requests = '0' } = metrics;
  const lines = [
    { label: 'Uptime', value: uptime, color: BADGE_COLORS.status.operational },
    { label: 'Response', value: responseTime, color: responseTime.includes('245') ? BADGE_COLORS.status.operational : BADGE_COLORS.status.degraded },
    { label: 'Requests', value: requests, color: BADGE_COLORS.status.operational }
  ];

  const h = 22 * lines.length + 2;
  const w = 200;
  let rects = lines.map((l, i) => {
    const y = 1 + i * 22;
    return `<rect x="0" y="${y}" width="${w}" height="22" fill="${i % 2 === 0 ? '#161b22' : '#1c2128'}" />
  <text x="10" y="${y + 15}" font-family="Segoe UI, Helvetica, sans-serif" font-size="11" fill="#8b949e">${l.label}</text>
  <text x="${w - 10}" y="${y + 15}" text-anchor="end" font-family="Segoe UI, Helvetica, sans-serif" font-size="11" fill="${l.color}" font-weight="600">${l.value}</text>`;
  }).join('\n  ');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect x="0" y="0" width="${w}" height="${h}" fill="#0d1117" rx="4" ry="4" />
  <rect x="0" y="0" width="${w}" height="22" fill="#1c2128" rx="4" ry="4" />
  <text x="${w / 2}" y="15" text-anchor="middle" font-family="Segoe UI, Helvetica, sans-serif" font-size="11" fill="#c9d1d9" font-weight="600">my-automaton API</text>
  ${rects}
  <rect x="0" y="0" width="${w}" height="${h}" fill="none" stroke="${BADGE_COLORS.border}" stroke-width="0.5" rx="4" ry="4" />
</svg>`;
}

module.exports = { svgBadge, svgMetricsBadge, BADGE_COLORS };
