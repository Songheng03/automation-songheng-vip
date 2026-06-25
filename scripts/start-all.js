#!/usr/bin/env node
// start-all.js — Initialize data files, start sidecar + gateway
// Run ONCE after deployment

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const DIRS = [
  '/root/automaton/data',
  '/root/automaton/content/.well-known',
  '/root/automaton/content/assets',
  '/root/automaton/scripts',
  '/root/automaton/data/blog',
];

for (const d of DIRS) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

// === IndexNow key ===
const keyFile = '/root/automaton/data/indexnow-key.txt';
if (!fs.existsSync(keyFile)) {
  const key = require('crypto').randomBytes(16).toString('hex');
  fs.writeFileSync(keyFile, key);
  console.log(`[init] Created IndexNow key: ${key}`);
}
// Copy to .well-known
const key = fs.readFileSync(keyFile, 'utf-8').trim();
fs.writeFileSync('/root/automaton/content/.well-known/now.txt', key);

// === Visitors DB ===
const vFile = '/root/automaton/data/visitors.json';
if (!fs.existsSync(vFile)) fs.writeFileSync(vFile, '[]');

// === Referrals DB ===
const rFile = '/root/automaton/data/referrals.json';
if (!fs.existsSync(rFile)) fs.writeFileSync(rFile, '[]');

// === AI service DB ===
const aFile = '/root/automaton/data/ai-service-db.json';
if (!fs.existsSync(aFile)) fs.writeFileSync(aFile, JSON.stringify({ freeTier: {}, requests: 0 }));

// === Access log ===
const aLog = '/root/automaton/data/access.log';
if (!fs.existsSync(aLog)) fs.writeFileSync(aLog, '');

console.log('[init] All data files initialized');

// === Kill old processes ===
console.log('[init] Killing old processes...');
try { execSync('pkill -f "node.*api-sidecar" 2>/dev/null || true'); } catch(e) {}
try { execSync('pkill -f "node.*gateway.js" 2>/dev/null || true'); } catch(e) {}
try { execSync('fuser -k 8080/tcp 2>/dev/null || true'); } catch(e) {}
try { execSync('fuser -k 3099/tcp 2>/dev/null || true'); } catch(e) {}

setTimeout(() => {
  // === Start api-sidecar ===
  console.log('[init] Starting api-sidecar on port 3099...');
  const logFd1 = fs.openSync('/var/log/sidecar.log', 'a');
  const sidecar = spawn('node', ['/root/services/api-sidecar.js'], {
    stdio: ['ignore', logFd1, logFd1],
    detached: true
  });
  fs.closeSync(logFd1);
  sidecar.unref();
  console.log(`[init] api-sidecar started (pid ${sidecar.pid})`);

  setTimeout(() => {
    // === Start gateway ===
    console.log('[init] Starting v12 gateway on port 8080...');
    const logFd2 = fs.openSync('/var/log/gateway.log', 'a');
    const gateway = spawn('node', ['/root/automaton/gateway.js'], {
      stdio: ['ignore', logFd2, logFd2],
      detached: true,
      env: { ...process.env, NODE_ENV: 'production' }
    });
    fs.closeSync(logFd2);
    gateway.unref();
    const pidFile = '/root/automaton/data/gateway.pid';
    fs.writeFileSync(pidFile, gateway.pid.toString());
    console.log(`[init] Gateway started (pid ${gateway.pid})`);

    // === Verify ===
    setTimeout(() => {
      const http = require('http');
      const checks = [
        '/health',
        '/.well-known/now.txt',
        '/api/free-count',
        '/api/stats/visitors',
        '/api/referral/list'
      ];
      
      let allOk = true;
      for (const url of checks) {
        try {
          const req = http.get({ host: 'localhost', port: 8080, path: url, timeout: 3000 }, (res) => {
            let d = '';
            res.on('data', c => d += c);
            res.on('end', () => {
              const ok = res.statusCode === 200;
              console.log(`  ${ok ? '✅' : '❌'} ${url} → ${res.statusCode}`);
              if (!ok) allOk = false;
            });
          });
          req.setTimeout(3000, () => { req.destroy(); });
        } catch(e) {
          console.log(`  ❌ ${url} → ${e.message}`);
          allOk = false;
        }
      }
      
      setTimeout(() => {
        if (allOk) console.log('\n✅ All systems operational!');
        else console.log('\n⚠️ Some checks failed, check logs');
      }, 500);
    }, 1500);
  }, 1000);
}, 1000);
