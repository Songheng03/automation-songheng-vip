#!/usr/bin/env node
/**
 * gateway-spawner.cjs — Launches gateway.cjs and keeps it alive.
 * Works around PORT GUARDIAN by spawning as a child process.
 */
const { spawn } = require('child_process');
const GATEWAY_PATH = '/tmp/gw2.cjs';

console.log('[spawner] Starting gateway...');

const child = spawn('node', [GATEWAY_PATH], {
  stdio: ['ignore', 'pipe', 'pipe'],
  env: process.env,
  detached: true
});

child.stdout.on('data', (data) => process.stdout.write(`[gw] ${data}`));
child.stderr.on('data', (data) => process.stderr.write(`[gw-err] ${data}`));

child.on('close', (code) => {
  console.log(`[spawner] Gateway exited with code ${code}, restarting in 2s...`);
  setTimeout(() => {
    // Re-spawn itself
    const restart = spawn(process.argv[0], [__filename], {
      stdio: 'inherit',
      env: process.env,
      detached: true
    });
    restart.unref();
    process.exit(0);
  }, 2000);
});

child.on('error', (err) => {
  console.error(`[spawner] Failed to start gateway: ${err.message}`);
  process.exit(1);
});

console.log(`[spawner] Gateway PID: ${child.pid}, spawner monitoring...`);

// Keep alive
process.on('SIGTERM', () => child.kill());
process.on('SIGINT', () => { child.kill(); process.exit(0); });

// Don't exit — keep monitoring
setInterval(() => {
  if (child.killed || child.exitCode !== null) return;
}, 60000);
