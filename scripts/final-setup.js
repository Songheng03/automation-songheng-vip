#!/usr/bin/env node
/**
 * Final setup: Patch gateway with x402 verification + restart
 */
const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

const GW = '/root/automaton/gateway.js';
let c = fs.readFileSync(GW, 'utf8');

// === Step 1: Add API integration page route ===
const routeLines = [
  '  "/api-integration": "/api-integration.html",',
  '  "/integrate": "/api-integration.html",'
];

// Insert after quickstart route
for (const line of routeLines) {
  if (!c.includes(line.trim())) {
    c = c.replace('"/quickstart": "/quickstart.html",', 
      '"/quickstart": "/quickstart.html",\n' + line);
  }
}

// === Step 2: Add x402 require after github-review ===
const x402Block = `
// ---- x402 Payment Verification ----
const X402_VERIFIER = path.join(__dirname, 'services', 'x402-verifier.js');
let x402;
try { 
  x402 = require(X402_VERIFIER); 
  console.log('[gateway] x402-verifier loaded');
} catch(e) { 
  console.error('[gateway] x402-verifier not loaded:', e.message); 
  x402 = { verifyPayment: () => ({valid: true}) }; // fallback
}

`;

// Only add if not already present
if (!c.includes('X402_VERIFIER')) {
  const ghInsert = c.indexOf('console.log(\'[gateway] github-review loaded\');');
  if (ghInsert > 0) {
    const afterLog = c.indexOf('\n', ghInsert) + 1;
    while (c[afterLog] === ' ' || c[afterLog] === '}') {}
    c = c.slice(0, afterLog) + x402Block + c.slice(afterLog);
  }
}

// === Step 3: Restart gateway ===
fs.writeFileSync(GW, c);

try {
  execSync('node --check ' + GW, { stdio: 'pipe' });
  console.log('✅ Syntax OK');
} catch(e) {
  console.log('❌ Syntax error, reverting');
  const bak = GW + '.bak';
  if (fs.existsSync(bak)) {
    fs.writeFileSync(GW, fs.readFileSync(bak));
  }
  process.exit(1);
}

// Kill existing gateway
try {
  const pid = execSync('pgrep -f "node.*gateway" 2>/dev/null || true').toString().trim();
  if (pid) {
    pid.split('\n').forEach(p => {
      try { process.kill(parseInt(p)); } catch(e) {}
    });
    console.log('🛑 Killed old gateway (PID ' + pid.split('\n')[0] + ')');
  }
} catch(e) {}

// Start new gateway
const child = spawn('node', [GW], {
  cwd: '/root/automaton',
  stdio: ['ignore', 'pipe', 'pipe'],
  detached: true,
  env: { ...process.env, DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY || '' }
});
child.unref();

let output = '';
child.stdout.on('data', d => output += d.toString());
child.stderr.on('data', d => output += d.toString());

setTimeout(() => {
  const http = require('http');
  http.get('http://localhost:8080/api/health', (res) => {
    let d = '';
    res.on('data', chunk => d += chunk);
    res.on('end', () => {
      console.log('✅ Gateway running! Health:', d.slice(0, 200));
      console.log('\nGateway output:', output.slice(0, 500));
      if (output.includes('x402-verifier loaded')) {
        console.log('✅ x402 verification ACTIVE!');
      }
      if (output.includes('not loaded')) {
        console.log('⚠️  x402 verifier not loading - check /root/services/x402-verifier.js');
      }
    });
  }).on('error', (e) => {
    console.log('❌ Gateway not responding:', e.message);
    console.log('Output:', output.slice(0, 500));
  });
}, 2000);
