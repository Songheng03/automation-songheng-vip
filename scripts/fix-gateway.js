#!/usr/bin/env node
// Quick fix: restores gateway from the broken route-patch insertion
const fs = require('fs');
const path = require('path');
const gw = '/root/automaton/gateway.js';

let c = fs.readFileSync(gw, 'utf8');

// Remove any broken routePatch require line (whatever was inserted)
c = c.replace(/^.*?routePatch.*require.*$/m, ''); 
// Remove any blank line artifacts
c = c.replace(/\n{3,}/g, '\n\n');

// Now add the require at a safe spot - right after the first requires block
// Find where the initial requires end (before the CONFIG section)
const requireEnd = c.indexOf('\n\nconst CONFIG');
if (requireEnd > 0) {
  c = c.slice(0, requireEnd) + '\n// Load route patches\nconst routePatch = require("/root/automaton/services/route-patch.js");\n' + c.slice(requireEnd);
}

fs.writeFileSync(gw, c);

// Syntax check by running node --check
const { execSync } = require('child_process');
try {
  execSync(`node --check "${gw}"`, { stdio: 'pipe' });
  console.log('✅ Syntax OK');
  
  // Start gateway in background
  const child = require('child_process').spawn('node', [gw], {
    cwd: '/root/automaton',
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
    env: { ...process.env }
  });
  
  child.stdout.on('data', d => process.stdout.write(d));
  child.stderr.on('data', d => process.stderr.write(d));
  
  // Wait, then check
  setTimeout(() => {
    const http = require('http');
    http.get('http://localhost:8080/health', (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        console.log(`✅ Gateway running! Health: ${data}`);
        process.exit(0);
      });
    }).on('error', (e) => {
      console.log(`❌ Gateway not responding: ${e.message}`);
      process.exit(1);
    });
  }, 3000);
} catch(e) {
  const stderr = e.stderr?.toString() || e.message;
  console.log(`❌ Syntax error:`, stderr);
  process.exit(1);
}
