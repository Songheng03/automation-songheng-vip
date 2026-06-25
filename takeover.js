// Forcefully take over port 8080 - stop old gateway and start new one
const { execSync } = require('child_process');
const fs = require('fs');

try {
  // Find PID holding port 8080
  const stdout = execSync('lsof -ti tcp:8080 2>/dev/null || ss -tlnp 2>/dev/null | grep ":8080 " || true').toString();
  const pidMatch = stdout.match(/\d+/);
  
  if (pidMatch) {
    const pid = pidMatch[0];
    console.log(`[takeover] Stopping old gateway PID ${pid}`);
    execSync(`kill -15 ${pid} 2>/dev/null; sleep 1; kill -9 ${pid} 2>/dev/null || true`);
    console.log('[takeover] Old gateway stopped');
  }
  
  // Wait for port to be free
  execSync('sleep 1');
  
  // Start new gateway
  console.log('[takeover] Starting new gateway...');
  const child = require('child_process').spawn('node', ['/root/automaton/gateway.js'], {
    stdio: 'inherit',
    detached: true,
    env: process.env
  });
  child.unref();
  
  console.log('[takeover] Gateway started');
} catch(e) {
  console.error('[takeover] Error:', e.message);
}
