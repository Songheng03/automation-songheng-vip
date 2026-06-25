#!/usr/bin/env node
// Simple gateway restart that works
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const gatewayPath = path.join(__dirname, '..', 'gateway.js');

// Kill any process holding port 8080
try {
  const procDir = '/proc';
  for (const entry of fs.readdirSync(procDir)) {
    if (!/^\d+$/.test(entry)) continue;
    try {
      const cmd = fs.readFileSync(path.join(procDir, entry, 'cmdline'), 'utf8');
      if (cmd.includes('gateway')) {
        const pid = parseInt(entry);
        try { process.kill(pid, 'SIGKILL'); } catch(e) {}
      }
    } catch(e) {}
  }
} catch(e) {}

// Wait then start
setTimeout(() => {
  const log = fs.createWriteStream('/var/log/gateway.log', { flags: 'a' });
  const child = spawn('node', [gatewayPath], {
    cwd: path.join(__dirname, '..'),
    stdio: ['ignore', log, log],
    detached: true
  });
  child.unref();
  console.log(`Gateway PID: ${child.pid}`);
}, 1000);
