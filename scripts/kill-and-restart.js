#!/usr/bin/env node
// kill-and-restart.js — Kills old gateway, starts new one, tests all routes
const { execSync, spawn } = require('child_process');

// 1. Kill existing gateway processes
try {
  const processes = execSync('ps aux | grep "node gateway.js" | grep -v grep', { encoding: 'utf8' }).trim();
  if (processes) {
    processes.split('\n').forEach(line => {
      const pid = parseInt(line.trim().split(/\s+/)[1]);
      if (pid) {
        try { process.kill(pid, 'SIGTERM'); console.log('Killed PID', pid); } catch(e) {}
      }
    });
  }
} catch(e) { console.log('No existing gateway process'); }

// 2. Wait for port to free
const net = require('net');
function waitForPort(port, timeout) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    function check() {
      const sock = new net.Socket();
      sock.on('connect', () => { sock.destroy(); if (Date.now()-start>timeout) reject(new Error('timeout')); else setTimeout(check,500); });
      sock.on('error', () => resolve());  // Port is free
      sock.connect(port, '127.0.0.1');
    }
    check();
  });
}

waitForPort(8080, 10000).then(() => {
  // 3. Start new gateway
  const child = spawn('node', ['/root/automaton/gateway.js'], {
    cwd: '/root/automaton', stdio: ['ignore', 'pipe', 'pipe'], detached: true
  });
  let out = '';
  child.stdout.on('data', d => out += d.toString());
  child.stderr.on('data', d => out += d.toString());
  child.unref();

  // 4. Wait and test
  setTimeout(() => {
    const http = require('http');
    const checks = ['/', '/api/health', '/sitemap.xml', '/referral'];
    Promise.all(checks.map(path => new Promise(r => {
      http.get('http://localhost:8080' + path, res => { 
        console.log(path + ' -> ' + res.statusCode);
        r(res.statusCode);
      }).on('error', e => { console.log(path + ' -> ERR:', e.message); r(0); });
    }))).then(codes => {
      const allOK = codes.every(c => c >= 200 && c < 500);
      console.log(allOK ? '✓ ALL ROUTES OK' : '⚠ SOME ROUTES FAILED');
      console.log('Startup output:', out.slice(-300));
    });
  }, 3000);
}).catch(e => console.error('Port wait failed:', e));
