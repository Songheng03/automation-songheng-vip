#!/usr/bin/env node
// find-and-restart.js — Find running gateway process, send SIGUSR2 or SIGKILL, restart
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PID_FILE = '/var/run/gateway.pid';
const LOG_FILE = '/var/log/gateway.log';
const GATEWAY_JS = path.join(__dirname, '..', 'gateway.js');

// Try to find gateway by checking PID file
let oldPid = null;
try {
  oldPid = parseInt(fs.readFileSync(PID_FILE, 'utf8').trim());
  console.log(`Found PID file: ${oldPid}`);
  // Try SIGUSR2 first (graceful restart)
  try { process.kill(oldPid, 'SIGUSR2'); console.log('Sent SIGUSR2'); } catch(e) { oldPid = null; }
} catch(e) { oldPid = null; }

// Wait, then kill any remaining process on port 8080
setTimeout(() => {
  try {
    // Use lsof or /proc to find anything on 8080
    const procs = fs.readdirSync('/proc').filter(p => /^\d+$/.test(p));
    for (const pid of procs) {
      try {
        const fdDir = '/proc/' + pid + '/fd';
        if (!fs.existsSync(fdDir)) continue;
        const fds = fs.readdirSync(fdDir);
        for (const fd of fds) {
          try {
            const link = fs.readlinkSync(fdDir + '/' + fd);
            if (link.includes('tcp') && link.includes('8080')) {
              console.log(`Found process ${pid} on port 8080, killing...`);
              process.kill(parseInt(pid), 'SIGKILL');
            }
          } catch(e) {}
        }
      } catch(e) {}
    }
  } catch(e) { console.log('Could not scan /proc'); }

  // Wait for port to be free
  setTimeout(() => {
    const http = require('http');
    const testConn = () => {
      const sock = new require('net').Socket();
      sock.on('connect', () => { sock.destroy(); console.log('Port still in use, waiting...'); setTimeout(testConn, 500); });
      sock.on('error', () => { startGateway(); });
      sock.connect(8080, '0.0.0.0');
    };
    testConn();
  }, 1000);
}, 1000);

function startGateway() {
  console.log('Starting gateway...');
  const child = spawn('node', [GATEWAY_JS], {
    cwd: path.join(__dirname, '..'),
    stdio: ['ignore', fs.openSync(LOG_FILE, 'a'), fs.openSync(LOG_FILE, 'a')],
    detached: true
  });
  child.unref();
  
  // Write PID
  try { fs.writeFileSync(PID_FILE, String(child.pid)); } catch(e) {}
  console.log(`Gateway started with PID ${child.pid}`);
  
  // Test after 2s
  setTimeout(() => {
    const http = require('http');
    const test = (url, label) => {
      http.get(url, (res) => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => console.log(`${label}: ${res.statusCode}`));
      }).on('error', (e) => console.log(`${label}: FAIL - ${e.message}`));
    };
    test('http://localhost:8080/health', 'health');
    test('http://localhost:8080/dashboard', 'dashboard');
    test('http://localhost:8080/tools', 'tools');
    test('http://localhost:8080/ai-code-reviewer', 'reviewer');
  }, 2000);
}
