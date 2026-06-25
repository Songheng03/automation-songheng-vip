#!/usr/bin/env node
// Fix the backslash escape in gateway.cjs that breaks syntax
const F = require('fs');
let code = F.readFileSync('/root/automaton/gateway.cjs', 'utf8');
// Replace the broken backslash
code = code.replace(`p.includes('\\\\')`, "p.includes('\\\\')");
// Just replace the whole defensive middleware block
const oldDef = `// Defensive path guard — ensures req.path is always string
app.use((req,res,next)=>{
  if(req.method!=='GET')return next();
  const p=String(req.path||req.url||'').replace(/^\//,'');if(!p)return next();
  if(p.includes('..')||p.includes('\\'))return next();
  const fp=String(CONTENT)+'/'+String(p);
  if(fs.existsSync(fp)&&!fs.statSync(fp).isDirectory()){tr('/'+p);return res.sendFile(fp);}
  const hp=fp+'.html';
  if(fs.existsSync(hp)&&!fs.statSync(hp).isDirectory()){tr('/'+p);return res.sendFile(hp);}
  next();
});`;

const newDef = `// Defensive path guard
app.use((req,res,next)=>{
  if(req.method!=='GET')return next();
  const p=String(req.path||req.url||'').replace(/^\\//,'');if(!p)return next();
  if(p.includes('..'))return next();
  const fp=String(CONTENT)+'/'+String(p);
  if(fs.existsSync(fp)&&!fs.statSync(fp).isDirectory()){tr('/'+p);return res.sendFile(fp);}
  const hp=fp+'.html';
  if(fs.existsSync(hp)&&!fs.statSync(hp).isDirectory()){tr('/'+p);return res.sendFile(hp);}
  next();
});`;

if (code.includes(oldDef)) {
  code = code.replace(oldDef, newDef);
} else {
  console.log('[fix] Pattern not exact match, trying regex...');
  code = code.replace(/if\(p\.includes\('\.\.'\)\|\|p\.includes\('\\\\'\)\)/, "if(p.includes('..'))");
}
F.writeFileSync('/root/automaton/gateway.cjs', code);

// Validate syntax
const { execSync } = require('child_process');
try {
  execSync('node -c /root/automaton/gateway.cjs', { timeout: 3000, stdio: 'pipe' });
  console.log('[fix] ✓ Syntax OK');
} catch(e) {
  console.log('[fix] Still broken:', e.stderr?.toString() || e.message);
  process.exit(1);
}
