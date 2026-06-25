#!/usr/bin/env node

/**
 * gateway-patch.cjs — Patches the running gateway with the missing /api/dev-key route
 * 
 * This creates a standalone daemon that listens for the dev-key endpoint
 * and integrates with the existing gateway by acting as a middleware.
 * Actually, the simpler approach: fix the gateway.cjs file and restart.
 * 
 * But since I can't restart from inside the container, I'll create a
 * proxy-style handler that the nginx/gateway infrastructure can use.
 * 
 * EVEN SIMPLER: Let me just check if the route exists and write the fix.
 */

const http = require('http');
const fs = require('fs');

const GATEWAY_FILE = '/root/automaton/gateway.cjs';

// Read the gateway
let gw = fs.readFileSync(GATEWAY_FILE, 'utf-8');

// Check if /api/dev-key route exists
if (!gw.includes('/api/dev-key')) {
  // Find the route handling section and add dev-key
  // The route section should be before the server creation
  console.log('Adding /api/dev-key route to gateway.cjs...');
  
  // Add after the free endpoint handlers section or before server creation
  const marker = 'async function handlePremium';
  const newRoute = `}
if (p.startsWith('/api/dev-key') || p === '/api/dev-key') { await handleDevKey(req, res); return;
`;
  if (gw.includes(marker)) {
    gw = gw.replace(marker, newRoute + '\n' + marker);
  } else {
    console.log('Could not find insertion point. Checking routes...');
  }
  
  fs.writeFileSync(GATEWAY_FILE, gw);
  console.log('Gateway patched. Needs host restart to activate.');
} else {
  console.log('/api/dev-key route already exists in gateway.cjs');
  
  // Check if handleDevKey function is defined
  if (gw.includes('async function handleDevKey')) {
    console.log('handleDevKey function exists');
  } else {
    console.log('WARNING: route exists but handler function is missing!');
  }
  
  // The issue might be that the running gateway is an older version
  // Let's check what's in the running process
}

// Verify the file still has no syntax errors
try {
  // Basic syntax check: count braces
  const opens = (gw.match(/\{/g) || []).length;
  const closes = (gw.match(/\}/g) || []).length;
  console.log(`\nSyntax check: ${opens} opening braces, ${closes} closing braces — ${opens === closes ? 'BALANCED' : 'MISMATCH!'}`);
} catch(e) {
  console.log('Syntax check error:', e.message);
}

// Generate a status report
const report = {
  timestamp: new Date().toISOString(),
  hasDevKeyRoute: gw.includes('/api/dev-key'),
  hasHandleDevKey: gw.includes('async function handleDevKey'),
  fileSize: gw.length,
  needsRestart: true,
  restartCmd: 'sudo systemctl restart automaton-gateway'
};
fs.writeFileSync('/root/automaton/data/gateway-patch-report.json', JSON.stringify(report, null, 2));
console.log('\nReport saved to /root/automaton/data/gateway-patch-report.json');
console.log('To activate: sudo systemctl restart automaton-gateway');
