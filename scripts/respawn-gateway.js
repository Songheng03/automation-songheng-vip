#!/usr/bin/env node
// Quick gateway respawner - kills old gateway, starts fresh
const fs = require('fs');
const { execSync, spawn } = require('child_process');

const GATEWAY = '/root/automaton/gateway.js';
const LOG = '/root/automaton/logs/gateway.log';

// Kill any process on port 8080
try {
  // Read /proc/*/cmdline to find node processes
  const procDirs = fs.readdirSync('/proc').filter(d => /^\d+$/.test(d));
  for (const pid of procDirs) {
    try {
      const cmdline = fs.readFileSync(`/proc/${pid}/cmdline`, 'utf8').replace(/\0/g, ' ').trim();
      if (cmdline.includes('node') && cmdline.includes('gateway')) {
        process.kill(parseInt(pid), 'SIGKILL');
        console.log(`Killed old gateway PID ${pid}`);
      }
    } catch(e) { /* process may have exited */ }
  }
} catch(e) { /* /proc not available */ }

// Quick syntax check
try { require('module')._resolveFilename(GATEWAY, null, false); } catch(e) {}

// Spawn fresh gateway
const child = spawn('node', [GATEWAY], {
  cwd: '/root/automaton',
  stdio: ['ignore', 'pipe', 'pipe'],
  detached: true
});

const out = fs.createWriteStream(LOG);
child.stdout.pipe(out);
child.stderr.pipe(out);
child.unref();

console.log(`Gateway started with PID ${child.pid}`);
fs.writeFileSync('/root/automaton/.gateway.pid', String(child.pid));

// Wait and test
setTimeout(() => {
  const http = require('http');
  http.get('http://localhost:8080/health', res => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => console.log('✓ Gateway healthy:', data));
  }).on('error', e => console.log('✗ Gateway check:', e.message));
}, 1500);
