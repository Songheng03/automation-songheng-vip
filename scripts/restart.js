#!/usr/bin/env node
// restart.js — Kill old gateway, wait for port free, start fresh with current code
const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const net = require('net');
const http = require('http');

const GATEWAY = path.join(__dirname, '..', 'gateway.js');
const LOG = '/var/log/gateway.log';

console.log('=== Gateway Restart ===');
console.log('Gateway path:', GATEWAY);
console.log('Gateway exists:', fs.existsSync(GATEWAY));

// 1. Find and kill all node gateway processes
try {
  const procDir = '/proc';
  const entries = fs.readdirSync(procDir);
  for (const entry of entries) {
    if (!/^\d+$/.test(entry)) continue;
    try {
      const cmdline = fs.readFileSync(path.join(procDir, entry, 'cmdline'), 'utf8');
      if (cmdline.includes('gateway')) {
        const pid = parseInt(entry);
        if (pid !== process.pid) {
          console.log(`Killing gateway PID ${pid}...`);
          try { process.kill(pid, 'SIGKILL'); } catch(e) {}
        }
      }
    } catch(e) {}
  }
} catch(e) { console.log('Error finding gateways:', e.message); }

// 2. Wait for port to be free
function waitForPort(cb) {
  const sock = new net.Socket();
  sock.on('connect', () => {
    sock.destroy();
    setTimeout(() => waitForPort(cb), 300);
  });
  sock.on('error', () => cb());
  sock.connect(8080, '0.0.0.0');
}

waitForPort(() => {
  console.log('Port 8080 is free. Starting gateway...');
  
  const logStream = fs.createWriteStream(LOG, { flags: 'a' });
  const child = spawn('node', [GATEWAY], {
    cwd: path.join(__dirname, '..'),
    stdio: ['ignore', logStream, logStream],
    detached: true
  });
  child.unref();
  
  console.log(`Gateway PID: ${child.pid}`);
  
  // 3. Verify it started
  setTimeout(() => {
    const req = http.get('http://localhost:8080/health', (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        console.log(`Health check: ${res.statusCode}`);
        console.log('Response:', data.substring(0, 200));
        
        // Test routes
        const testRoutes = ['/', '/dashboard', '/tools', '/api-docs', '/blog'];
        let tested = 0;
        for (const route of testRoutes) {
          http.get(`http://localhost:8080${route}`, (res2) => {
            console.log(`GET ${route} => ${res2.statusCode}`);
            tested++;
            if (tested === testRoutes.length) process.exit(0);
          });
        }
      });
    });
    req.on('error', (e) => {
      console.error('Gateway failed to start:', e.message);
      console.error('Last log lines:');
      try { console.log(fs.readFileSync(LOG, 'utf8').split('\n').slice(-10).join('\n')); } catch(e2){}
      process.exit(1);
    });
  }, 2000);
});
