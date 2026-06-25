#!/usr/bin/env node
// Kill EVERYTHING on port 8080, then start v14 cleanly
const fs = require('fs');
const { execSync, spawn } = require('child_process');

console.log('=== FORCE CLEAN RESTART ===');

// Nuclear option: kill everything on port 8080
try { execSync("fuser -k 8080/tcp 2>/dev/null", {stdio:'pipe'}); } catch(e) {}
try { execSync("kill -9 $(lsof -ti:8080) 2>/dev/null", {stdio:'pipe'}); } catch(e) {}

// Wait
setTimeout(() => {
  // Verify port is free
  try {
    const check = execSync("lsof -ti:8080 2>/dev/null || echo FREE", {encoding:'utf-8'});
    console.log('Port check:', check.trim());
  } catch(e) {}

  // Kill any lingering node gateway processes
  try {
    const pids = execSync("ps aux | grep 'node.*gateway' | grep -v grep | awk '{print $2}'", {encoding:'utf-8'}).trim().split('\n').filter(Boolean);
    for (const pid of pids) {
      try { process.kill(parseInt(pid), 'SIGKILL'); console.log('Killed lingering:', pid); } catch(e) {}
    }
  } catch(e) {}

  setTimeout(() => {
    // Start v14 gateway
    const child = spawn('node', ['/root/automaton/gateway.js'], {
      stdio: 'inherit',
      detached: true
    });
    child.unref();
    fs.writeFileSync('/root/automaton/gateway.pid', String(child.pid));
    console.log('=== Gateway PID:', child.pid, '===');
  }, 1000);
}, 1000);
