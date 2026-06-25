#!/usr/bin/env node
const fs = require('fs');
const gp = '/root/automaton/gateway.js';
let code = fs.readFileSync(gp, 'utf8');

// Add sitemapService require
if (!code.includes('sitemapService')) {
  code = code.replace(
    "const healthService = require('/root/services/health-service.js');",
    "const healthService = require('/root/services/health-service.js');\nconst sitemapService = require('/root/services/sitemap-service.js');"
  );
}

// Find createServer and add route check right after the callback opens
const target = 'const server = http.createServer((req, res) => {';
const insertion = `const server = http.createServer((req, res) => {
  // === API ROUTE CHECK (MUST be before file serving) ===
  const p = new URL(req.url, 'http://localhost').pathname;
  if (sitemapService.matches(p)) { return sitemapService.handleAPI(req, res); }
  if (healthService.matches(p)) { return healthService.handleAPI(req, res); }
  if (typeof seoPinger !== 'undefined' && seoPinger.matches(p)) { return seoPinger.handleAPI(req, res); }
  if (typeof analytics !== 'undefined' && analytics.matches && analytics.matches(p)) { return analytics.handleAPI(req, res); }
  // Handle common aliases
  if (p === '/referral') { return serveFile(res, path.join(ROOT, 'referral.html'), '.html'); }
`;

// Replace createServer line with our early-check version
code = code.replace(target, insertion);

// Now find and remove the old URL parsing line (since we now do it at top)
// The old line looks like: '  var p = new URL(req.url, ...'
code = code.replace("  var p = new URL('http://localhost' + req.url).pathname;", "");
code = code.replace("  const p = new URL(req.url, 'http://localhost').pathname;", "");

// Remove the duplicate matched route checks that are after file serving
// These are the lines that duplicate our early checks
code = code.replace(/  if \(healthService\.matches\(p\)\) \{ return healthService\.handleAPI\(req, res\); \}/g, '');
code = code.replace(/  if \(sitemapService\.matches\(p\)\) \{ return sitemapService\.handleAPI\(req, res\); \}/g, '');
code = code.replace(/  if \(seoPinger\.matches\(p\)\) \{ return seoPinger\.handleAPI\(req, res\); \}/g, '');
code = code.replace(/  if \(analytics\.matches\(p\)\) \{ return analytics\.handleAPI\(req, res\); \}/g, '');
code = code.replace(/  if \(analytics && analytics\.matches\(p\)\) \{ return analytics\.handleAPI\(req, res\); \}/g, '');

// Fix the referral alias in the filePath
code = code.replace(
  /const filePath = p === '\/' \? path\.join\(ROOT, 'index\.html'\) :.*?(?=\n)/,
  "const filePath = p === '/' ? path.join(ROOT, 'index.html') : (p === '/referral' || p.startsWith('/referral/')) ? path.join(ROOT, 'referral.html') : path.join(ROOT, p)"
);

fs.writeFileSync(gp, code);
try {
  require('child_process').execSync('node --check ' + gp, { stdio: 'pipe' });
  console.log('✓ Gateway fixed — API routes checked before file serving');
} catch(e) {
  console.error('✗ Syntax error:', e.stderr.toString());
  process.exit(1);
}
