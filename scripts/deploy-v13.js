#!/usr/bin/env node
// deploy-v13.js — Atomic deploy: kill old gateway, start v13, verify
const { execSync, spawn } = require('child_process');
const fs = require('fs');

// Kill old using pgrep (NOT kill <pid> directly)
try { execSync('pgrep -f "node.*gateway" | while read pid; do kill -9 $pid 2>/dev/null; done', { shell: '/bin/bash', timeout: 5000 }); } catch(e) {}
try { execSync('pgrep -f "node.*api-sidecar" | while read pid; do kill -9 $pid 2>/dev/null; done', { shell: '/bin/bash', timeout: 5000 }); } catch(e) {}

setTimeout(() => {
  // Ensure data files
  for (const f of ['indexnow-key.txt','visitors.json','referrals.json','ai-service-db.json']) {
    const p = '/root/automaton/data/' + f;
    if (!fs.existsSync(p) || fs.statSync(p).size === 0) {
      if (f.endsWith('.json')) fs.writeFileSync(p, f === 'ai-service-db.json' ? '{}' : '[]');
      else fs.writeFileSync(p, require('crypto').randomBytes(16).toString('hex'));
    }
  }
  
  // Start gateway
  const log = fs.openSync('/var/log/gateway.log', 'a');
  const child = spawn('node', ['/root/automaton/gateway.js'], { stdio: ['ignore', log, log], detached: true });
  fs.closeSync(log);
  child.unref();
  fs.writeFileSync('/root/automaton/data/gateway.pid', String(child.pid));
  console.log('Gateway started (pid ' + child.pid + ')');

  // Verify
  setTimeout(() => {
    const http = require('http');
    const routes = ['/health','/.well-known/now.txt','/api/free-count','/api/stats/visitors','/api/referral/list','/api/blog','/api/catalog'];
    let ok = 0;
    routes.forEach(r => {
      const req = http.get({ host:'localhost', port:8080, path:r, timeout:2000 }, res => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => {
          const status = res.statusCode === 200 ? '✅' : '❌';
          console.log(`  ${status} ${r} → ${res.statusCode}`);
          if (res.statusCode === 200) ok++;
          if (++done === routes.length) finalize(ok, routes.length);
        });
      });
      req.on('error', e => { console.log(`  ❌ ${r} → ${e.message}`); if (++done === routes.length) finalize(ok, routes.length); });
      req.setTimeout(2000, () => { req.destroy(); if (++done === routes.length) finalize(ok, routes.length); });
    });
    let done = 0;
    function finalize(ok, total) { console.log(`\n${ok}/${total} routes OK`); if (ok === total) console.log('✅ GATEWAY v13 FULLY OPERATIONAL'); }
  }, 1500);
}, 1000);
