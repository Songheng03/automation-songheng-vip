#!/usr/bin/env node
/**
 * CONTAINER-SIDE CLOUDFLARE TUNNEL LAUNCHER
 * 
 * Runs INSIDE the Docker container, bypassing the host's broken tunnel.
 * Uses the locally-installed cloudflared binary to create a tunnel
 * to localhost:8080.
 * 
 * Usage:
 *   node scripts/container-tunnel.mjs [--quickstart]
 *   --quickstart: one-shot tunnel test (for health checks)
 *   default: persistent tunnel that runs until killed
 */

import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import http from 'http';

const TUNNEL_NAME = 'automaton-container-tunnel';
const LOCAL_PORT = 8080;
const CLOUDFLARED_BIN = '/usr/local/bin/cloudflared';
const TUNNEL_DIR = '/root/automaton/data/cloudflare';
const STATUS_FILE = '/root/automaton/data/tunnel-status.json';
const LOG_FILE = '/root/automaton/data/cloudflared.log';
const PID_FILE = '/root/automaton/data/cloudflared.pid';
const CONFIG_FILE = path.join(TUNNEL_DIR, 'config.yml');
const CREDENTIALS_FILE = path.join(TUNNEL_DIR, 'credentials.json');

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  try {
    fs.appendFileSync(LOG_FILE, line + '\n');
  } catch(e) {}
}

function status(state, detail = '') {
  const s = {
    timestamp: new Date().toISOString(),
    state,
    detail,
    tunnelName: TUNNEL_NAME,
    localPort: LOCAL_PORT,
    pid: fs.existsSync(PID_FILE) ? parseInt(fs.readFileSync(PID_FILE, 'utf-8').trim()) : null,
    uptime: null
  };
  if (s.pid) {
    try {
      process.kill(s.pid, 0);
      s.alive = true;
    } catch(e) { s.alive = false; }
  }
  fs.writeFileSync(STATUS_FILE, JSON.stringify(s, null, 2));
}

function cleanup() {
  log('Cleaning up...');
  if (fs.existsSync(PID_FILE)) {
    const pid = parseInt(fs.readFileSync(PID_FILE, 'utf-8').trim());
    try {
      process.kill(pid, 'SIGTERM');
      log(`Killed cloudflared (PID ${pid})`);
    } catch(e) { /* already dead */ }
    try { fs.unlinkSync(PID_FILE); } catch(e) {}
  }
  status('stopped', 'Clean shutdown');
}

process.on('SIGINT', () => { cleanup(); process.exit(0); });
process.on('SIGTERM', () => { cleanup(); process.exit(0); });

// Check local gateway
function checkGateway() {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${LOCAL_PORT}/health`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ ok: true, status: res.statusCode, body: data }));
    });
    req.on('error', (e) => resolve({ ok: false, error: e.message }));
    req.setTimeout(3000, () => { req.destroy(); resolve({ ok: false, error: 'timeout' }); });
  });
}

async function ensureDirectories() {
  fs.mkdirSync(TUNNEL_DIR, { recursive: true });
}

async function setupQuickTunnel() {
  log('Starting quick tunnel (--quickstart mode)...');
  
  // Check gateway first
  const gw = await checkGateway();
  if (!gw.ok) {
    log(`ERROR: Gateway not reachable on localhost:${LOCAL_PORT}: ${gw.error}`);
    status('failed', `Gateway unreachable: ${gw.error}`);
    return null;
  }
  log(`Gateway healthy: ${gw.status}`);
  
  return new Promise((resolve) => {
    // Use cloudflared tunnel --url for quick tunnel (no auth needed!)
    const proc = spawn(CLOUDFLARED_BIN, [
      'tunnel',
      '--url', `http://localhost:${LOCAL_PORT}`,
      '--no-autoupdate'
    ], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env }
    });
    
    let output = '';
    let tunnelUrl = null;
    
    proc.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      process.stdout.write(text);
      log('[cloudflared] ' + text.trim());
      
      // Parse tunnel URL from output
      const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
      if (match) {
        tunnelUrl = match[0];
        log(`!!! TUNNEL URL: ${tunnelUrl}`);
        status('running', `Tunnel URL: ${tunnelUrl}`);
      }
    });
    
    proc.stderr.on('data', (data) => {
      const text = data.toString();
      process.stderr.write(text);
      log('[cloudflared:err] ' + text.trim());
      
      // Also check stderr for URL
      const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
      if (match) {
        tunnelUrl = match[0];
        log(`!!! TUNNEL URL: ${tunnelUrl}`);
        status('running', `Tunnel URL: ${tunnelUrl}`);
      }
    });
    
    proc.on('close', (code) => {
      log(`cloudflared exited with code ${code}`);
      status('exited', `Exit code: ${code}, Output: ${output.slice(0, 500)}`);
      resolve(null);
    });
    
    proc.on('error', (err) => {
      log(`Failed to start cloudflared: ${err.message}`);
      status('failed', err.message);
      resolve(null);
    });
    
    // Store PID
    fs.writeFileSync(PID_FILE, String(proc.pid));
    log(`Started cloudflared (PID ${proc.pid})`);
    
    // Wait for URL or timeout
    const checkInterval = setInterval(() => {
      if (tunnelUrl) {
        clearInterval(checkInterval);
        resolve(tunnelUrl);
      }
    }, 500);
    
    setTimeout(() => {
      clearInterval(checkInterval);
      if (tunnelUrl) resolve(tunnelUrl);
      else resolve(null);
    }, 15000);
  });
}

