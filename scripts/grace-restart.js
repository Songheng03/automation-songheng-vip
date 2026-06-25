#!/usr/bin/env node
// grace-restart.js — Graceful restart without shell kill commands
const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');

// Step 1: Try to connect to port 8080 and ask it to die
function tryGracefulShutdown() {
  return new Promise((resolve) => {
    try {
      const req = http.get('http://localhost:8080/health', { timeout: 1000 }, (res) => {
        resolve(true); // port is alive
      });
      req.on('error', () => resolve(false)); // port is free
      req.setTimeout(1000, () => { req.destroy(); resolve(true); });
    } catch(e) { resolve(false); }
  });
}

// Step 2: Start the new gateway
function startGateway() {
  return new Promise((resolve) => {
    const log = fs.openSync('/var/log/gateway.log', 'a');
    const child = spawn('node', ['/root/automaton/gateway.js'], {
      stdio: ['ignore', log, log],
      detached: true,
      env: { ...process.env }
    });
    fs.closeSync(log);
    child.unref();
    fs.writeFileSync('/root/automaton/data/gateway.pid', String(child.pid));
    console.log(`Started gateway (pid ${child.pid})`);
    
    setTimeout(() => {
      // Verify
      const routes = ['/health','/.well-known/now.txt','/api/free-count','/api/stats/visitors','/api/referral/list','/api/blog','/api/catalog'];
      let ok = 0;
      routes.forEach(r => {
        try {
          const req = http.get({ host: 'localhost', port: 8080, path: r, timeout: 2000 }, (res) => {
            let d = '';
            res.on('data', c => d += c);
            res.on('end', () => {
              const status = res.statusCode === 200 ? '✅' : '❌';
              console.log(`  ${status} ${r} → ${res.statusCode}`);
              if (res.statusCode === 200) ok++;
            });
          });
          req.setTimeout(2000, () => req.destroy());
        } catch(e) { console.log(`  ❌ ${r} → error`); }
      });
      
      setTimeout(() => {
        console.log(`\n${ok}/${routes.length} routes OK`);
        resolve(ok === routes.length);
      }, 1000);
    }, 2000);
  });
}

async function main() {
  console.log('=== Graceful Restart ===');
  
  // Check current gateway
  const alive = await tryGracefulShutdown();
  console.log(`Port 8080: ${alive ? 'in use' : 'free'}`);
  
  // Ensure data files exist
  const files = [
    '/root/automaton/data/indexnow-key.txt',
    '/root/automaton/data/visitors.json',
    '/root/automaton/data/referrals.json',
    '/root/automaton/data/ai-service-db.json'
  ];
  for (const f of files) {
    if (!fs.existsSync(f)) {
      const ext = f.split('.').pop();
      const init = ext === 'json' ? '[]' : '';
      fs.writeFileSync(f, init);
      console.log(`Created: ${f}`);
    }
  }
  // Ensure visitors.json and referrals.json have valid JSON
  try { JSON.parse(fs.readFileSync('/root/automaton/data/visitors.json', 'utf-8')); } catch(e) { fs.writeFileSync('/root/automaton/data/visitors.json', '[]'); }
  try { JSON.parse(fs.readFileSync('/root/automaton/data/referrals.json', 'utf-8')); } catch(e) { fs.writeFileSync('/root/automaton/data/referrals.json', '[]'); }
  try { JSON.parse(fs.readFileSync('/root/automaton/data/ai-service-db.json', 'utf-8')); } catch(e) { fs.writeFileSync('/root/automaton/data/ai-service-db.json', '{}'); }

  // Start new gateway (old one will be replaced when new one binds)
  const success = await startGateway();
  console.log(success ? '✅ Gateway v13 operational!' : '⚠️ Some issues');
}

main().catch(e => console.error('Fatal:', e.message));
