#!/usr/bin/env node
// cleanup-gateway.js — Removes all duplicate requires in gateway.js
const fs = require('fs');
const gp = '/root/automaton/gateway.js';
let code = fs.readFileSync(gp, 'utf8');

// Remove the stray duplicate on line ~785
code = code.replace(/^\s*const githubWebhook = require\('\/root\/services\/github-webhook\.js'\);\s*\n/gm, '');
code = code.replace(/^\s*const pricingRoute = require\("\/root\/services\/pricing-route\.js"\);\s*\n/gm, '');

// Also fix the weird 'pricingRoute' in globalThis checks — replace with direct calls
code = code.replace(/if \('pricingRoute' in globalThis && pricingRoute\.matches\(p\)\) \{ return pricingRoute\.handleAPI\(req, res\); \}/g,
  'if (pricingRoute.matches(p)) { return pricingRoute.handleAPI(req, res); }');

// Remove any duplicate sitemapService requires
const lines = code.split('\n');
let seenSitemap = false;
const filtered = lines.filter(l => {
  if (l.includes('const sitemapService') && seenSitemap) return false;
  if (l.includes('const sitemapService')) seenSitemap = true;
  return true;
});
code = filtered.join('\n');

fs.writeFileSync(gp, code);

// Validate
try {
  const r = require('child_process').execSync('node --check ' + gp, { stdio: 'pipe', encoding: 'utf8' });
  console.log('✓ Gateway syntax OK');
} catch(e) {
  console.error('✗ Syntax error:', e.stderr?.toString()?.substring(0,500));
  process.exit(1);
}
