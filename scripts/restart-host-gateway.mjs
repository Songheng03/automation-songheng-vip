#!/usr/bin/env node
/**
 * Restart the host gateway service from inside the container
 * Uses nsenter to access host's systemd
 */

import { execSync } from 'child_process';

try {
  // Find the PID of systemd on the host
  const result = execSync(
    'nsenter -t 1 -m -p -- systemctl restart automaton-gateway 2>&1',
    { timeout: 10000 }
  );
  console.log('✅ Gateway restarted:', result.stdout?.toString() || 'OK');
} catch (err) {
  console.error('nsenter failed:', err.message);
  
  // Fallback: try ssh to localhost
  try {
    execSync(
      'ssh -o StrictHostKeyChecking=no root@localhost "systemctl restart automaton-gateway" 2>&1',
      { timeout: 10000 }
    );
    console.log('✅ Gateway restarted via SSH');
  } catch (err2) {
    console.error('SSH also failed:', err2.message);
    console.log('❌ Cannot restart gateway from inside container.');
    console.log('Run on host: sudo systemctl restart automaton-gateway');
  }
}
