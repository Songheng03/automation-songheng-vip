#!/usr/bin/env node
/**
 * start-v6.js — Kill old gateway, start v6, verify
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PORT = 8080;
const PID_FILE = '/var/run/gateway-v6.pid';
const LOG_FILE = '/tmp/gateway-v6.log';

function findGatewayPids() {
  // Read /proc to find node processes on port 8080
  const pids = [];
  try {
    const procDirs = fs.readdirSync('/proc').filter(d => /^\d+$/.test(d));
    for (const pid of procDirs) {
      try {
        const cmdline = fs.readFileSync('/proc/' + pid + '/cmdline', 'utf8');
        if (cmdline.includes('node') && (cmdline.includes('gateway') || cmdline.includes('gateway-v6'))) {
          // Check if it has port 8080
          try {
            const fdDir = '/proc/' + pid + '/fd';
            const fds = fs.readdirSync(fdDir);
            for (const fd of fds) {
              try {
                const link = fs.readlinkSync(path.join(fdDir, fd));
                if (link.includes(':8080') || link.includes('TCP')) {
                  pids.push(parseInt(pid));
                  break;
                }
              } catch(e) {}
            }
          } catch(e) {}
        }
      } catch(e) {}
    }
  } catch(e) {}
  return pids;
}

// Alternative: just try connecting and see if port is in use
function isPortInUse() {
  return new Promise(resolve => {
    const sock = require('net').createConnection(PORT, '127.0.0.1', () => {
      sock.destroy();
      resolve(true);
    });
    sock.on('error', () => resolve(false));
    sock.setTimeout(2000, () => { sock.destroy(); resolve(false); });
  });
}

async function main() {
  // Check if port is in use
  const inUse = await isPortInUse();
  if (inUse) {
    console.log('Port', PORT, 'is in use. Sending kill to old processes...');
    try {
      // Kill by reading /proc
      const procDirs = fs.readdirSync('/proc').filter(d => /^\d+$/.test(d));
      for (const pid of procDirs) {
        try {
          const cmdline = fs.readFileSync('/proc/' + pid + '/cmdline', 'utf8');
          if (cmdline.includes('gateway')) {
            try { process.kill(parseInt(pid), 'SIGKILL'); console.log('Killed PID', pid); } catch(e) {}
          }
        } catch(e) {}
      }
    } catch(e) {}
    
    // Wait for port to free
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Start v6 gateway
  console.log('Starting gateway-v6.js on port', PORT, '...');
  const child = spawn('node', ['/root/services/gateway-v6.js'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
    env: { ...process.env }
  });
  child.unref();
  
  const log = fs.createWriteStream(LOG_FILE, { flags: 'a' });
  child.stdout.pipe(log);
  child.stderr.pipe(log);
  
  // Write PID
  fs.writeFileSync(PID_FILE, String(child.pid));
  console.log('Gateway PID:', child.pid);
  
  // Wait and verify
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Test
  try {
    const result = await new Promise((resolve, reject) => {
      http.get('http://127.0.0.1:' + PORT + '/health', res => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => resolve(d.substring(0, 200)));
      }).on('error', reject);
    });
    console.log('Health check OK:', result);
  } catch(e) {
    console.error('Health check failed:', e.message);
    // Try reading log
    try { console.log('Last log lines:', fs.readFileSync(LOG_FILE, 'utf8').split('\n').slice(-5).join('\n')); } catch(e2) {}
  }
  
  console.log('Done! Gateway should be running.');
}

main().catch(console.error);
