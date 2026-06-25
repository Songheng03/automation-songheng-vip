#!/usr/bin/env node
/**
 * Gateway Runner — Keeps gateway.js alive with restart loop
 * Usage: node run-gateway.js
 * 
 * Handles:
 * - Correct process spawning without kill confusion
 * - Auto-restart on crash
 * - Logging to files
 * - Keeps the event loop alive natively
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const DATA_DIR = '/root/automaton/data';
const LOG = path.join(DATA_DIR, 'run-gateway.log');
const PID_FILE = path.join(DATA_DIR, 'run-gateway.pid');
const GATEWAY_PATH = '/root/automaton/gateway.js';

try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch(e) {}

// Save our own PID
fs.writeFileSync(PID_FILE, String(process.pid));

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  try { fs.appendFileSync(LOG, line + '\n'); } catch(e) {}
}

function verifySyntax(filePath) {
  try {
    require('child_process').execSync(`node -c "${filePath}"`, { timeout: 5000, encoding: 'utf-8' });
    return true;
  } catch(e) {
    log(`SYNTAX ERROR in ${filePath}: ${e.stderr || e.message}`);
    return false;
  }
}

log('=== Gateway Runner started ===');
log(`PID: ${process.pid}`);

if (!fs.existsSync(GATEWAY_PATH)) {
  log(`FATAL: ${GATEWAY_PATH} not found`);
  process.exit(1);
}

if (!verifySyntax(GATEWAY_PATH)) {
  log('FATAL: Syntax error in gateway.js, cannot start');
  process.exit(1);
}

let child = null;
let restartCount = 0;
const MAX_RESTARTS = 100; // effectively unlimited
const RESTART_DELAY_MS = 2000;

function startGateway() {
  if (child) {
    try { child.kill(); } catch(e) {}
    child = null;
  }

  log(`Starting gateway (restart #${restartCount})...`);
  
  child = spawn('node', [GATEWAY_PATH], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, NODE_ENV: 'production', PATH: process.env.PATH || '/usr/local/bin:/usr/bin:/bin' }
  });

  const pid = child.pid;
  log(`Gateway PID: ${pid}`);

  child.stdout.on('data', (data) => {
    const msg = data.toString().trim();
    if (msg) log(`[gateway] ${msg}`);
  });

  child.stderr.on('data', (data) => {
    const msg = data.toString().trim();
    if (msg) log(`[gateway:err] ${msg}`);
  });

  child.on('exit', (code, signal) => {
    log(`Gateway exited: code=${code} signal=${signal}`);
    child = null;

    if (restartCount < MAX_RESTARTS) {
      restartCount++;
      log(`Restarting in ${RESTART_DELAY_MS}ms...`);
      setTimeout(startGateway, RESTART_DELAY_MS);
    } else {
      log('FATAL: Max restarts reached. Gateway will not restart.');
    }
  });

  child.on('error', (err) => {
    log(`Gateway spawn error: ${err.message}`);
    child = null;
    if (restartCount < MAX_RESTARTS) {
      restartCount++;
      setTimeout(startGateway, RESTART_DELAY_MS);
    }
  });

  // Check if process is running after 1 second
  setTimeout(() => {
    try {
      if (child && child.exitCode === null) {
        log('Gateway confirmed running');
        restartCount = 0; // Reset restart count on successful run
      }
    } catch(e) {}
  }, 1000);
}

// Handle graceful shutdown
function shutdown(signal) {
  log(`Received ${signal}, shutting down...`);
  if (child) {
    child.kill('SIGTERM');
    setTimeout(() => {
      try { child.kill('SIGKILL'); } catch(e) {}
      process.exit(0);
    }, 3000);
  } else {
    process.exit(0);
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

startGateway();

// Keep event loop alive with a periodic health check
setInterval(() => {
  if (!child || child.exitCode !== null) {
    log('Health check: gateway not running, will restart');
  } else {
    // Check if gateway responds
    const http = require('http');
    const req = http.get('http://127.0.0.1:8080/api/health', (res) => {
      // Gateway is alive
    });
    req.on('error', () => {
      log('Health check: gateway not responding on 8080');
    });
    req.setTimeout(3000, () => {
      req.destroy();
    });
  }
}, 30000).unref();

log('Gateway Runner fully initialized, event loop active');
