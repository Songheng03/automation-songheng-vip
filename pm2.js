#!/usr/bin/env node
/**
 * Process Manager for gateway.js
 * Usage: node pm2.js {start|stop|restart|status}
 * Lightweight process management without external dependencies.
 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const PID_FILE = '/tmp/gateway.pid';
const LOG_FILE = '/tmp/gateway-output.log';
const GATEWAY = '/root/automaton/gateway.js';
const PORT = 8080;

function readPid() {
  try { return parseInt(fs.readFileSync(PID_FILE, 'utf8').trim(), 10); } catch(e) { return null; }
}

function isRunning(pid) {
  try { return process.kill(pid, 0); } catch(e) { return false; }
}

function start() {
  const existing = readPid();
  if (existing && isRunning(existing)) {
    console.log('Gateway already running (PID:', existing, ')');
    return;
  }

  const log = fs.createWriteStream(LOG_FILE, { flags: 'a' });
  const child = spawn('node', [GATEWAY], {
    cwd: '/root/automaton',
    stdio: ['ignore', log, log],
    env: { ...process.env, PORT: String(PORT) },
    detached: true
  });

  fs.writeFileSync(PID_FILE, String(child.pid));
  child.unref();
  console.log('Gateway started (PID:', child.pid, ')');
}

function stop() {
  const pid = readPid();
  if (pid && isRunning(pid)) {
    try { process.kill(pid, 'SIGTERM'); } catch(e) {}
    console.log('Gateway stopped (PID:', pid, ')');
    fs.unlinkSync(PID_FILE);
  } else {
    console.log('Gateway not running');
  }
}

function status() {
  const pid = readPid();
  if (pid && isRunning(pid)) {
    console.log('Gateway: RUNNING (PID:', pid, ')');
    return;
  }
  console.log('Gateway: STOPPED');
}

const cmd = process.argv[2] || 'status';
const cmds = { start, stop, restart: () => { stop(); setTimeout(start, 1000); }, status };
if (cmds[cmd]) cmds[cmd]();
else console.log('Usage: node pm2.js {start|stop|restart|status}');
