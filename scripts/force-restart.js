// force-restart.js — Aggressively kill ALL node processes on 8080, start fresh
const { spawn, execSync } = require('child_process');
const http = require('http');
const fs = require('fs');

// Step 1: Find and kill ALL processes on port 8080
console.log('Step 1: Killing all processes on port 8080...');
try {
  execSync("fuser -k 8080/tcp 2>/dev/null || true", { shell: '/bin/bash' });
} catch(e) {}
try {
  execSync("kill $(lsof -ti:8080) 2>/dev/null || true", { shell: '/bin/bash' });
} catch(e) {}
try {
  execSync("ss -tlnp | grep ':8080' | grep -oP 'pid=\\K[0-9]+' | xargs -r kill -9 2>/dev/null || true", { shell: '/bin/bash' });
} catch(e) {}

// Wait for port to be free
const waitForPort = () => new Promise(resolve => {
  const check = () => {
    try {
      const out = execSync("ss -tlnp | grep ':8080' || true", { shell: '/bin/bash' }).toString();
      if (!out) return resolve(true);
    } catch(e) {}
    setTimeout(check, 500);
  };
  setTimeout(check, 1500);
});

waitForPort().then(() => {
  console.log('Step 2: Port 8080 is free. Starting gateway v5.0...');
  
  const child = spawn('node', ['gateway.cjs'], {
    cwd: '/root/automaton',
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
    env: { ...process.env }
  });
  child.unref();
  
  let output = '';
  child.stdout.on('data', d => { output += d; process.stdout.write(d); });
  child.stderr.on('data', d => { output += d; process.stderr.write(d); });
  
  // Wait for it to start, then test
  setTimeout(() => {
    console.log('\nStep 3: Testing gateway...');
    http.get('http://localhost:8080/health', (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        console.log('Health response:', data.substring(0, 200));
        process.exit(0);
      });
    }).on('error', (e) => {
      console.error('Health check failed:', e.message);
      process.exit(1);
    });
  }, 3000);
});
