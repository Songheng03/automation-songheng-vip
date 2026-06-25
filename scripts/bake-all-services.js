#!/usr/bin/env node
// bake-all-services.js — Integrates seoPinger + syndicator + socialPromoter into gateway and writes share page
const fs = require('fs');
const gp = '/root/automaton/gateway.js';
let code = fs.readFileSync(gp, 'utf8');

// Backup
const bak = gp + '.bak3';
if (!fs.existsSync(bak)) fs.copyFileSync(gp, bak);

// 1. Add requires (if not already present)
if (!code.includes('seoPinger') && !code.includes('socialPromoter')) {
  code = code.replace(
    "const analytics = require('/root/automaton/analytics.js');",
    "const analytics = require('/root/automaton/analytics.js');\nconst seoPinger = require('/root/services/seo-pinger.js');\nconst syndicator = require('/root/services/content-syndicator.js');\nconst socialPromoter = require('/root/services/social-promoter.js');"
  );
}

// 2. Add route handlers — insert before analytics route
const routeBlock = `  // === Traffic-driving routes (SEO, syndication, social shares) ===
  if (seoPinger.matches(p)) { return seoPinger.handleAPI(req, res); }
  if (syndicator.matches(p)) { return syndicator.handleAPI(req, res); }
  if (socialPromoter.matches(p)) { return socialPromoter.handleAPI(req, res); }
  
  `;

if (!code.includes('seoPinger.matches(p)')) {
  code = code.replace(
    "if (analytics.matches(p))",
    routeBlock + "if (analytics.matches(p))"
  );
}

// 3. Auto-start seoPinger
if (!code.includes('seoPinger.start()')) {
  code = code.replace(
    "server.listen(PORT, () => {",
    "seoPinger.start();\nserver.listen(PORT, () => {"
  );
}

fs.writeFileSync(gp, code);

// Verify syntax
try {
  require('child_process').execSync('node --check ' + gp, { stdio: 'pipe' });
  console.log('✓ Syntax OK — All 3 services integrated');
  console.log('Routes added:');
  console.log('  /api/seo/ping         — Trigger search engine pings');
  console.log('  /api/seo/status       — SEO pinger status');
  console.log('  /api/syndicate        — Syndicate all articles to dev.to/Medium');
  console.log('  /api/syndicate/status — Syndicator status');
  console.log('  /share                — Social share page with 10+ share links');
  console.log('  /api/shares           — JSON list of all share links');
} catch (e) {
  console.error('✗ Syntax error:', e.stderr.toString());
  if (fs.existsSync(bak)) {
    fs.copyFileSync(bak, gp);
    console.log('Reverted to backup');
  }
  process.exit(1);
}

// Write share page to content dir
const socialPromoter = require('/root/services/social-promoter.js');
const shareHtml = socialPromoter.generateSharePage();
fs.writeFileSync('/root/automaton/content/share.html', shareHtml);
console.log('✓ /root/automaton/content/share.html written');
