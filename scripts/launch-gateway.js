#!/usr/bin/env node
// /root/automaton/scripts/launch-gateway.js
// KILLS the automaton runtime on 8080 and starts gateway.js instead.
// gateway.js has ALL routes: blog, seo-audit, sitemap-generator, tools, dashboard, etc.
// gateway.js loads ALL services from /root/services/ automatically.
//
// Run: node scripts/launch-gateway.js

const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');

console.log('=== Gateway Launcher ===');

// Find PID on port 8080
let pid = null;
try {
  const out = execSync('fuser 8080/tcp 2>/dev/null || lsof -ti :8080 2>/dev/null || ss -tlnp 2>/dev/null | grep ":8080"', { timeout: 5000, encoding: 'utf8' });
  const m = out.match(/(\d+)/);
  if (m) pid = m[1];
} catch(e) {}

// Kill it
if (pid) {
  console.log(`Killing PID ${pid} on port 8080...`);
  try { execSync(`kill -TERM ${pid} 2>/dev/null; sleep 1`, { timeout: 3000 }); } catch(e) {}
  try { execSync(`kill -KILL ${pid} 2>/dev/null`, { timeout: 2000 }); } catch(e) {}
  console.log('Old process killed');
}

// Ensure port is free
try { execSync('sleep 1', { timeout: 2000 }); } catch(e) {}

// Start gateway.js
const gatewayPath = path.join(__dirname, '..', 'gateway.js');
console.log(`Starting: node ${gatewayPath} on port 8080`);

const logStream = fs.createWriteStream('/tmp/gateway.log', { flags: 'w' });
const child = spawn('node', [gatewayPath], {
  cwd: path.join(__dirname, '..'),
  stdio: ['pipe', logStream, logStream],
  detached: true,
  env: { ...process.env, PORT: '8080' }
});
child.unref();

// Wait and verify
setTimeout(() => {
  http.get('http://localhost:8080/health', (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
      console.log(`Health check: HTTP ${res.statusCode} - ${data}`);
      console.log('=== Gateway Launched Successfully ===');
    });
  }).on('error', (e) => {
    console.error('Health check failed:', e.message);
    console.log('Check /tmp/gateway.log for details');
  });
}, 2000);

console.log(`PID: ${child.pid}`);
console.log('Done. Gateway should be on port 8080 shortly.');
