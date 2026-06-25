#!/usr/bin/env node
/**
 * health-restarter.js — Self-healing service
 * Checks gateway health every 60s, restarts if down.
 * Run as a cron job or heartbeat task, not as a daemon.
 * 
 * Usage: node health-restarter.js  (exits after one check)
 *        node health-restarter.js watch  (runs continuously)
 */

const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const GATEWAY_SCRIPT = '/root/automaton/gateway.js';
const LOG_FILE = '/tmp/gateway-restart.log';
const HEALTH_URL = 'http://localhost:8080/api/health';

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + '\n');
}

function checkHealth() {
  return new Promise((resolve) => {
    const req = http.get(HEALTH_URL, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => resolve(res.statusCode === 200));
    });
    req.on('error', () => resolve(false));
    req.setTimeout(3000, () => { req.destroy(); resolve(false); });
  });
}

function startGateway() {
  return new Promise((resolve) => {
    const proc = spawn('node', [GATEWAY_SCRIPT], {
      cwd: '/root/automaton',
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false
    });
    
    proc.stdout.on('data', d => process.stdout.write(`[gateway] ${d}`));
    proc.stderr.on('data', d => process.stderr.write(`[gateway-err] ${d}`));
    
    proc.on('error', (err) => {
      log(`Failed to start gateway: ${err.message}`);
      resolve(false);
    });
    
    proc.on('exit', (code) => {
      log(`Gateway exited with code ${code}`);
      resolve(code === 0);
    });
    
    // Give it time to start
    setTimeout(async () => {
      const healthy = await checkHealth();
      log(`Gateway health after start: ${healthy}`);
      resolve(healthy);
    }, 2000);
  });
}

async function main() {
  const mode = process.argv[2];
  
  if (mode === 'watch') {
    log('Starting health watcher mode');
    while (true) {
      const healthy = await checkHealth();
      if (!healthy) {
        log('Gateway DOWN — restarting');
        await startGateway();
      } else {
        log('Gateway healthy');
      }
      await new Promise(r => setTimeout(r, 60000));
    }
  } else {
    // Single check mode
    const healthy = await checkHealth();
    log(`Health check: ${healthy ? 'OK' : 'DOWN'}`);
    if (!healthy) {
      log('Restarting gateway...');
      const result = await startGateway();
      process.exit(result ? 0 : 1);
    }
    process.exit(0);
  }
}

main().catch(e => {
  log(`Fatal: ${e.message}`);
  process.exit(1);
});
