#!/usr/bin/env node
// hard-restart.js — Kill everything, start v12 gateway fresh, verify once
const { execSync, spawn } = require('child_process');
const fs = require('fs');
const http = require('http');

console.log('=== HARD RESTART: v12 Gateway ===');

// 1. Nuclear kill — everything on 8080 or running gateway
try { execSync('fuser -k 8080/tcp 2>/dev/null', { timeout: 3000 }); } catch(e) {}
try { execSync('pkill -9 -f "node.*gateway" 2>/dev/null', { timeout: 3000 }); } catch(e) {}
try { execSync('pkill -9 -f "api-sidecar" 2>/dev/null', { timeout: 3000 }); } catch(e) {}

// Wait for port to free
setTimeout(() => {
  // Check port is free
  try {
    const check = execSync('fuser 8080/tcp 2>&1 || true', { timeout: 2000 }).toString().trim();
    if (check.includes('8080')) {
      console.log('Port 8080 still in use, killing harder...');
      try { execSync('fuser -k -9 8080/tcp 2>/dev/null'); } catch(e) {}
      setTimeout(startGateway, 1000);
    } else {
      startGateway();
    }
  } catch(e) {
    startGateway();
  }

  function startGateway() {
    console.log('Starting v12 gateway...');
    const log = fs.openSync('/var/log/gateway.log', 'a');
    const child = spawn('node', ['/root/automaton/gateway.js'], {
      stdio: ['ignore', log, log],
      detached: true,
      env: { ...process.env }
    });
    fs.closeSync(log);
    child.unref();
    fs.writeFileSync('/root/automaton/data/gateway.pid', String(child.pid));
    console.log(`Started: pid ${child.pid}`);

    // Verify after 2s
    setTimeout(() => {
      console.log('\nVerifying routes:');
      const routes = ['/health','/.well-known/now.txt','/api/free-count','/api/stats/visitors','/api/referral/list'];
      let ok = 0;
      routes.forEach(r => {
        try {
          const res = execSync(`curl -s -o /dev/null -w "%{http_code}" http://localhost:8080${r}`, { timeout: 3000 }).toString().trim();
          const status = res === '200' ? '✅' : '❌';
          console.log(`  ${status} ${r} → ${res}`);
          if (res === '200') ok++;
        } catch(e) { console.log(`  ❌ ${r} → error`); }
      });
      console.log(`\n${ok}/${routes.length} routes OK`);
      if (ok === routes.length) console.log('✅ GATEWAY FULLY OPERATIONAL');
      else console.log('⚠️ Some routes failed');
    }, 2000);
  }
}, 1500);
