#!/usr/bin/env node
/**
 * Gateway Launcher — ensures gateway.cjs runs on port 8080
 * Use: kill any existing node process and start fresh
 */
const { execSync } = require('child_process');
const os = require('os');

console.log('=== Gateway Launcher ===\n');

// Step 1: Find what's on port 8080
try {
  const cmd = os.platform() === 'linux' ? 
    'fuser 8080/tcp 2>/dev/null || ss -tlnp 2>/dev/null | grep 8080 || netstat -tlnp 2>/dev/null | grep 8080 || lsof -i :8080 2>/dev/null' :
    `netstat -ano | findstr :8080`;
  const out = execSync(cmd, { timeout: 5000, stdio: 'pipe' }).toString();
  console.log('Port 8080 status:', out.trim() || 'Nothing found');
} catch(e) {
  console.log('Port 8080: No process found (or command unavailable)');
}

// Step 2: Kill any existing node gateway processes
try {
  execSync("pkill -f 'node.*gateway' || true", { timeout: 3000 });
  console.log('✓ Killed old gateway processes');
} catch(e) {
  console.log('No old processes to kill');
}

// Step 3: Start fresh
const { spawn } = require('child_process');
const child = spawn('node', ['/root/automaton/gateway.cjs'], {
  stdio: 'inherit',
  detached: true,
  env: { ...process.env, PORT: '8080' }
});
child.unref();

console.log(`\n✓ Gateway started on port 8080 with PID ${child.pid}`);
console.log('  Content:  /root/automaton/content/');
console.log('  Blog:     /blog');
console.log('  Docs:     /api-docs');
console.log('  Playground: /api-playground');
console.log('  Health:   /health\n');

setTimeout(() => {
  try {
    const test = execSync('curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/health', { timeout: 5000 });
    console.log(`Health check: HTTP ${test}`);
  } catch(e) {
    console.log('Health check failed - check gateway.cjs for errors');
  }
}, 2000);
