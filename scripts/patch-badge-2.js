#!/usr/bin/env node
// Fix: Add badge route to gateway.js
// 1. Add import to top section
// 2. Add route handler after line 502 (const url = new URL(...))

const fs = require('fs');
let code = fs.readFileSync('/root/automaton/gateway.js', 'utf8');

// 1. Add import - find the last import line
const importEnd = code.lastIndexOf("import ");
const importLineEnd = code.indexOf('\n', importEnd);
const afterImports = importLineEnd + 1;

if (!code.includes('handleBadge')) {
  code = code.slice(0, afterImports) + "\nimport { handleBadge } from './services/repo-badges.js';" + code.slice(afterImports);
  console.log('Added import');
}

// 2. Add route after `const url = new URL(req.url, ...)`
const target = "const url = new URL(req.url, `http://${req.headers.host}`);";
const idx = code.indexOf(target);
if (idx !== -1) {
  const lineEnd = code.indexOf('\n', idx);
  const afterLine = lineEnd + 1;
  
  const routeCode = `
  // === REPO BADGE SERVICE (free, no auth) ===
  if (url.pathname.startsWith('/repo-badge/')) {
    try {
      const result = await handleBadge(url.pathname + (url.search || ''));
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
  code = code.slice(0, afterLine) + routeCode + code.slice(afterLine);
  console.log('Added route after url parsing');
}

// 3. Also add link to landing page navbar
const navBadge = code.indexOf('>Badges</a>');
if (navBadge === -1) {
  // Add to nav
  const navEnd = code.indexOf('</nav>');
  if (navEnd !== -1) {
    code = code.slice(0, navEnd) + `<a href="/repo-badge/facebook/react">Badges</a>` + code.slice(navEnd);
    console.log('Added badge link to nav');
  }
}

// Verify
const hasImport = code.includes("import { handleBadge }");
const hasRoute = code.includes("REPO BADGE SERVICE");
console.log('Import:', hasImport, 'Route:', hasRoute);

fs.writeFileSync('/root/automaton/gateway.js', code);
console.log('Done - gateway.js patched');
