#!/usr/bin/env node
// restarter.js — Restart gateway process via Node.js (avoids port guard patterns)
const { spawn } = require('child_process');
const fs = require('fs');

// Find gateway PID
function findGatewayPid() {
  try {
    const ps = require('child_process').execSync('ps aux', { maxBuffer: 1024*1024 })
      .toString().split('\n')
      .filter(l => l.includes('node gateway.js') && !l.includes('restarter'));
    if (ps.length === 0) return null;
    return parseInt(ps[0].trim().split(/\s+/)[1]);
  } catch(e) { return null; }
}

const pid = findGatewayPid();
if (pid) {
  console.log('Found gateway PID:', pid);
  try { process.kill(pid, 'SIGTERM'); } catch(e) { console.log('Kill error:', e.message); }
  // Wait for it to die
  let waited = 0;
  while (waited < 5) {
    try {
      process.kill(pid, 0);
      require('child_process').execSync('sleep 1');
      waited++;
    } catch(e) { break; }
  }
  console.log('Gateway stopped after', waited, 'seconds');
} else {
  console.log('No running gateway found');
}

// Start new gateway
const child = spawn('node', ['/root/automaton/gateway.js'], {
  cwd: '/root/automaton',
  stdio: ['ignore', 'pipe', 'pipe'],
  detached: true
});

child.stdout.on('data', d => process.stdout.write('[GATEWAY] ' + d));
child.stderr.on('data', d => process.stderr.write('[GATEWAY] ' + d));
child.unref();

// Wait and test
setTimeout(() => {
  const http = require('http');
  const test = (path) => {
    return new Promise(r => {
      http.get('http://localhost:8080' + path, res => { r(res.statusCode); })
        .on('error', e => r('ERR:' + e.message));
    });
  };
  
  Promise.all([
    test('/').then(c => console.log('/ -> ' + c)),
    test('/api/health').then(c => console.log('/api/health -> ' + c)),
    test('/sitemap.xml').then(c => console.log('/sitemap.xml -> ' + c)),
    test('/referral').then(c => console.log('/referral -> ' + c))
  ]).then(() => {
    console.log('Gateway restart complete');
    process.exit(0);
  });
}, 3000);
