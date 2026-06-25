#!/usr/bin/env node
// fix-routes.js — Ensure API routes come BEFORE static file serving
const fs = require('fs');
const gp = '/root/automaton/gateway.js';
let code = fs.readFileSync(gp, 'utf8');

// The problem: the request handler serves static files BEFORE checking routes.
// We need to move route checks before the file serving logic.

// Find where routes start and where file serving starts
const routeStart = code.indexOf('  // === Health & status');
const fileServeStart = code.indexOf('  const filePath = p ===');

if (routeStart === -1 || fileServeStart === -1) {
  console.log('Cannot find route or file serve markers');
  process.exit(1);
}

// Extract the route block and file serve block
// Routes go from routeStart to the point before file serve
// Actually, we need to restructure: routes should be checked first

// Simpler approach: Add an early return for known API routes before file serving
const apiRoutes = `
  // === API ROUTES (checked before file serving) ===
  if (sitemapService.matches(p)) { return sitemapService.handleAPI(req, res); }
  if (healthService.matches(p)) { return healthService.handleAPI(req, res); }
  if (seoPinger.matches(p)) { return seoPinger.handleAPI(req, res); }
  if (analytics.matches(p)) { return analytics.handleAPI(req, res); }
`;

// Insert API routes right after the 'createServer' callback starts, before file serving
code = code.replace(
  '  const filePath = p === ',
  apiRoutes + '\n  const filePath = p === '
);

// Remove duplicate route checks found later in the file
// Remove the standalone health check line
code = code.replace(/  if \(healthService\.matches\(p\)\) \{ return healthService\.handleAPI\(req, res\); \}\n/, '');
// Remove the standalone sitemap check line  
code = code.replace(/  if \(sitemapService\.matches\(p\)\) \{ return sitemapService\.handleAPI\(req, res\); \}\n/, '');

// Also ensure sitemap require is there (inject-sitemap should have added it)
if (!code.includes('sitemapService')) {
  code = code.replace(
    "const healthService = require('/root/services/health-service.js');",
    "const healthService = require('/root/services/health-service.js');\nconst sitemapService = require('/root/services/sitemap-service.js');"
  );
}

// Fix the /referral route — add before file serving via the apiRoutes block won't catch it
// We need to handle it in the file path logic
code = code.replace(
  "const filePath = p === '/' ? path.join(ROOT, 'index.html') : ",
  "const filePath = /* referral alias */ p === '/referral' ? path.join(ROOT, 'referral.html') : p === '/' ? path.join(ROOT, 'index.html') : "
);

// Ensure analytics/seo requires are also present
if (!code.includes("const analytics")) code = code.replace("const sitemapService", "const analytics = require('/root/automaton/analytics.js');\nconst sitemapService");
if (!code.includes("const seoPinger")) code = code.replace("const seoPinger", "const seoPinger = require('/root/services/seo-pinger.js');\nconst seoPinger");

fs.writeFileSync(gp, code);

try {
  require('child_process').execSync('node --check ' + gp, { stdio: 'pipe' });
  console.log('✓ Routes fixed — API routes now before file serving');
  process.exit(0);
} catch(e) {
  console.error('✗ Syntax error:', e.stderr.toString());
  process.exit(1);
}
