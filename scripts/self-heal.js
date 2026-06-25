#!/usr/bin/env node
// self-heal.js - Process supervisor for my-automaton revenue services
// No crontab needed. Run once, keeps everything alive.
// Checks every 60s and auto-restarts dead processes.
// Also handles: daily DB reset, stats logging, health checks.

const http = require('http');
const fs = require('fs');
const { spawn } = require('child_process');
const path = require('path');

const LOG_DIR = '/root/automaton/logs';
const DATA_DIR = '/root/automaton/data';
const DB_PATH = DATA_DIR + '/ai-service-db.json';
const STATE_PATH = DATA_DIR + '/self-heal-state.json';

fs.mkdirSync(LOG_DIR, { recursive: true });
fs.mkdirSync(DATA_DIR, { recursive: true });

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  fs.appendFileSync(LOG_DIR + '/self-heal.log', line + '\n');
}

// Load/save persistent state
function loadState() {
  try { return JSON.parse(fs.readFileSync(STATE_PATH, 'utf8')); } catch(e) { return {}; }
}
function saveState(s) { fs.writeFileSync(STATE_PATH, JSON.stringify(s, null, 2)); }

let state = loadState();
if (!state.lastDailyReset) state.lastDailyReset = '';
if (!state.consecutiveFailures) state.consecutiveFailures = {};

// Services to monitor
const services = [
  { name: 'ai-service', port: 3030, cmd: 'node', args: ['/root/services/gateway-integration.js'] },
  { name: 'gateway', port: 8080, cmd: 'node', args: ['/root/automaton/gateway.js'] }
];

let procs = {};

function checkPort(port) {
  return new Promise(resolve => {
    const sock = new net.Socket();
    sock.setTimeout(2000);
    sock.on('connect', () => { sock.destroy(); resolve(true); });
    sock.on('error', () => resolve(false));
    sock.on('timeout', () => { sock.destroy(); resolve(false); });
    sock.connect(port, '127.0.0.1');
  });
}

function startService(svc) {
  log(`Starting ${svc.name}...`);
  const proc = spawn(svc.cmd, svc.args, {
    cwd: '/root',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, HOME: '/root', DEEPSEEK_API_KEY: getKey() }
  });
  proc.stdout.on('data', d => fs.appendFileSync(`${LOG_DIR}/${svc.name}.log`, d));
  proc.stderr.on('data', d => fs.appendFileSync(`${LOG_DIR}/${svc.name}.log`, `[ERR] ${d}`));
  proc.on('exit', (code) => {
    log(`${svc.name} exited (code ${code}). Will restart next check.`);
    delete procs[svc.name];
  });
  procs[svc.name] = proc;
  return proc;
}

function getKey() {
  try {
    const cfg = JSON.parse(fs.readFileSync('/root/.automaton/automaton.json', 'utf8'));
    return cfg.openaiApiKey || '';
  } catch(e) { return ''; }
}

async function checkAll() {
  log('=== Health check ===');
  const net = require('net');

  for (const svc of services) {
    const alive = await checkPort(svc.port);
    if (alive) {
      log(`${svc.name}: OK (port ${svc.port})`);
      state.consecutiveFailures[svc.name] = 0;
    } else {
      state.consecutiveFailures[svc.name] = (state.consecutiveFailures[svc.name] || 0) + 1;
      log(`${svc.name}: DOWN (port ${svc.port}, failure #${state.consecutiveFailures[svc.name]})`);
      startService(svc);
    }
  }

  // Daily DB reset at midnight-ish
  const today = new Date().toISOString().slice(0, 10);
  if (state.lastDailyReset !== today) {
    try {
      fs.unlinkSync(DB_PATH);
      log(`DB reset for ${today} - free requests refreshed`);
    } catch(e) {}
    state.lastDailyReset = today;
  }

  saveState(state);
}

// Initial startup
(async () => {
  const net = require('net');
  log('Self-heal monitor starting...');

  // Start any services not already running
  for (const svc of services) {
    const alive = await checkPort(svc.port);
    if (!alive) startService(svc);
  }

  log('Initial startup complete. Monitoring every 60s.');

  // Check every 60 seconds
  setInterval(checkAll, 60000);
})();
