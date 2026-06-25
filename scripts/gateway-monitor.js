#!/usr/bin/env node
/**
 * gateway-monitor.js — Ensures gateway is always running
 * Run as heartbeat entry to keep the revenue engine alive
 */
const { execSync } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const LOG = '/tmp/gateway-monitor.log';
const GATEWAY_DIR = '/root/automaton';
const GATEWAY_SCRIPT = 'gateway.js';

function log(msg) {
  const line = `[monitor] ${new Date().toISOString()} ${msg}`;
  console.log(line);
  fs.appendFileSync(LOG, line + '\n');
}

function checkGateway() {
  return new Promise((resolve) => {
    const req = http.get('http://127.0.0.1:8080/api/health', (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        resolve({ alive: res.statusCode === 200, status: res.statusCode, body: data });
      });
    });
    req.on('error', () => resolve({ alive: false, status: 0, body: '' }));
    req.setTimeout(5000, () => { req.destroy(); resolve({ alive: false, status: 0, body: 'timeout' }); });
  });
}

function startGateway() {
  try {
    // Kill any existing process on 8080
    execSync('fuser -k 8080/tcp 2>/dev/null', { timeout: 3000 });
    // Start gateway in background using exec in the sandbox
    const child = require('child_process').spawn('node', [GATEWAY_SCRIPT], {
      cwd: GATEWAY_DIR,
      stdio: ['ignore', fs.openSync('/tmp/gateway-v3.log', 'a'), fs.openSync('/tmp/gateway-v3.log', 'a')],
      detached: true
    });
    child.unref();
    log(`Gateway started (PID: ${child.pid})`);
    return true;
  } catch (e) {
    log(`Failed to start gateway: ${e.message}`);
    return false;
  }
}

async function main() {
  log('Checking gateway health...');
  const health = await checkGateway();
  
  if (!health.alive) {
    log(`Gateway DOWN (${health.status}). Restarting...`);
    startGateway();
    
    // Wait and verify
    await new Promise(r => setTimeout(r, 3000));
    const retry = await checkGateway();
    if (retry.alive) {
      log('Gateway restarted successfully');
    } else {
      log('Gateway failed to start');
    }
  } else {
    log(`Gateway healthy — ${health.body.slice(0, 60)}`);
  }
}

main().catch(e => log(`Error: ${e.message}`));
