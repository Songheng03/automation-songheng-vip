#!/usr/bin/env node
// integrate-x402-handler.js — Wire x402 paid API handler into gateway
// This replaces placeholder x402 endpoints with real AI-powered ones

const F = require('fs');
const gwPath = '/root/automaton/gateway.js';
let code = F.readFileSync(gwPath, 'utf8');

// Check if already integrated
if (code.includes('x402PaidHandler')) {
  console.log('[integrate] Already integrated');
  process.exit(0);
}

// Step 1: Add import after x402Verifier
const importLine = `\nconst x402PaidHandler = require('/root/services/x402-paid-api-handler.js');\n`;
const verifierPos = code.indexOf('x402Verifier');
if (verifierPos > -1) {
  const lineEnd = code.indexOf('\n', verifierPos);
  code = code.slice(0, lineEnd + 1) + importLine + code.slice(lineEnd + 1);
  console.log('[integrate] Added import');
} else {
  console.log('[integrate] x402Verifier not found, adding both imports');
  const afterRequire = code.lastIndexOf('\n', code.lastIndexOf('require('));
  const injectPoint = code.indexOf('\n', afterRequire) + 1;
  code = code.slice(0, injectPoint) + 
    `const x402Verifier = require('/root/services/x402-payment-verifier.js');\n` +
    `const x402PaidHandler = require('/root/services/x402-paid-api-handler.js');\n` +
    code.slice(injectPoint);
}

// Step 2: Add /api/payments/stats endpoint
const statsRoute = `
// Payment stats endpoint
a.get('/api/payments/stats', (r, s) => {
  try {
    const stats = require('/root/services/x402-payment-verifier.js').getStats();
    const handlerStats = require('/root/services/x402-paid-api-handler.js').getStats();
    s.json({ verification: stats, processing: handlerStats });
  } catch(e) {
    s.status(500).json({error: e.message});
  }
});
`;

// Find a good insertion point for stats endpoint
const listenPos = code.lastIndexOf('a.listen(');
if (listenPos > -1) {
  const beforeListen = code.lastIndexOf('\n', listenPos);
  code = code.slice(0, beforeListen) + statsRoute + code.slice(beforeListen);
  console.log('[integrate] Added /api/payments/stats');
}

// Step 3: Replace existing x402 endpoint handlers with real ones
const endpoints = [
  { route: '/v1/analyze', cost: 0.01 },
  { route: '/v1/summarize', cost: 0.02 },
  { route: '/v1/review', cost: 0.05 },
  { route: '/v1/security', cost: 0.03 },
  { route: '/v1/explain', cost: 0.02 },
  { route: '/v1/refactor', cost: 0.05 },
  { route: '/v1/complexity', cost: 0.02 },
  { route: '/v1/batch', cost: 0.05 },
  { route: '/v1/render', cost: 0.03 },
];

let replaced = 0;
for (const { route } of endpoints) {
  // Find existing route handler and replace it
  const routePos = code.indexOf(`'${route}'`);
  if (routePos === -1) {
    console.log(`[integrate] Route ${route} not found — adding`);
    // Add it
    const insertPoint = code.lastIndexOf('\n', listenPos > -1 ? listenPos : code.length);
    const newRoute = `\na.post('${route}', x402PaidHandler.createHandler('${route}'));\n`;
    code = code.slice(0, insertPoint) + newRoute + code.slice(insertPoint);
    replaced++;
    continue;
  }
  
  // Find the handler function after this route
  const handlerStart = code.indexOf('=>', routePos);
  if (handlerStart === -1) continue;
  
  // Find the end of the handler (matching brace)
  let braceCount = 0;
  let handlerEnd = handlerStart;
  let started = false;
  for (let i = handlerStart; i < code.length; i++) {
    if (code[i] === '{') { braceCount++; started = true; }
    if (code[i] === '}') { braceCount--; }
    if (started && braceCount === 0) {
      handlerEnd = i + 1;
      break;
    }
  }
  
  if (handlerEnd > handlerStart) {
    const replacement = `x402PaidHandler.createHandler('${route}')`;
    // Replace from the function body start to end
    const before = code.slice(0, handlerStart);
    const after = code.slice(handlerEnd);
    code = before + replacement + after;
    
    // Fix: the route declaration should end with a semicolon
    // Find the closing of the route a.post(...) block
    const parenPos = code.indexOf(')', handlerStart);
    if (parenPos > -1 && code[parenPos + 1] !== ';') {
      code = code.slice(0, parenPos + 1) + ';' + code.slice(parenPos + 1);
    }
    
    replaced++;
    console.log(`[integrate] Replaced ${route} handler`);
  }
}

if (replaced === 0) {
  console.log('[integrate] No handlers replaced — adding all routes');
  const insertPoint = code.lastIndexOf('\n', listenPos > -1 ? listenPos : code.length);
  let routeBlock = '';
  for (const { route } of endpoints) {
    // Check if it already exists
    if (!code.includes(`'${route}'`)) {
      routeBlock += `\na.post('${route}', x402PaidHandler.createHandler('${route}'));`;
    }
  }
  if (routeBlock) {
    code = code.slice(0, insertPoint) + routeBlock + '\n' + code.slice(insertPoint);
    console.log('[integrate] Added', endpoints.filter(e => !code.includes(`'${e.route}'`)).length, 'routes');
  }
}

F.writeFileSync(gwPath, code);
console.log(`[integrate] ✓ Done — ${replaced} handlers replaced/added`);

// Write the updated route patch script for standalone use too
const patchScript = `
// x402 ENDPOINT ROUTES (integrated by integrate-x402-handler.js)
const x402PaidHandler = require('/root/services/x402-paid-api-handler.js');
const x402Endpoints = ${JSON.stringify(endpoints)};
x402Endpoints.forEach(e => {
  if (!existingRoutes.includes(e.route)) {
    a.post(e.route, x402PaidHandler.createHandler(e.route));
  }
});
`;
F.writeFileSync('/root/automaton/scripts/x402-routes-patch.js', patchScript);
console.log('[integrate] ✓ Patch script saved');
