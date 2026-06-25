#!/usr/bin/env node
/**
 * Gateway Starter — kills old gateway, starts new one
 * Uses PM2-style respawn but as a simple script
 */
const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const LOG = '/root/automaton/data/gateway-restart.log';

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  fs.appendFileSync(LOG, line + '\n');
}

// Kill old gateway processes
try {
  const pidLines = execSync("ps aux | grep 'node.*gateway.js' | grep -v grep | awk '{print $2}'", {encoding: 'utf-8'}).trim();
  if (pidLines) {
    const pids = pidLines.split('\n').filter(Boolean);
    for (const pid of pids) {
      try {
        process.kill(parseInt(pid), 'SIGTERM');
        log(`Killed old gateway PID ${pid}`);
      } catch(e) {
        try { process.kill(parseInt(pid), 'SIGKILL'); } catch(e2) {}
      }
    }
  }
} catch(e) {}

// Wait for port to be free
const wait = (ms) => new Promise(r => setTimeout(r, ms));
async function waitForPort(port, timeoutMs = 5000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const out = execSync(`ss -tlnp | grep ":${port} "`, {encoding: 'utf-8', timeout: 2000});
      if (!out.trim()) return true;
    } catch(e) {
      return true; // No process on port
    }
    await wait(500);
  }
  return false;
}

async function main() {
  log('=== Starting Gateway ===');
  
  // Verify gateway.js exists and has no syntax errors
  const gatewayPath = '/root/automaton/gateway.js';
  if (!fs.existsSync(gatewayPath)) {
    log('FATAL: gateway.js not found!');
    process.exit(1);
  }
  
  try {
    execSync(`node -c "${gatewayPath}"`, {encoding: 'utf-8', timeout: 5000});
    log('gateway.js syntax OK');
  } catch(e) {
    log(`SYNTAX ERROR: ${e.message}`);
    process.exit(1);
  }
  
  // Wait for port 8080 to be free
  await waitForPort(8080, 5000);
  
  // Start gateway
  const child = spawn('node', [gatewayPath], {
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, NODE_ENV: 'production' }
  });
  
  child.stdout.on('data', (data) => {
    fs.appendFileSync('/root/automaton/data/gateway-output.log', `[${new Date().toISOString()}] ${data}`);
  });
  child.stderr.on('data', (data) => {
    fs.appendFileSync('/root/automaton/data/gateway-error.log', `[${new Date().toISOString()}] ${data}`);
  });
  child.on('exit', (code) => {
    log(`Gateway exited with code ${code}`);
  });
  
  child.unref();
  log(`Gateway started with PID ${child.pid}`);
  
  // Verify it's listening
  await wait(1000);
  try {
    const out = execSync(`ss -tlnp | grep ":8080 "`, {encoding: 'utf-8', timeout: 2000});
    log(`Port 8080: ${out.trim() || 'LISTENING'}`);
  } catch(e) {
    log('WARNING: Gateway may not be listening on 8080');
  }
  
  // Save PID
  fs.writeFileSync('/root/automaton/data/gateway.pid', String(child.pid));
  log('=== Gateway Started Successfully ===');
}

main().catch(e => {
  log(`FATAL error: ${e.message}`);
  process.exit(1);
});