async function setupPersistentTunnel() {
  log('Setting up persistent tunnel...');
  
  // Check gateway first
  const gw = await checkGateway();
  if (!gw.ok) {
    log(`ERROR: Gateway not reachable on localhost:${LOCAL_PORT}: ${gw.error}`);
    status('failed', `Gateway unreachable: ${gw.error}`);
    return;
  }
  log(`Gateway healthy: ${gw.status}`);
  
  // Check if we already have credentials
  if (!fs.existsSync(CREDENTIALS_FILE)) {
    log('No credentials found. Using quick tunnel instead (trycloudflare.com)...');
    log('NOTE: Quick tunnel URL changes on restart. For permanent URL, run:');
    log('  cloudflared tunnel login');
    log('Then restart this script.');
    
    const url = await setupQuickTunnel();
    if (url) {
      log(`\n✅ TUNNEL RUNNING: ${url}\n`);
      log('Keep this process alive to maintain the tunnel.');
      // Write tunnel info
      fs.writeFileSync('/root/automaton/data/active-tunnel.json', JSON.stringify({
        url,
        started: new Date().toISOString(),
        type: 'quick-tunnel',
        pid: process.pid
      }, null, 2));
      
      // Verify tunnel works
      setTimeout(async () => {
        log('Verifying tunnel...');
        try {
          const resp = await fetch(`${url}/health`);
          const body = await resp.text();
          log(`Tunnel verification: ${resp.status} ${body.slice(0, 100)}`);
        } catch(e) {
          log(`Tunnel verification failed: ${e.message}`);
        }
      }, 5000);
    } else {
      log('❌ Failed to start tunnel');
    }
    return;
  }
  
  // We have credentials - use named tunnel
  log('Found existing credentials. Setting up named tunnel...');
  
  try {
    execSync(`${CLOUDFLARED_BIN} tunnel list`, { stdio: 'pipe' });
  } catch(e) {
    log('No tunnels exist yet. Creating...');
    try {
      execSync(`${CLOUDFLARED_BIN} tunnel create ${TUNNEL_NAME}`, { 
        stdio: 'pipe', 
        cwd: TUNNEL_DIR 
      });
    } catch(e2) {
      log(`Failed to create tunnel: ${e2.message}`);
      log('Falling back to quick tunnel...');
      await setupQuickTunnel();
      return;
    }
  }
  
  // Write config
  const config = `tunnel: ${TUNNEL_NAME}
credentials-file: ${CREDENTIALS_FILE}
ingress:
  - hostname: automation.songheng.vip
    service: http://localhost:${LOCAL_PORT}
  - service: http_status:404
`;
  fs.writeFileSync(CONFIG_FILE, config);
  
  // Start tunnel
  const proc = spawn(CLOUDFLARED_BIN, [
    'tunnel', 'run',
    '--config', CONFIG_FILE,
    '--no-autoupdate'
  ], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env }
  });
  
  proc.stdout.on('data', (data) => {
    const text = data.toString();
    log('[cloudflared] ' + text.trim());
  });
  
  proc.stderr.on('data', (data) => {
    const text = data.toString();
    log('[cloudflared:err] ' + text.trim());
  });
  
  proc.on('close', (code) => {
    log(`cloudflared exited with code ${code}`);
    status('exited', `Exit code: ${code}`);
  });
  
  proc.on('error', (err) => {
    log(`Failed to start cloudflared: ${err.message}`);
    status('failed', err.message);
  });
  
  fs.writeFileSync(PID_FILE, String(proc.pid));
  status('running', 'Named tunnel starting...');
}

async function main() {
  const args = process.argv.slice(2);
  const isQuickstart = args.includes('--quickstart');
  
  log('=== CONTAINER TUNNEL LAUNCHER ===');
  log(`Mode: ${isQuickstart ? 'Quick start (one-shot)' : 'Persistent'}`);
  
  await ensureDirectories();
  
  if (!fs.existsSync(CLOUDFLARED_BIN)) {
    log(`ERROR: cloudflared not found at ${CLOUDFLARED_BIN}`);
    status('failed', 'cloudflared binary not found');
    process.exit(1);
  }
  
  // Check version
  try {
    const version = execSync(`${CLOUDFLARED_BIN} --version`, { encoding: 'utf-8' }).trim();
    log(`cloudflared version: ${version}`);
  } catch(e) {
    log(`Warning: Could not get version: ${e.message}`);
  }
  
  if (isQuickstart) {
    // One-shot: start tunnel, wait for URL, print it, then exit
    const url = await setupQuickTunnel();
    if (url) {
      console.log(`\n✅ TUNNEL URL: ${url}`);
      console.log(`Keep the process running. PID: ${fs.readFileSync(PID_FILE, 'utf-8').trim()}`);
      // Keep alive for verification
      await new Promise(r => setTimeout(r, 10000));
    }
  } else {
    await setupPersistentTunnel();
    // Keep alive
    log('Tunnel launcher running. Press Ctrl+C to stop.');
  }
}

main().catch(err => {
  log(`FATAL: ${err.message}`);
  status('fatal', err.message);
  process.exit(1);
});
