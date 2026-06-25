#!/usr/bin/env node
// add-revenue-route.js — Inserts revenueService require and route into gateway.js
// Run once: node /root/automaton/scripts/add-revenue-route.js
const fs = require('fs');
const gp = '/root/automaton/gateway.js';
let code = fs.readFileSync(gp, 'utf8');

// 1. Add revenueService require after sitemapService
code = code.replace(
  /const sitemapService = require\('\/root\/services\/sitemap-service\.js'\);/,
  `const sitemapService = require('/root/services/sitemap-service.js');
const revenueService = require('/root/services/revenue-service.js');`
);

// 2. Add revenueService route check after existing early route checks
code = code.replace(
  /if \(conversionFunnel\.matches\(p\)\) \{ return conversionFunnel\.handleAPI\(req, res\); \}/,
  `if (conversionFunnel.matches(p)) { return conversionFunnel.handleAPI(req, res); }
  if (revenueService.matches(p)) { return revenueService.handleAPI(req, res); }`
);

// 3. Clean up any botched sed lines (lines that have weird dangling syntax)
const lines = code.split('\n');
const cleanLines = lines.filter(l => {
  const trimmed = l.trim();
  // Remove orphaned single lines
  if (trimmed === ') {') return false;
  if (trimmed === '}') return false;
  return true;
});
code = cleanLines.join('\n');

fs.writeFileSync(gp, code);

// Validate
const { execSync } = require('child_process');
try {
  execSync('node --check ' + gp, { stdio: 'pipe', encoding: 'utf8' });
  console.log('✓ SYNTAX OK');
  process.exit(0);
} catch(e) {
  console.error('✗', e.stderr?.toString()?.substring(0,300));
  process.exit(1);
}
