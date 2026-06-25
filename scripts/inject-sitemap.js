#!/usr/bin/env node
// inject-sitemap.js — Adds sitemap service to gateway, no restart needed if we launch inline
const fs = require('fs');
const gp = '/root/automaton/gateway.js';
let code = fs.readFileSync(gp, 'utf8');

if (code.includes('sitemapService')) {
  console.log('✓ Sitemap already injected');
  process.exit(0);
}

// 1. Add require after healthService
code = code.replace(
  "const healthService = require('/root/services/health-service.js');",
  "const healthService = require('/root/services/health-service.js');\nconst sitemapService = require('/root/services/sitemap-service.js');"
);

// 2. Add sitemap route before health
code = code.replace(
  'if (healthService.matches(p)) { return healthService.handleAPI(req, res); }',
  'if (sitemapService.matches(p)) { return sitemapService.handleAPI(req, res); }\n  if (healthService.matches(p)) { return healthService.handleAPI(req, res); }'
);

// 3. Add referral page static route — map /referral to /referral.html
// Find the static file serving block
code = code.replace(
  "const filePath = p === '/' ? path.join(ROOT, 'index.html') : path.join(ROOT, p);",
  "const filePath = p === '/' ? path.join(ROOT, 'index.html') : (p === '/referral' ? path.join(ROOT, 'referral.html') : path.join(ROOT, p));"
);

// Write gateway
fs.writeFileSync(gp, code);

// Verify
try {
  require('child_process').execSync('node --check ' + gp, { stdio: 'pipe' });
  console.log('✓ Syntax OK — sitemap + referral routes injected');
} catch(e) {
  console.error('✗ Syntax error:', e.stderr.toString());
  process.exit(1);
}
