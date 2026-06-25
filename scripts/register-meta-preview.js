#!/usr/bin/env node
// Register meta-preview tool in gateway, no reading needed
const F = require('fs');
const gw = '/root/automaton/gateway.cjs';
let code = F.readFileSync(gw, 'utf8');

if (!code.includes('meta-preview')) {
  code = code.replace(
    "/tools/backlink-generator",
    "/tools/backlink-generator\n  app.get('/tools/meta-preview',(r,s)=>{sf(s,C+'/tools/meta-preview.html')});"
  );
  F.writeFileSync(gw, code);
  console.log('✓ Added /tools/meta-preview route');
} else {
  console.log('Route already exists');
}

require('child_process').execSync('node -c ' + gw, { timeout: 3000 });
console.log('✓ Syntax OK');

// Reload gateway
const { spawn } = require('child_process');
spawn('pkill', ['-HUP', '-f', 'node.*gateway']);
console.log('✓ Gateway reloaded');
