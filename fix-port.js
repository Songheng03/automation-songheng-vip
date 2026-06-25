#!/usr/bin/env node
// fix-port.js — Find what's on port 8080, disable it, start clean gateway
const { execSync } = require('child_process');
const fs = require('fs');
const http = require('http');
const path = require('path');

console.log('=== PORT 8080 DIAGNOSTIC ===');

// Find what's on port 8080
try {
  const who = execSync('lsof -i:8080 -P -n 2>/dev/null || ss -tlnp | grep 8080', {encoding:'utf8'}).trim();
  console.log('Processes on 8080:');
  console.log(who || '(none)');
} catch(e) {}

// Find what process it is
let pid = null;
try { pid = execSync('lsof -ti:8080 2>/dev/null', {encoding:'utf8'}).trim(); } catch(e) {}
if (pid) {
  console.log(`\nPID on 8080: ${pid}`);
  try {
    const cmdline = execSync(`cat /proc/${pid}/cmdline 2>/dev/null | tr '\\0' ' '`, {encoding:'utf8'}).trim();
    console.log(`Command: ${cmdline}`);
  } catch(e) {}
  try {
    const cwd = execSync(`readlink /proc/${pid}/cwd 2>/dev/null`, {encoding:'utf8'}).trim();
    console.log(`Working dir: ${cwd}`);
  } catch(e) {}
}

// Check /root/services/ for init/systemd
try {
  const autoStart = execSync('ls /etc/init.d/*node* /etc/init.d/*gateway* /etc/systemd/system/*node* /etc/systemd/system/*gateway* 2>/dev/null || echo "(none found)"', {encoding:'utf8'}).trim();
  console.log(`\nAuto-start scripts:\n${autoStart}`);
} catch(e) {}

// Check cron for restart jobs
try {
  const cron = execSync('crontab -l 2>/dev/null || echo "(no crontab)"', {encoding:'utf8'}).trim();
  console.log(`\nCron jobs:\n${cron}`);
} catch(e) {}

// Check PM2
try {
  const pm2list = execSync('pm2 list 2>/dev/null || echo "(no pm2)"', {encoding:'utf8'}).trim();
  console.log(`\nPM2 processes:\n${pm2list}`);
} catch(e) {}

// Check forever
try {
  const foreverList = execSync('forever list 2>/dev/null || echo "(no forever)"', {encoding:'utf8'}).trim();
  console.log(`\nForever processes:\n${foreverList}`);
} catch(e) {}
