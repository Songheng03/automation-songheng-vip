#!/usr/bin/env node
/**
 * Gateway Launcher - captures all output, auto-restarts on crash
 * Usage: node start-gateway.js
 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const LOGFILE = '/var/log/gateway-combined.log';
const PIDFILE = '/tmp/gateway.pid';

function log(msg) {
  const line = `[launcher ${new Date().toISOString()}] ${msg}`;
  console.log(line);
  fs.appendFileSync(LOGFILE, line + '\n');
}

// Kill anything on port 8080 first
try {
  require('child_process').execSync('fuser -k 8080/tcp 2>/dev/null', { timeout: 3000 });
} catch(e) {}

let restartCount = 0;
function start() {
  log(`Starting gateway (attempt ${++restartCount})...`);
  
  const proc = spawn('node', ['/root/automaton/gateway.js'], {
    cwd: '/root/automaton',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, NODE_PATH: '/usr/lib/node_modules' }
  });

  fs.writeFileSync(PIDFILE, String(proc.pid));
  log(`PID: ${proc.pid}`);

  proc.stdout.on('data', (d) => {
    fs.appendFileSync(LOGFILE, d.toString());
  });
  proc.stderr.on('data', (d) => {
    fs.appendFileSync(LOGFILE, '[STDERR] ' + d.toString());
  });

  proc.on('exit', (code, signal) => {
    log(`Gateway exited (code=${code}, signal=${signal})`);
    fs.unlinkSync(PIDFILE);
    // Auto-restart unless it crashed within first 5 seconds 3 times in a row
    if (restartCount < 3 || code === 0) {
      setTimeout(start, 1000);
    } else {
      log('CRASH LOOP DETECTED. Giving up.');
      log('Last 20 lines:');
      const lines = fs.readFileSync(LOGFILE, 'utf-8').split('\n').slice(-20).join('\n');
      log(lines);
    }
  });

  proc.on('error', (err) => {
    log(`Failed to spawn: ${err.message}`);
    setTimeout(start, 2000);
  });
}

start();
