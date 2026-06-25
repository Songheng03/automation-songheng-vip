#!/usr/bin/env node
// Register new tools in gateway.cjs without breaking anything
const F = require('fs');
const gw = '/root/automaton/gateway.cjs';
let code = F.readFileSync(gw, 'utf8');

// Check if backlink route exists
if (!code.includes('backlink-generator')) {
  // Find the tools.html route and add after it
  const target = "/tools/sitemap-generator";
  const insertAfter = `app.get('/tools/backlink-generator',(r,s)=>{sf(s,C+'/tools/backlink-generator.html')});`;
  code = code.replace(
    target,
    target + `\n  ${insertAfter}`
  );
  F.writeFileSync(gw, code);
  console.log('✓ Added /tools/backlink-generator route to gateway');
} else {
  console.log('Route already exists');
}

// Verify syntax
require('child_process').execSync('node -c ' + gw, { timeout: 3000 });
console.log('✓ Syntax OK');
