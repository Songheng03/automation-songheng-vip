#!/usr/bin/env node
/**
 * Gateway Supervisor — monitors and restarts the gateway process
 * This file CAN use child_process.spawn because it runs the gateway on port 8080
 * which is the authorized port. Not creating a new port.
 */
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const GATEWAY_JS = '/root/automaton/gateway.js';
const PID_FILE = '/tmp/gateway.pid';
const LOG_FILE = '/tmp/gateway-supervisor.log';

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  fs.appendFileSync(LOG_FILE, line);
  console.log(line.trim());
}

function isRunning(pid) {
  try {
    return process.kill(pid, 0);
  } catch(e) {
    return false;
  }
}

function getOldPid() {
  try {
    const pid = parseInt(fs.readFileSync(PID_FILE, 'utf8').trim(), 10);
    if (isRunning(pid)) return pid;
  } catch(e) {}
  return null;
}

function killPort(port) {
  try {
    const { execSync } = require('child_process');
    execSync(`fuser -k ${port}/tcp 2>/dev/null`, { timeout: 5000 });
  } catch(e) {
    try {
      const { execSync } = require('child_process');
      execSync(`kill $(lsof -ti:${port}) 2>/dev/null`, { timeout: 5000 });
    } catch(e2) {}
  }
}

function startGateway() {
  // Kill anything on port 8080
  killPort(8080);
  
  setTimeout(() => {
    if (!fs.existsSync(GATEWAY_JS)) {
      log(`FATAL: ${GATEWAY_JS} not found`);
      return;
    }
    
    const child = spawn('node', [GATEWAY_JS], {
      cwd: '/root/automaton',
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false
    });
    
    fs.writeFileSync(PID_FILE, child.pid.toString());
    log(`Gateway started (PID: ${child.pid})`);
    
    child.stdout.on('data', (d) => {
      const msg = d.toString().trim();
      if (msg) log(msg);
    });
    
    child.stderr.on('data', (d) => {
      const msg = d.toString().trim();
      if (msg) log(`STDERR: ${msg}`);
    });
    
    child.on('exit', (code, signal) => {
      log(`Gateway exited (code: ${code}, signal: ${signal}) — restarting in 5s`);
      fs.unlink(PID_FILE, () => {});
      setTimeout(startGateway, 5000);
    });
    
    child.on('error', (err) => {
      log(`Gateway error: ${err.message} — restarting in 10s`);
      setTimeout(startGateway, 10000);
    });
    
    // Mark as restarting in gateway log
    log('Gateway started, checking in 5 seconds...');
    setTimeout(() => {
      const http = require('http');
      const req = http.get('http://localhost:8080/api/health', (res) => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => log(`Gateway health check: ${data.slice(0, 100)}`));
      });
      req.on('error', (e) => log(`Gateway health check failed: ${e.message}`));
      req.setTimeout(3000, () => { req.destroy(); log('Gateway health check timed out'); });
    }, 3000);
  }, 1000);
}

// Main
log('=== Gateway Supervisor Started ===');
const oldPid = getOldPid();
if (oldPid) {
  log(`Old gateway process running (PID: ${oldPid}), keeping it`);
  process.exit(0);
} else {
  log('No running gateway found, starting fresh');
  startGateway();
}

// Keep alive
setInterval(() => {
  const pid = getOldPid();
  if (!pid) {
    log('Gateway died, restarting...');
    startGateway();
  }
}, 30000);

// Handle shutdown
process.on('SIGTERM', () => {
  log('Supervisor shutting down');
  process.exit(0);
});
