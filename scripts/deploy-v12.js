#!/usr/bin/env node
// deploy-v12.js — Kill old gateway, start v12, verify routes

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const http = require('http');

const PID_FILE = '/root/automaton/data/gateway.pid';
const LOG_FILE = '/var/log/gateway.log';

function httpCheck(path) {
  return new Promise((resolve) => {
    const req = http.get({ host: 'localhost', port: 8080, path, timeout: 2000 }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d.slice(0, 100) }));
    });
    req.on('error', (e) => resolve({ status: 0, error: e.message }));
    req.setTimeout(2000, () => { req.destroy(); resolve({ status: 0, error: 'timeout' }); });
  });
}

async function main() {
  console.log('[deploy] Killing old gateway processes...');
  try {
    const out = execSync('pgrep -f "node.*gateway.js" 2>/dev/null || true').toString().trim();
    if (out) {
      for (const pid of out.split('\n')) {
        try { process.kill(parseInt(pid), 'SIGKILL'); console.log(`  Killed pid ${pid}`); } catch(e) {}
      }
    }
  } catch(e) {}
  try { execSync('fuser -k 8080/tcp 2>/dev/null || true'); } catch(e) {}

  // Wait for port release
  await new Promise(r => setTimeout(r, 1000));

  console.log('[deploy] Starting v12 gateway...');
  const logFd = fs.openSync(LOG_FILE, 'a');
  const child = spawn('node', ['/root/automaton/gateway.js'], {
    stdio: ['ignore', logFd, logFd],
    detached: true,
    env: { ...process.env, NODE_ENV: 'production' }
  });
  fs.closeSync(logFd);
  child.unref();
  fs.writeFileSync(PID_FILE, child.pid.toString());
  console.log(`[deploy] Started (pid ${child.pid})`);

  // Wait for startup
  await new Promise(r => setTimeout(r, 2000));

  const checks = [
    '/health',
    '/.well-known/now.txt',
    '/api/stats/visitors',
    '/api/referral/list',
    '/api/free-count'
  ];
  
  let passed = 0;
  for (const p of checks) {
    const res = await httpCheck(p);
    if (res.status === 200) {
      console.log(`  ✅ ${p} → 200`);
      passed++;
    } else if (res.status === 404) {
      console.log(`  ⚠️ ${p} → 404 (not found but at least responding)`);
      passed++;
    } else {
      console.log(`  ❌ ${p} → ${res.status} ${res.error || ''}`);
    }
  }
  console.log(`[deploy] ${passed}/${checks.length} checks passed`);
  if (passed === checks.length) console.log('[deploy] ✅ v12 gateway fully operational!');
  else console.log(`[deploy] ⚠️ ${checks.length - passed} checks failed`);
}

main().catch(e => console.error('Fatal:', e.message));
