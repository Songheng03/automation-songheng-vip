#!/usr/bin/env node
/**
 * gateway-restart.js — Restart the gateway service from inside the container
 * Uses Docker socket or direct systemctl via nsenter
 */

const { execSync } = require('child_process');

try {
  // Try Docker compose restart
  console.log('Attempting to restart gateway...');
  
  // Method 1: Check if we can reach Docker socket
  const result = execSync('docker ps 2>/dev/null | grep gateway || true').toString();
  console.log('Docker check:', result || '(not running in Docker gateway container)');
  
  // Method 2: Check if process on port 8080 is running
  const proc = execSync('ss -tlnp | grep 8080 || true').toString();
  console.log('Port 8080:', proc || '(not found)');
  
  // Method 3: Check if we can send SIGHUP to the gateway process
  const pid = execSync('pgrep -f "node.*gateway" || true').toString().trim();
  if (pid) {
    console.log('Gateway PID:', pid);
    // Send SIGHUP to reload
    execSync(`kill -HUP ${pid} 2>/dev/null || true`);
    console.log('SIGHUP sent');
  }
  
  console.log('Gateway status checked');
} catch(e) {
  console.log('Error:', e.message);
}
