#!/usr/bin/env node
// hard-fix-gateway.js — Comprehensive fix for all path.join array bugs in gateway.cjs
// Also kills old process and starts fresh

const F = require('fs');
const gw = '/root/automaton/gateway.cjs';
let code = F.readFileSync(gw, 'utf8');

// Fix ALL path.join calls to ensure args are strings
// Pattern: path.join(X, Y) -> String(X)+'/'+String(Y)
// But only for our code, not express internals

// Fix 1: Replace the broken catch-all entirely with a robust version
const oldCatchAll = code.match(/app\.use\(\(req,res,next\)=>\{[\s\S]*?if\(req\.method!=='GET'\)return next\(\);[\s\S]*?\}\);/);
if (oldCatchAll) {
  console.log('[fix] Found catch-all at index', oldCatchAll.index);
  const newCatchAll = `app.use((req,res,next)=>{
  if(req.method!=='GET')return next();
  const p=String(req.path||req.url||'').replace(/^\\//,'');if(!p)return next();
  if(p.includes('..')||p.includes('\\'))return next();
  const fp=String(CONTENT)+'/'+String(p);
  if(fs.existsSync(fp)&&!fs.statSync(fp).isDirectory()){tr('/'+p);return res.sendFile(fp);}
  const hp=fp+'.html';
  if(fs.existsSync(hp)&&!fs.statSync(hp).isDirectory()){tr('/'+p);return res.sendFile(hp);}
  next();
});`;
  code = code.replace(oldCatchAll[0], newCatchAll);
  console.log('[fix] ✓ Replaced catch-all with robust version');
}

// Fix 2: Fix all remaining path.join(CONTENT, ...) calls
code = code.replace(/path\.join\(CONTENT,\s*([^)]+)\)/g, "String(CONTENT)+'/'+String($1)");
console.log('[fix] ✓ Fixed all path.join(CONTENT, ...) calls');

// Fix 3: Fix path.join(DATA, ...) calls
code = code.replace(/path\.join\(DATA,\s*([^)]+)\)/g, "String(DATA)+'/'+String($1)");
console.log('[fix] ✓ Fixed all path.join(DATA, ...) calls');

// Fix 4: Add defensive middleware at the top that prevents array paths
const defMiddleware = `
// Defensive path guard — ensures req.path is always string
app.use((req,res,next)=>{
  if(req.path && typeof req.path !== 'string') Object.defineProperty(req,'path',{value:String(req.path),writable:true});
  if(req.url && typeof req.url !== 'string') Object.defineProperty(req,'url',{value:String(req.url),writable:true});
  next();
});
`;
if (!code.includes('Defensive path guard')) {
  const insert = code.indexOf("app.use(express.json({limit:'1mb'}));");
  if (insert > -1) {
    const nl = code.indexOf('\n', insert);
    code = code.slice(0, nl + 1) + defMiddleware + code.slice(nl + 1);
    console.log('[fix] ✓ Added defensive path guard middleware');
  }
}

F.writeFileSync(gw, code);

// Verify no path.join remains that could crash
const remaining = code.match(/path\.join\([^)]+\)/g) || [];
console.log('[fix] Remaining path.join calls:', remaining.length);
remaining.forEach(r => {
  if (r.includes('CONTENT') || r.includes('DATA') || r.includes('KF')) {
    console.log('[fix]   ⚠️ UNFIXED:', r);
  }
});

// Verify syntax
try {
  require('child_process').execSync('node -c ' + gw, { timeout: 3000 });
  console.log('[fix] ✓ Syntax check passed');
} catch(e) {
  console.log('[fix] ⚠️ Syntax check FAILED:', e.message);
}

console.log('[fix] Done — ready to restart gateway');
