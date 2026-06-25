#!/usr/bin/env node
/**
 * Gateway Restarter — Kills old process, starts updated gateway.js
 * Part of /root/automaton/gateway.js ecosystem
 */
const { execSync } = require('child_process');
const path = require('path');

console.log('[restart] Killing processes on port 8080...');
try { execSync('fuser -k 8080/tcp 2>/dev/null || kill $(lsof -ti:8080) 2>/dev/null', { timeout: 5000 }); } catch(e) {}
console.log('[restart] Port cleared.');

console.log('[restart] Starting gateway.js...');
const child = require('child_process').spawn('node', [path.join(__dirname, 'gateway.js')], {
  cwd: __dirname,
  stdio: 'inherit',
  detached: false
});

child.on('error', (err) => console.error('[restart] Failed:', err.message));
child.on('exit', (code) => console.log(`[restart] Gateway exited with code ${code}`));

console.log('[restart] Gateway started, PID:', child.pid);
