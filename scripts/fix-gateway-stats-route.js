#!/usr/bin/env node
// fix-gateway-stats-route.js — Fix /api/payments/stats route in gateway.cjs
// The issue: stats endpoint got added in wrong place and catch-all handler catches it
// Fix: Add proper route handler directly to gateway.cjs

const F = require('fs');
const gwPath = '/root/automaton/gateway.cjs';
let code = F.readFileSync(gwPath, 'utf8');

// The issue: /api/payments/stats GET route is being caught by the catch-all static handler
// Fix: Add the route handler BEFORE the catch-all middleware

// Find the catch-all handler
const catchAllPos = code.indexOf('// CATCH-ALL static files');
if (catchAllPos === -1) {
  console.log('[fix] Cannot find catch-all');
  process.exit(1);
}

// Check if route already exists properly
const statsRouteDef = "a.get('/api/payments/stats'";
const gwsStats = "app.get('/api/payments/stats'";

if (code.includes(gwsStats)) {
  console.log('[fix] Route already exists with app.get — checking placement');
} else {
  console.log('[fix] Adding /api/payments/stats route before catch-all');
  
  const statsHandler = `
// x402 payment stats endpoint
app.get('/api/payments/stats', (req, res) => {
  try {
    const v = require('/root/services/x402-payment-verifier.js');
    const h = require('/root/services/x402-paid-api-handler.js');
    res.json({ verification: v.getStats(), processing: h.getStats() });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

`;
  
  code = code.slice(0, catchAllPos) + statsHandler + code.slice(catchAllPos);
}

// Also check if the old a.get route exists and remove it
if (code.includes(statsRouteDef)) {
  console.log('[fix] Removing old a.get stats route');
  // Find the line with a.get('/api/payments/stats'...
  const idx = code.indexOf("a.get('/api/payments/stats'");
  if (idx > -1) {
    const lineEnd = code.indexOf('\n', idx);
    code = code.slice(0, idx) + code.slice(lineEnd + 1);
  }
}

// Also need to add the x402 POST endpoint routes properly with app.post
const x402Routes = [
  '/v1/analyze', '/v1/summarize', '/v1/review', '/v1/security',
  '/v1/explain', '/v1/refactor', '/v1/complexity', '/v1/batch', '/v1/render'
];

// Check if any routes use 'a.post(' instead of 'app.post(' (old gateway.js style)
// gateway.cjs uses 'app' not 'a'
for (const route of x402Routes) {
  if (code.includes(`a.post('${route}'`)) {
    console.log(`[fix] Converting a.post to app.post for ${route}`);
    code = code.replace(`a.post('${route}'`, `app.post('${route}'`);
  }
  
  // Check if the route is already defined with app.post
  if (!code.includes(`app.post('${route}'`)) {
    console.log(`[fix] Adding missing route: ${route}`);
    const handlerRef = `x402PaidHandler.createHandler('${route}')`;
    // Check if x402PaidHandler is imported
    if (!code.includes('x402PaidHandler')) {
      const importLine = `\nconst x402PaidHandler = require('/root/services/x402-paid-api-handler.js');\n`;
      code = code.slice(0, catchAllPos) + importLine + code.slice(catchAllPos);
    }
    const newRoute = `\napp.post('${route}', x402PaidHandler.createHandler('${route}'));\n`;
    code = code.slice(0, catchAllPos) + newRoute + code.slice(catchAllPos);
  }
}

F.writeFileSync(gwPath, code);
console.log('[fix] ✓ Gateway routes fixed');
