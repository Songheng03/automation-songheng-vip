#!/usr/bin/env node
// patch-seo-pinger.js — Add SEO pinger routes and analytics to gateway.js
const fs = require('fs');
const gp = '/root/automaton/gateway.js';
let code = fs.readFileSync(gp, 'utf8');

// 1. Add require after analytics require (line 17 or wherever analytics is)
const requireBlock = `const analytics = require('/root/automaton/analytics.js');
const seoPinger = require('/root/services/seo-pinger.js');
`;

// Find the analytics require and replace to add seoPinger next to it
const analyticsRequire = "const analytics = require('/root/automaton/analytics.js');";
const analyticsIdx = code.indexOf(analyticsRequire);
if (analyticsIdx !== -1) {
  const endOfLine = analyticsIdx + analyticsRequire.length;
  // Check if seoPinger already exists
  if (!code.includes('seoPinger')) {
    code = code.slice(0, endOfLine) + '\n' + "const seoPinger = require('/root/services/seo-pinger.js');" + code.slice(endOfLine);
  }
}

// 2. Add SEO route handler before analytics routes (since analytics uses matches())
const analyticsMatch = "if (analytics.matches(p))";
const aIdx = code.indexOf(analyticsMatch);
if (aIdx !== -1 && !code.includes('seoPinger.matches')) {
  const seoRoute = `  // === SEO Pinger ===
  if (seoPinger.matches(p)) { return seoPinger.handleAPI(req, res); }
  
  `;
  code = code.slice(0, aIdx) + seoRoute + code.slice(aIdx);
}

// 3. Auto-start seo pinger - find where server starts listening and add seoPinger.start()
const listenPattern = "server.listen(PORT";
const lIdx = code.indexOf(listenPattern);
if (lIdx !== -1 && !code.includes('seoPinger.start()')) {
  // Find the line end
  const lineEnd = code.indexOf('\n', lIdx);
  if (lineEnd !== -1) {
    const afterListen = code.slice(0, lineEnd + 1) + "  seoPinger.start();\n" + code.slice(lineEnd + 1);
    code = afterListen;
  }
}

fs.writeFileSync(gp, code);

// Verify syntax
const { execSync } = require('child_process');
try {
  execSync('node --check ' + gp, { stdio: 'pipe' });
  console.log('✓ Syntax OK — SEO pinger + analytics integrated');
} catch (e) {
  console.error('✗ Syntax error:', e.stderr.toString());
  fs.copyFileSync(gp + '.bak', gp);
  console.log('Reverted to backup');
  process.exit(1);
}
