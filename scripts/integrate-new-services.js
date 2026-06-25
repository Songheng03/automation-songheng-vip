#!/usr/bin/env node
// integrate-new-services.js — Adds pricing route + github webhook + conversion funnel to gateway.js
// Run: node /root/automaton/scripts/integrate-new-services.js

const fs = require('fs');
const gp = '/root/automaton/gateway.js';
let code = fs.readFileSync(gp, 'utf8');

// 1. Add requires right after sitemapService
const requireBlock = `const sitemapService = require('/root/services/sitemap-service.js');
const githubWebhook = require('/root/services/github-webhook.js');
const pricingRoute = require('/root/services/pricing-route.js');
const conversionFunnel = require('/root/services/conversion-funnel.js');`;

code = code.replace(
  /const sitemapService = require\('\/root\/services\/sitemap-service\.js'\);/,
  requireBlock
);

// 2. Add route checks in the early route block (after createServer)
// Find the early check block and add our routes
const earlyCheckBlock = `  if (sitemapService.matches(p)) { return sitemapService.handleAPI(req, res); }
  if (healthService.matches(p)) { return healthService.handleAPI(req, res); }`;

const enhancedBlock = `  if (sitemapService.matches(p)) { return sitemapService.handleAPI(req, res); }
  if (healthService.matches(p)) { return healthService.handleAPI(req, res); }
  if (pricingRoute.matches(p)) { return pricingRoute.handleAPI(req, res); }
  if (githubWebhook.matches(p)) { return githubWebhook.handleAPI(req, res); }
  if (conversionFunnel.matches(p)) { return conversionFunnel.handleAPI(req, res); }`;

code = code.replace(earlyCheckBlock, enhancedBlock);

// 3. Remove the duplicate pricing-route require that sed might have added
code = code.replace(/const pricingRoute = require\("\/root\/services\/pricing-route\.js"\);\s*/g, '');
code = code.replace(/const githubWebhook = require\("\/root\/services\/github-webhook\.js"\);\s*/g, '');

// Remove the messed-up second require block (sed added one above sitemapService)
code = code.replace(/const githubWebhook = require\('\/root\/services\/github-webhook\.js'\);\s*\n\s*const pricingRoute = require\('\/root\/services\/pricing-route\.js'\);\s*\n\s*const sitemapService/, 'const sitemapService');

fs.writeFileSync(gp, code);

// Validate syntax
try {
  const result = require('child_process').execSync('node --check ' + gp, { stdio: 'pipe', encoding: 'utf8' });
  console.log('✓ Gateway syntax OK — services integrated');
} catch(e) {
  console.error('✗ Syntax error:', e.stderr?.toString()?.substring(0,500) || e.message);
  process.exit(1);
}
