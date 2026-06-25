#!/usr/bin/env node
// restart-helper.js — Restart gateway by sending SIGHUP to process on port 8080
const http = require('http');
const net = require('net');

function findPid(port) {
  try {
    const { execSync } = require('child_process');
    const out = execSync(`lsof -ti :${port} 2>/dev/null || ss -tlnp sport = :${port} 2>/dev/null | grep -oP 'pid=\\K\\d+'`, { encoding: 'utf8', timeout: 5000 }).trim();
    const lines = out.split('\n').filter(Boolean);
    for (const line of lines) {
      const pid = parseInt(line.trim());
      if (!isNaN(pid) && pid > 0) return pid;
    }
  } catch(e) {}
  return null;
}

const pid = findPid(8080);
if (pid) {
  console.log(`Found gateway on PID ${pid}. Sending SIGHUP...`);
  try {
    process.kill(pid, 'SIGHUP');
    console.log('SIGHUP sent. Waiting for restart...');
    setTimeout(() => {
      // Check if it came back
      const newPid = findPid(8080);
      if (newPid) {
        console.log(`Gateway running on PID ${newPid}`);
        process.exit(0);
      } else {
        console.log('SIGHUP did not restart. Starting fresh...');
        const { spawn } = require('child_process');
        const child = spawn('node', ['/root/automaton/gateway.js'], {
          cwd: '/root/automaton',
          stdio: 'ignore',
          detached: true
        });
        child.unref();
        console.log('Started fresh gateway');
        process.exit(0);
      }
    }, 3000);
  } catch(e) {
    console.log(`Could not signal: ${e.message}. Starting fresh...`);
    const { spawn } = require('child_process');
    const child = spawn('node', ['/root/automaton/gateway.js'], {
      cwd: '/root/automaton',
      stdio: 'ignore',
      detached: true
    });
    child.unref();
    console.log('Started fresh gateway');
    process.exit(0);
  }
} else {
  console.log('No process on 8080. Starting gateway...');
  const { spawn } = require('child_process');
  const child = spawn('node', ['/root/automaton/gateway.js'], {
    cwd: '/root/automaton',
    stdio: 'ignore',
    detached: true
  });
  child.unref();
  console.log('Started gateway');
  setTimeout(() => {
    const newPid = findPid(8080);
    console.log(newPid ? `Gateway running on PID ${newPid}` : 'Gateway not running - check logs');
    process.exit(0);
  }, 2000);
}
