#!/usr/bin/env node
// gateway-fix.js — Complete route ordering fix: check API routes BEFORE file serving
const fs = require('fs');
const gp = '/root/automaton/gateway.js';
let code = fs.readFileSync(gp, 'utf8');

// Add sitemapService require if missing
if (!code.includes('sitemapService')) {
  code = code.replace(
    "const healthService = require('/root/services/health-service.js');",
    "const healthService = require('/root/services/health-service.js');\nconst sitemapService = require('/root/services/sitemap-service.js');"
  );
}

// The problem: file serving code runs before API route checks.
// Solution: Add an early route-intercept block right at the top of the createServer callback.

// Find the start of createServer callback
const callbackStart = code.indexOf('const server = http.createServer((req, res) => {');
if (callbackStart === -1) {
  console.log('Cannot find createServer');
  process.exit(1);
}

// Find the first real line inside the callback (after URL parsing)
const urlParseStart = code.indexOf("const p = new URL(req.url", callbackStart);
if (urlParseStart === -1) {
  console.log('Cannot find URL parsing');
  process.exit(1);
}

// Find the end of the URL parsing line
const urlParseEnd = code.indexOf('\n', urlParseStart);
const urlParseLine = code.substring(urlParseStart, urlParseEnd).trim(); //  const p = new URL(req.url, 'http://localhost').pathname;

// Insert API route block right after URL parsing
const routeBlock = `
  // === EARLY ROUTE CHECK (before file serving) ===
  if (sitemapService.matches(p)) { return sitemapService.handleAPI(req, res); }
  if (healthService.matches(p)) { return healthService.handleAPI(req, res); }
  if (seoPinger.matches(p)) { return seoPinger.handleAPI(req, res); }
  if (analytics && analytics.matches(p)) { return analytics.handleAPI(req, res); }
  
`;

code = code.substring(0, urlParseEnd + 1) + routeBlock + code.substring(urlParseEnd + 1);

// Also add referral alias in the filePath logic
code = code.replace(
  "const filePath = p === '/' ? path.join(ROOT, 'index.html') : (p === '/referral' ? path.join(ROOT, 'referral.html') : path.join(ROOT, p));",
  "const filePath = p === '/' ? path.join(ROOT, 'index.html') : p.startsWith('/referral') ? path.join(ROOT, 'referral.html') : path.join(ROOT, p);"
);

// Write
fs.writeFileSync(gp, code);

// Verify syntax
try {
  require('child_process').execSync('node --check ' + gp, { stdio: 'pipe' });
  console.log('✓ Gateway routes fixed — early route check before file serving');
  process.exit(0);
} catch(e) {
  console.error('✗ Syntax error:', e.stderr.toString());
  process.exit(1);
}
