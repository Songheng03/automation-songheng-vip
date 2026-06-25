#!/usr/bin/env node
// Inline the badge SVG generation into gateway.js, removing the import dependency
import fs from 'fs';

const gatewayJs = fs.readFileSync('/root/automaton/gateway.js', 'utf8');

// Remove the import line for repo-badges
const fixed = gatewayJs.replace(
  /import \{ handleBadge \} from '\.\/services\/repo-badges\.js';\n/,
  ''
);

// Add inline badge generator right before the handleAPI function
const badgeSvgCode = `
// ── Inline Badge SVG Generator ──
const BADGE_COLORS = {
  stars: { bg: '#e4aa42', text: '#1a1a1a' },
  forks: { bg: '#2ea44f', text: '#fff' },
  issues: { bg: '#da3633', text: '#fff' },
  license: { bg: '#6f42c1', text: '#fff' },
  size: { bg: '#0969da', text: '#fff' },
  updated: { bg: '#8250df', text: '#fff' },
  health: { bg: '#1a7f37', text: '#fff' },
};

function svgBadge(label, value, color) {
  const labelWidth = Math.max(label.length * 7 + 14, 30);
  const valueWidth = Math.max(String(value).length * 7 + 14, 30);
  const totalWidth = labelWidth + valueWidth;
  const bgColor = color.bg || color;
  const textColor = color.text || '#fff';
  return \`<svg xmlns="http://www.w3.org/2000/svg" width="\${totalWidth}" height="20" viewBox="0 0 \${totalWidth} 20">
  <rect rx="3" width="\${totalWidth}" height="20" fill="#555"/>
  <rect x="\${labelWidth}" width="\${valueWidth}" height="20" fill="\${bgColor}"/>
  <g fill="#fff" font-family="Verdana,sans-serif" font-size="11">
    <text x="\${labelWidth / 2}" y="14" text-anchor="middle" fill="#010101" fill-opacity=".3">\${label}</text>
    <text x="\${labelWidth / 2}" y="14" text-anchor="middle">\${label}</text>
    <text x="\${labelWidth + valueWidth / 2}" y="14" text-anchor="middle" fill="#010101" fill-opacity=".3">\${value}</text>
    <text x="\${labelWidth + valueWidth / 2}" y="14" text-anchor="middle" fill="\${textColor}">\${value}</text>
  </g>
</svg>\`;
}

function githubApi(path) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'api.github.com',
      path: \`/repos\${path}\`,
      headers: { 'User-Agent': 'my-automaton-badge/1.0', 'Accept': 'application/vnd.github.v3+json' },
      timeout: 5000,
    };
    const httpsMod = require('https');
    httpsMod.get(opts, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch(e) { reject(new Error('parse fail')); }
      });
    }).on('error', reject);
  });
}

async function handleBadgeInline(reqUrl) {
  const match = reqUrl.match(/^\\/repo-badge\\/([^\\/]+)\\/([^\\/]+)(?:\\/([a-z-]+))?(?:\\?.*)?$/i);
  if (!match) return { status: 400, body: 'Usage: /repo-badge/:owner/:repo/:metric', type: 'text' };
  const [, owner, repo, metric = 'stars'] = match;
  try {
    const data = await githubApi(\`/\${owner}/\${repo}\`);
    if (data.message === 'Not Found') {
      return { status: 200, body: svgBadge('repo', 'not found', {bg:'#da3633',text:'#fff'}), type: 'svg' };
    }
    const formatNum = (n) => {
      if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
      if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
      return String(n);
    };
    const metrics = {
      stars: { label: 'stars', value: formatNum(data.stargazers_count || 0), color: BADGE_COLORS.stars },
      forks: { label: 'forks', value: formatNum(data.forks_count || 0), color: BADGE_COLORS.forks },
      issues: { label: 'issues', value: formatNum(data.open_issues_count || 0), color: BADGE_COLORS.issues },
      license: { label: 'license', value: data.license ? data.license.spdx_id : 'none', color: BADGE_COLORS.license },
      size: { label: 'language', value: data.language || 'unknown', color: BADGE_COLORS.size },
      updated: { label: 'updated', value: data.pushed_at ? data.pushed_at.slice(0, 10) : 'never', color: BADGE_COLORS.updated },
      health: {
        label: 'health',
        value: data.archived ? 'archived' : (data.disabled ? 'disabled' : 'active'),
        color: (data.archived || data.disabled) ? { bg: '#da3633', text: '#fff' } : BADGE_COLORS.health
      },
    };
    const m = metrics[metric] || metrics.stars;
    return { status: 200, body: svgBadge(m.label, m.value, m.color), type: 'svg' };
  } catch (e) {
    return { status: 200, body: svgBadge('error', e.message.slice(0, 25) || 'timeout', {bg:'#da3633',text:'#fff'}), type: 'svg' };
  }
}
`;

// Insert the badge code before handleAPI
const withBadge = fixed.replace(
  'async function handleAPI(req, res) {',
  badgeSvgCode + '\n\nasync function handleAPI(req, res) {'
);

// Replace the import-based handleBadge reference with inline version
const finalCode = withBadge.replace(
  'const r = await handleBadge(url.pathname + (url.search || \'\'));',
  'const r = await handleBadgeInline(url.pathname + (url.search || \'\'));'
);

fs.writeFileSync('/root/automaton/gateway.js', finalCode, 'utf8');
console.log('OK: badge inlined into gateway.js');
