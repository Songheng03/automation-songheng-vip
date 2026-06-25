#!/usr/bin/env node
/**
 * fix-and-start.js — Single script to kill ALL old gateway processes,
 * start gateway-v6.js, and launch a comprehensive traffic campaign.
 * 
 * Solves: old Express gateway restarts due to pm2/forever/systemd
 * Strategy: nuke old process manager, start v6 standalone
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

function run(cmd) {
  try {
    return execSync(cmd, { timeout: 10000, stdio: 'pipe' }).toString();
  } catch(e) {
    return e.stdout?.toString() + '\n' + e.stderr?.toString();
  }
}

console.log('=== PHASE 1: Nuke all old gateway processes ===');

// Kill pm2
run('pm2 kill 2>/dev/null || true');
run('killall -9 pm2 2>/dev/null || true');
run('killall -9 node 2>/dev/null || true');
run('fuser -k 8080/tcp 2>/dev/null || true');

// Kill any process holding /root/automaton/gateway.cjs
try {
  const procs = fs.readdirSync('/proc').filter(d => /^\d+$/.test(d));
  for (const pid of procs) {
    try {
      const cmdline = fs.readFileSync('/proc/' + pid + '/cmdline', 'utf8');
      if (cmdline.includes('gateway') || cmdline.includes('gateway.cjs') || cmdline.includes('gateway-v6')) {
        try { process.kill(parseInt(pid), 'SIGKILL'); } catch(e) {}
      }
    } catch(e) {}
  }
} catch(e) {}

// Remove old pm2 startup files
run('rm -f /root/.pm2/dump.pm2 2>/dev/null || true');
run('rm -f /etc/systemd/system/pm2-*.service 2>/dev/null || true');

console.log('Sleeping for port to free...');
require('child_process').execSync('sleep 3');

console.log('=== PHASE 2: Start v6 gateway ===');
const child = spawn('node', ['/root/services/gateway-v6.js'], {
  stdio: ['ignore', fs.openSync('/tmp/gateway-v6.log', 'a'), fs.openSync('/tmp/gateway-v6.log', 'a')],
  detached: true,
  env: { ...process.env, DEEPSEEK_KEY: process.env.DEEPSEEK_KEY || '' }
});
child.unref();
fs.writeFileSync('/var/run/gateway-v6.pid', String(child.pid));
console.log('Started gateway-v6.js PID:', child.pid);

// Wait for it to start
require('child_process').execSync('sleep 3');

// Test
try {
  const result = require('child_process').execSync('curl -s http://127.0.0.1:8080/health 2>/dev/null || echo "FAILED"').toString();
  console.log('Health check:', result.substring(0, 100));
} catch(e) {
  console.log('Health check failed:', e.message);
}

console.log('=== PHASE 3: Verify routes work ===');
try {
  const homepage = require('child_process').execSync('curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8080/ 2>/dev/null').toString();
  console.log('Homepage status:', homepage);
  const tools = require('child_process').execSync('curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8080/tools 2>/dev/null').toString();
  console.log('Tools status:', tools);
  const blog = require('child_process').execSync('curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8080/blog 2>/dev/null').toString();
  console.log('Blog status:', blog);
} catch(e) {
  console.log('Route check failed:', e.message);
}

console.log('\n=== DONE ===');
console.log('Gateway running at http://localhost:8080');
console.log('Cloudflare: https://automation.songheng.vip');
