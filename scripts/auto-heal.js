#!/usr/bin/env node
/**
 * Auto-Heal: Gateway watchdog
 * Checks if gateway is running on port 8080, restarts if dead.
 * Runs as heartbeat task every 5 minutes.
 */
"use strict";

const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const GATEWAY_JS = '/root/automaton/gateway.js';
const LOG_FILE = '/root/automaton/data/auto-heal.log';
const PID_FILE = '/tmp/gateway.pid';

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  try {
    fs.appendFileSync(LOG_FILE, line + '\n');
  } catch(e) {}
}

function checkPort(port, cb) {
  const req = http.get(`http://localhost:${port}/health`, { timeout: 3000 }, (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
      cb(null, { status: res.statusCode, body: data });
    });
  });
  req.on('error', (err) => cb(err));
  req.on('timeout', () => { req.destroy(); cb(new Error('timeout')); });
}

function startGateway() {
  log('Starting gateway...');
  const child = spawn('node', [GATEWAY_JS], {
    cwd: '/root/automaton',
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true
  });
  
  child.stdout.on('data', d => log('[gateway] ' + d.toString().trim()));
  child.stderr.on('data', d => log('[gateway-err] ' + d.toString().trim()));
  
  child.on('error', (err) => log('Failed to spawn: ' + err.message));
  child.on('exit', (code) => log('Gateway exited with code: ' + code));
  
  child.unref();
  
  // Save PID
  try { fs.writeFileSync(PID_FILE, String(child.pid)); } catch(e) {}
  log('Gateway started with PID ' + child.pid);
  return child;
}

// Main check
log('=== Auto-Heal Check ===');

// Check by PID file first
let gatewayPid = null;
try {
  if (fs.existsSync(PID_FILE)) {
    gatewayPid = parseInt(fs.readFileSync(PID_FILE, 'utf8').trim());
  }
} catch(e) {}

// Try health check
checkPort(8080, (err, result) => {
  if (!err && result && result.status === 200) {
    log('Gateway is healthy (port 8080 responds)');
    process.exit(0);
    return;
  }
  
  log('Gateway not responding on 8080: ' + (err ? err.message : 'status ' + (result ? result.status : 'unknown')));
  
  // Double-check: try a raw connection
  const net = require('net');
  const sock = new net.Socket();
  sock.setTimeout(2000);
  sock.on('connect', () => {
    log('Port 8080 open but not responding to HTTP - may be misconfigured');
    sock.destroy();
    // Try restarting anyway
    startGateway();
    process.exit(0);
  });
  sock.on('error', () => {
    log('Port 8080 not open - gateway is dead');
    sock.destroy();
    startGateway();
    process.exit(0);
  });
  sock.on('timeout', () => {
    log('Port 8080 connection timed out');
    sock.destroy();
    startGateway();
    process.exit(0);
  });
  sock.connect(8080, '127.0.0.1');
});
