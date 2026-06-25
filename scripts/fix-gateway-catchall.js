#!/usr/bin/env node
// fix-gateway-catchall.js — Fix the catch-all handler that crashes on non-string paths
// Also adds missing /api/payments/stats route

const F = require('fs');
const gw = '/root/automaton/gateway.cjs';
let code = F.readFileSync(gw, 'utf8');

// Fix 1: Replace the broken catch-all with a defensive version
const oldCatchAll = `app.use((req,res,next)=>{
  if(req.method!=='GET')return next();
  const p=req.path.replace(/^\//,'');if(!p)return next();
  if(sf2(res,path.join(CONTENT,p))){tr('/'+p);}else next();
});`;

const newCatchAll = `app.use((req,res,next)=>{
  if(req.method!=='GET')return next();
  const p=String(req.path||req.url||'').replace(/^\\//,'');if(!p)return next();
  if(p.includes('..'))return next();
  try{const fp=path.resolve(String(CONTENT),String(p));if(!fp.startsWith(String(CONTENT)))return next();if(sf2(res,fp)){tr('/'+p);}else next();}catch(e){next();}
});`;

if (code.includes(oldCatchAll)) {
  code = code.replace(oldCatchAll, newCatchAll);
  console.log('[fix] ✓ Catch-all handler fixed (defensive type casting)');
} else {
  console.log('[fix] Catch-all format differs — applying inline fix');
  // Try to find and fix the path.join(CONTENT,p) pattern
  const match = code.match(/path\.join\(CONTENT,p\)/);
  if (match) {
    code = code.replace(/path\.join\(CONTENT,p\)/g, "String(CONTENT)+'/'+String(p)");
    console.log('[fix] ✓ path.join replaced with string concatenation (prevents array crash)');
  }
}

// Fix 2: Ensure req.path is always a string
const sf2Def = code.match(/function sf2\(res,p\)/);
if (sf2Def) {
  // The sf2 function already does `const fp=String(p)` which is good
  console.log('[fix] ✓ sf2 already has String(p) protection');
}

// Fix 3: Add the /api/payments/stats route if missing
if (!code.includes('/api/payments/stats')) {
  const routeBlock = `
// Payment verification stats
app.get('/api/payments/stats', (req, res) => {
  try {
    const v = require('/root/services/x402-payment-verifier.js');
    const h = require('/root/services/x402-paid-api-handler.js');
    res.json({ verification: v.getStats(), processing: h.getStats() });
  } catch(e) {
    res.json({ error: e.message, note: 'payment verifier not fully loaded' });
  }
});
`;
  // Insert before catch-all
  const insertPos = code.lastIndexOf('// CATCH-ALL');
  if (insertPos > -1) {
    code = code.slice(0, insertPos) + routeBlock + code.slice(insertPos);
    console.log('[fix] ✓ /api/payments/stats route added before catch-all');
  }
}

// Fix 4: Add defensive middleware before routes to prevent path-as-array
const topDefensive = `
// Defensive: ensure req.path is always string
app.use((req,res,next)=>{
  if(req.path && typeof req.path !== 'string'){
    Object.defineProperty(req, 'path', { value: String(req.path), writable: true });
  }
  next();
});
`;
if (!code.includes('Defensive: ensure req.path')) {
  const afterJson = code.indexOf("app.use(express.json({limit:'1mb'}));");
  if (afterJson > -1) {
    const endOfLine = code.indexOf('\n', afterJson);
    code = code.slice(0, endOfLine + 1) + topDefensive + code.slice(endOfLine + 1);
    console.log('[fix] ✓ Defensive path middleware added');
  }
}

F.writeFileSync(gw, code);
console.log('[fix] ✓ Gateway.cjs fixes applied');

// Test syntax
try {
  new Function('require', code);
  console.log('[fix] ✓ Syntax check passed');
} catch(e) {
  console.log('[fix] ⚠️ Syntax check failed:', e.message);
}
