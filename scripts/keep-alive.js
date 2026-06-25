#!/usr/bin/env node
/**
 * Keep cloudflared tunnel alive forever.
 * Spawns cloudflared as child, restarts if it dies.
 * Reports tunnel URL to /root/automaton/data/tunnel-live.json
 */
const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');

const CLOUDFLARED = '/usr/local/bin/cloudflared';
const STATUS_FILE = '/root/automaton/data/tunnel-live.json';
const TUNNEL_URL_FILE = '/root/automaton/data/tunnel-url.txt';

let tunnelUrl = null;
let startedAt = null;

function checkGateway() {
  return new Promise((resolve) => {
    const req = http.get('http://127.0.0.1:8080/health', (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ ok: true, status: res.statusCode }));
    });
    req.on('error', e => resolve({ ok: false, error: e.message }));
    req.setTimeout(3000, () => { req.destroy(); resolve({ ok: false, error: 'timeout' }); });
  });
}

function writeStatus(state, detail) {
  const status = {
    timestamp: new Date().toISOString(),
    state,
    detail,
    tunnelUrl,
    uptime: startedAt ? Math.floor((Date.now() - startedAt) / 1000) + 's' : null,
    pid: process.pid
  };
  fs.writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2));
}

function startTunnel() {
  return new Promise((resolve) => {
    const proc = spawn(CLOUDFLARED, [
      'tunnel', '--url', 'http://localhost:8080', '--no-autoupdate'
    ], {
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false
    });

    proc.stdout.on('data', (data) => {
      const text = data.toString();
      const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
      if (match && !tunnelUrl) {
        tunnelUrl = match[0];
        startedAt = Date.now();
        fs.writeFileSync(TUNNEL_URL_FILE, tunnelUrl);
        console.log(`TUNNEL URL: ${tunnelUrl}`);
        writeStatus('running', `Tunnel URL: ${tunnelUrl}`);
      }
    });

    proc.stderr.on('data', (data) => {
      const text = data.toString();
      const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
      if (match && !tunnelUrl) {
        tunnelUrl = match[0];
        startedAt = Date.now();
        fs.writeFileSync(TUNNEL_URL_FILE, tunnelUrl);
        console.log(`TUNNEL URL: ${tunnelUrl}`);
        writeStatus('running', `Tunnel URL: ${tunnelUrl}`);
      }
    });

    proc.on('close', (code) => {
      console.log(`cloudflared exited (code ${code})`);
      tunnelUrl = null;
      writeStatus('exited', `Code: ${code}`);
      // Restart after 2 seconds
      setTimeout(() => {
        console.log('Restarting cloudflared...');
        startTunnel();
      }, 2000);
    });

    proc.on('error', (err) => {
      console.error(`cloudflared error: ${err.message}`);
      writeStatus('error', err.message);
      setTimeout(() => {
        console.log('Retrying cloudflared...');
        startTunnel();
      }, 5000);
    });

    // Keep reference
    global.cloudflaredProc = proc;
    resolve(proc);
  });
}

async function main() {
  console.log('=== KEEP-ALIVE DAEMON ===');
  
  // Check gateway
  const gw = await checkGateway();
  if (!gw.ok) {
    console.error(`Gateway unreachable: ${gw.error}`);
    writeStatus('failed', `Gateway unreachable: ${gw.error}`);
    process.exit(1);
  }
  console.log(`Gateway OK: ${gw.status}`);

  // Start tunnel
  await startTunnel();
  
  // Periodic health check
  setInterval(async () => {
    const gw = await checkGateway();
    if (!gw.ok) {
      console.error(`Gateway lost: ${gw.error}`);
      writeStatus('degraded', `Gateway lost: ${gw.error}`);
    }
  }, 30000);

  // Report status every 5 minutes
  setInterval(() => {
    if (global.cloudflaredProc) {
      try {
        const alive = global.cloudflaredProc.exitCode === null;
        writeStatus(alive ? 'running' : 'dead', tunnelUrl ? `URL: ${tunnelUrl}` : 'No URL yet');
      } catch(e) {
        writeStatus('unknown', e.message);
      }
    }
  }, 300000);

  // Keep alive forever
  console.log('Daemon running. Press Ctrl+C to stop.');
}

main().catch(err => {
  console.error(`FATAL: ${err.message}`);
  writeStatus('fatal', err.message);
  process.exit(1);
});
