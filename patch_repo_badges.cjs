const fs = require('fs');
let c = fs.readFileSync('gateway.js','utf8');

// 1. Add require at top
if (!c.includes("const repoBadges = require('./services/repo-badges')")) {
  c = c.replace(
    "const autoPaywall = require('./services/auto-paywall');",
    "const autoPaywall = require('./services/auto-paywall');\nconst repoBadges = require('./services/repo-badges');"
  );
}

// 2. Add route handler for repo-badges in the main request handler
// Find the serveStatic function or the main request dispatch area
if (!c.includes('repoBadges.handleBadge')) {
  // Insert badge route before the static file handler section
  const badgeRoute = `
  // === REPO BADGE SERVICE (free, no auth) ===
  if (parsedUrl.pathname.startsWith('/repo-badge/')) {
    const result = await repoBadges.handleBadge(parsedUrl.pathname + (parsedUrl.search || ''));
    res.writeHead(result.status, { 'Content-Type': result.type === 'svg' ? 'image/svg+xml' : 'text/plain', 'Cache-Control': 'public, max-age=300', 'Access-Control-Allow-Origin': '*' });
    res.end(result.body);
    return;
  }
`;
  // Insert after the main routing block, before fallback to static files
  c = c.replace(
    "// Static file handler - serve from /root/automaton/content/",
    badgeRoute + "\n  // Static file handler - serve from /root/automaton/content/"
  );
}

fs.writeFileSync('gateway.js', c);
console.log('Badge route patched into gateway.js');
