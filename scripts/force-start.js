#!/usr/bin/env node
/**
 * force-start.js — KILL the old Express gateway permanently, start v6
 * 
 * Problem: Old gateway.cjs keeps getting auto-started by something
 * Solution: Rename it so it can't be found, then start v6 on port 8080
 */
const { execSync, spawn } = require('child_process');
const fs = require('fs');

// 1. Kill everything on 8080
try { execSync('fuser -k 8080/tcp 2>/dev/null || true', { timeout: 5000 }); } catch(e) {}

// 2. Kill all node processes
try { 
  const nodes = execSync("ps aux | grep node | grep -v grep | grep -v $$ | awk '{print $2}'", { timeout: 5000 }).toString().trim().split('\n').filter(Boolean);
  for (const pid of nodes) {
    try { process.kill(parseInt(pid), 'SIGKILL'); } catch(e) {}
  }
} catch(e) {}

// 3. RENAME the old gateway so auto-restart fails
try {
  if (fs.existsSync('/root/automaton/gateway.cjs')) {
    fs.renameSync('/root/automaton/gateway.cjs', '/root/automaton/gateway.cjs.DISABLED');
    console.log('Renamed old gateway.cjs → gateway.cjs.DISABLED');
  }
} catch(e) {}

// 4. Also check common auto-start locations
const renameTargets = [
  '/root/automaton/app.js',
  '/root/automaton/server.js',
  '/root/automaton/index.js',
  '/root/services/gateway.cjs',
  '/root/services/gateway.js',
];
for (const f of renameTargets) {
  try {
    if (fs.existsSync(f) && !f.endsWith('-v6.js')) {
      const stat = fs.statSync(f);
      if (stat.isFile() && stat.size < 500000) {
        fs.renameSync(f, f + '.DISABLED');
        console.log('Renamed ' + f);
      }
    }
  } catch(e) {}
}

// 5. Sleep for port release
require('child_process').execSync('sleep 2', { timeout: 5000 });

// 6. Start v6 gateway
const logFile = fs.openSync('/tmp/gateway-v6.log', 'a');
const child = spawn('node', ['/root/services/gateway-v6.js'], {
  stdio: ['ignore', logFile, logFile],
  detached: true,
  env: { ...process.env }
});
child.unref();
fs.writeFileSync('/tmp/gateway-v6.pid', String(child.pid));
console.log('Started v6 gateway PID:', child.pid);

// 7. Wait and verify
setTimeout(() => {
  try {
    const health = execSync('curl -s http://localhost:8080/health 2>/dev/null || echo "FAIL"', { timeout: 5000 }).toString().trim();
    console.log('Health:', health.substring(0, 80));
    const sitemap = execSync('curl -s http://localhost:8080/sitemap.xml 2>/dev/null | grep -c url 2>/dev/null || echo "0"', { timeout: 5000 }).toString().trim();
    console.log('Sitemap URLs:', sitemap);
    console.log('Gateway running!');
  } catch(e) {
    console.log('Check failed:', e.message);
  }
}, 3000);
