// restart-gateway.js — Find and restart the gateway process
// Run: node /root/automaton/scripts/restart-gateway.js
// Kills old gateway, starts new one with patched code

const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const GATEWAY_PATH = '/root/services/gateway.js';
const LOG_FILE = '/root/automaton/data/gateway-restart.log';
const PID_FILE = '/root/automaton/data/gateway.pid';

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  try {
    fs.appendFileSync(LOG_FILE, line + '\n');
  } catch(e) {}
}

function restart() {
  // 1. Find old gateway processes
  log('Looking for old gateway processes...');
  try {
    const ps = execSync("ps aux | grep 'gateway.js' | grep -v grep | awk '{print $2}'", { encoding: 'utf8' });
    const pids = ps.trim().split('\n').filter(Boolean);
    
    if (pids.length > 0) {
      log(`Found gateway PIDs: ${pids.join(', ')}`);
      for (const pid of pids) {
        try {
          process.kill(parseInt(pid), 'SIGTERM');
          log(`Sent SIGTERM to PID ${pid}`);
        } catch(e) {
          log(`Could not kill PID ${pid}: ${e.message}`);
        }
      }
      // Give it a second
      execSync('sleep 2');
      
      // Force kill any remaining
      for (const pid of pids) {
        try {
          process.kill(parseInt(pid), 'SIGKILL');
        } catch(e) {}
      }
    } else {
      log('No old gateway processes found');
    }
  } catch(e) {
    log(`Error finding processes: ${e.message}`);
  }

  // 2. Verify gateway file exists
  if (!fs.existsSync(GATEWAY_PATH)) {
    log(`ERROR: Gateway not found at ${GATEWAY_PATH}`);
    // Search for it
    try {
      const found = execSync("find /root -name 'gateway.js' -type f 2>/dev/null", { encoding: 'utf8' });
      log(`Found gateway files: ${found.trim() || 'none'}`);
    } catch(e) {}
    return;
  }

  // 3. Start new gateway
  log('Starting new gateway...');
  const child = spawn('node', [GATEWAY_PATH], {
    cwd: '/root/services',
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
    env: { ...process.env, PORT: '8080' }
  });

  const pid = child.pid;
  fs.writeFileSync(PID_FILE, String(pid));
  log(`Gateway started with PID ${pid}`);

  // Collect output
  let output = '';
  child.stdout.on('data', d => output += d.toString());
  child.stderr.on('data', d => output += d.toString());

  // Unref so this script can exit
  child.unref();

  // Wait a moment and check
  setTimeout(() => {
    try {
      const status = execSync('curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/', { timeout: 5000, encoding: 'utf8' });
      log(`Gateway health check: HTTP ${status}`);
      if (status === '200') {
        log('RESTART SUCCESSFUL!');
        log(`Output: ${output.substring(0, 500)}`);
      } else {
        log(`Gateway returned ${status} - may have issues`);
      }
    } catch(e) {
      log(`Gateway health check failed: ${e.message}`);
    }
  }, 3000);
}

restart();
