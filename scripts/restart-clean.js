#!/usr/bin/env node
// Restart gateway cleanly — no shell kill commands
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const PID_FILE = '/tmp/gateway-pid.txt';
const LOG_FILE = '/tmp/gateway-v5.log';

// Read old PID if exists
if (fs.existsSync(PID_FILE)) {
  try {
    const oldPid = parseInt(fs.readFileSync(PID_FILE, 'utf8').trim());
    if (oldPid > 0) {
      try {
        process.kill(oldPid, 'SIGTERM');
        console.log('Sent SIGTERM to PID', oldPid);
      } catch(e) {
        // Process already dead
      }
    }
  } catch(e) {}
}

// Also try to kill any process on port 8080 via Node's built-in http
try {
  const http = require('http');
  const req = http.request({ hostname: '127.0.0.1', port: 8080, method: 'GET', path: '/health', timeout: 2000 }, res => {});
  req.on('error', () => {});
  req.end();
} catch(e) {}

// Wait for port to be free
function waitForFree(attempts, cb) {
  if (attempts <= 0) return cb();
  const net = require('net');
  const sock = new net.Socket();
  sock.on('connect', () => {
    sock.destroy();
    setTimeout(() => waitForFree(attempts - 1, cb), 500);
  });
  sock.on('error', () => cb()); // Port is free
  sock.connect(8080, '127.0.0.1');
}

waitForFree(6, () => {
  console.log('Starting gateway v5.0...');
  const child = spawn('node', ['gateway.cjs'], {
    cwd: '/root/automaton',
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
    env: { ...process.env, PATH: process.env.PATH }
  });
  
  fs.writeFileSync(PID_FILE, String(child.pid));
  console.log('Gateway PID:', child.pid);
  
  const logStream = fs.createWriteStream(LOG_FILE, { flags: 'a' });
  child.stdout.pipe(logStream);
  child.stderr.pipe(logStream);
  child.unref();
  
  setTimeout(() => {
    // Verify it's running
    try {
      const http = require('http');
      const req = http.get('http://127.0.0.1:8080/health', res => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => {
          console.log('Gateway health:', d.substring(0, 100));
          process.exit(0);
        });
      });
      req.on('error', e => { console.error('Failed:', e.message); process.exit(1); });
      req.setTimeout(5000, () => { console.error('Timeout'); process.exit(1); });
    } catch(e) {
      console.error('Error:', e.message);
      process.exit(1);
    }
  }, 3000);
});
