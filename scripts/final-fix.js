#!/usr/bin/env node
// FINAL FIX: Replace the broken catch-all with a bulletproof version
// No regex mangling of gateway.cjs — just read, edit 3 lines, write back.

const F = require('fs');
const gw = '/root/automaton/gateway.cjs';
let code = F.readFileSync(gw, 'utf8');

// The problem: path.join(CONTENT, p) crashes when express passes an array as req.path
// Fix: replace the catch-all with one that String()-casts everything

const old = code.match(/app\.use\(\(req,res,next\)=>\{[^}]*if\(req\.method!=='GET'\)return next\(\);[^}]*\}\);/s);
if (old) {
  const replacement = `app.use((req,res,next)=>{
  if(req.method!=='GET')return next();
  const p=String(req.path||req.url||'').replace(/^\\//,'');if(!p)return next();
  if(p.includes('..')||p.indexOf('\\\\')>=0)return next();
  const fp=String(CONTENT)+'/'+String(p);
  if(fs.existsSync(fp)&&!fs.statSync(fp).isDirectory()){tr('/'+p);return res.sendFile(fp);}
  const hp=fp+'.html';
  if(fs.existsSync(hp)&&!fs.statSync(hp).isDirectory()){tr('/'+p);return res.sendFile(hp);}
  next();
});`;
  code = code.replace(old[0], replacement);
  F.writeFileSync(gw, code);
  console.log('✓ Fixed catch-all handler');
} else {
  console.log('Could not find catch-all pattern');
  process.exit(1);
}

// Verify syntax
try { require('child_process').execSync('node -c ' + gw, { timeout: 3000 }); console.log('✓ Syntax OK');
} catch(e) { console.log('✗ Syntax error:', e.message); process.exit(1); }
