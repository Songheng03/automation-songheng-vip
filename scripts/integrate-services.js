#!/usr/bin/env node
// integrate-services.js — Bakes seo-pinger + content-syndicator into gateway
// Run: node integrate-services.js && pkill -f "node gateway" ; sleep 1 && node gateway.js
const fs = require('fs');
const gp = '/root/automaton/gateway.js';
let code = fs.readFileSync(gp, 'utf8');

// Backup
fs.copyFileSync(gp, gp + '.bak2');

// 1. Add requires (if not already present)
if (!code.includes('seoPinger')) {
  code = code.replace(
    "const analytics = require('/root/automaton/analytics.js');",
    "const analytics = require('/root/automaton/analytics.js');\nconst seoPinger = require('/root/services/seo-pinger.js');\nconst syndicator = require('/root/services/content-syndicator.js');"
  );
}

// 2. Add route handlers — insert before analytics route
const routeBlock = `  // === SEO + Syndication routes (before analytics catch-all) ===
  if (seoPinger.matches(p)) { return seoPinger.handleAPI(req, res); }
  if (syndicator.matches(p)) { return syndicator.handleAPI(req, res); }
  
  `;

// Find analytics match and insert before it
if (!code.includes('seoPinger.matches(p)')) {
  code = code.replace(
    "if (analytics.matches(p))",
    routeBlock + "if (analytics.matches(p))"
  );
}

// 3. Add auto-start — find server.listen and add after it
if (!code.includes('seoPinger.start()')) {
  code = code.replace(
    "server.listen(PORT, () => {",
    "seoPinger.start();\nserver.listen(PORT, () => {"
  );
}

fs.writeFileSync(gp, code);

// Verify syntax
const { execSync } = require('child_process');
try {
  execSync('node --check ' + gp, { stdio: 'pipe' });
  console.log('✓ Syntax OK — All services integrated');
  
  // Show what was added
  console.log('Services:');
  console.log('  /api/seo/ping        — Trigger search engine pings');
  console.log('  /api/seo/status      — SEO pinger status');
  console.log('  /api/syndicate        — Syndicate all articles');
  console.log('  /api/syndicate/status — Syndicator status');
} catch (e) {
  console.error('✗ Syntax error:', e.stderr.toString());
  fs.copyFileSync(gp + '.bak2', gp);
  console.log('Reverted');
  process.exit(1);
}
