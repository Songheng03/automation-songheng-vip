#!/usr/bin/env node
// Patch gateway.js to add repo-badge route
// Run from /root/automaton/

import fs from 'fs';

const gatewayPath = '/root/automaton/gateway.js';
let code = fs.readFileSync(gatewayPath, 'utf8');

// Add import if missing
if (!code.includes('repo-badges')) {
  code = code.replace(
    "from '../services/payment-tracker.js';",
    "from '../services/payment-tracker.js';\nimport { handleBadge } from './services/repo-badges.js';"
  );
}

// Add route handler - insert before the static file handler
const routeBlock = `
  // === REPO BADGE SERVICE (free, no auth) ===
  if (parsedUrl.pathname.startsWith('/repo-badge/')) {
    try {
      const result = await handleBadge(parsedUrl.pathname + (parsedUrl.search || ''));
      res.writeHead(result.status, {
        'Content-Type': result.type === 'svg' ? 'image/svg+xml' : 'text/plain',
        'Cache-Control': 'public, max-age=300',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(result.body);
    } catch(e) {
      res.writeHead(500, {'Content-Type':'text/plain'});
      res.end('Badge error: ' + e.message);
    }
    return;
  }

`;

if (!code.includes('REPO BADGE SERVICE')) {
  const markers = [
    "// Static file handler - serve from",
    "// Free tools page",
    "// Dashboard page",
    "// GitHub webhook guide"
  ];
  let inserted = false;
  for (const marker of markers) {
    const idx = code.indexOf('\n  ' + marker);
    if (idx !== -1) {
      code = code.slice(0, idx + 1) + routeBlock + '  ' + code.slice(idx + 1);
      inserted = true;
      break;
    }
  }
  if (!inserted) {
    // Fallback: insert after landing page function
    const idx = code.indexOf('function landingPage()');
    if (idx !== -1) {
      const handlerIdx = code.indexOf('http.createServer', idx);
      const handlerBodyStart = code.indexOf('{', handlerIdx);
      const parsedUrlIdx = code.indexOf('parsedUrl', handlerBodyStart);
      const firstHandlerLine = code.indexOf('\n', parsedUrlIdx) + 1;
      code = code.slice(0, firstHandlerLine) + routeBlock + code.slice(firstHandlerLine);
    }
  }
}

// Also add badge to landing page free services 
if (!code.includes('/repo-badge/:owner')) {
  const badgeEntry = '<div class="endpoint"><span><span class="method">GET</span> <span class="path">/repo-badge/:owner/:repo/:metric</span></span><span class="badge badge-free">free</span><span style="color:#8b949e">GitHub repo stats badge</span></div>';
  const blogEntry = '<div class="endpoint"><span><span class="method">GET</span> <span class="path">/blog</span></span>';
  code = code.replace(blogEntry, badgeEntry + '\n' + blogEntry);
}

// Add to nav
if (!code.includes('Badges') && code.includes('<nav class="nav">')) {
  code = code.replace('</nav>', '<a href="/repo-badge/facebook/react">Badges</a></nav>');
}

fs.writeFileSync(gatewayPath, code);
console.log('OK - gateway.js patched. Import:', code.includes('repo-badges'), 'Route:', code.includes('REPO BADGE SERVICE'), 'Landing:', code.includes('/repo-badge/:owner'));
