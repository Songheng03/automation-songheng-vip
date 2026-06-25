// graceful-restart.js — Gracefully restart the gateway to pick up new services
// Run standalone: node graceful-restart.js
// Uses the gateway.pid file for safe restart

const fs = require('fs');
const path = require('path');
const http = require('http');

const GATEWAY_PID_FILE = path.join(__dirname, 'gateway.pid');
const GATEWAY_SCRIPT = path.join(__dirname, 'gateway.js');
const LOG_FILE = path.join(__dirname, 'gateway.log');

function log(msg) {
  const line = `[RESTART ${new Date().toISOString()}] ${msg}`;
  console.log(line);
  try { fs.appendFileSync(LOG_FILE, line + '\n'); } catch(e) {}
}

// Step 1: Try to reload via HTTP endpoint first (if gateway is running)
function tryReloadHttp() {
  return new Promise((resolve) => {
    const body = JSON.stringify({ action: 'reload' });
    const req = http.request({
      hostname: 'localhost',
      port: 8080,
      path: '/api/reload-gateway',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      timeout: 3000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', () => resolve(null)); // Gateway not running or no reload endpoint
    req.write(body);
    req.end();
  });
}

// Step 2: Try to reload via /api/reload (old gateway compat)
function tryReloadOld() {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: 8080,
      path: '/api/reload',
      method: 'POST',
      timeout: 3000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', () => resolve(null));
    req.end();
  });
}

// Step 3: Force restart by reading PID and signaling
function restartByPid() {
  return new Promise((resolve) => {
    try {
      if (!fs.existsSync(GATEWAY_PID_FILE)) {
        log('No gateway.pid found, starting fresh');
        resolve(false);
        return;
      }
      const pid = parseInt(fs.readFileSync(GATEWAY_PID_FILE, 'utf8').trim());
      log(`Found PID ${pid}, attempting graceful shutdown...`);
      
      try {
        process.kill(pid, 'SIGTERM');
        log(`Sent SIGTERM to PID ${pid}`);
      } catch(e) {
        log(`PID ${pid} not running (${e.message}), starting fresh`);
        resolve(false);
        return;
      }

      // Wait for process to die
      let waited = 0;
      const checkDead = setInterval(() => {
        waited += 500;
        try {
          process.kill(pid, 0); // Check if alive
          if (waited >= 5000) {
            clearInterval(checkDead);
            log('Process did not die, sending SIGKILL');
            try { process.kill(pid, 'SIGKILL'); } catch(e) {}
            resolve(true);
          }
        } catch(e) {
          clearInterval(checkDead);
          log('Process confirmed dead');
          resolve(true);
        }
      }, 500);
    } catch(e) {
      log(`Error in restart: ${e.message}`);
      resolve(false);
    }
  });
}

// Step 4: Start fresh gateway
function startGateway() {
  return new Promise((resolve) => {
    log('Starting gateway...');
    const { spawn } = require('child_process');
    const child = spawn('node', [GATEWAY_SCRIPT], {
      cwd: __dirname,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: true
    });

    const pid = child.pid;
    fs.writeFileSync(GATEWAY_PID_FILE, pid.toString());
    log(`Started with PID ${pid}`);

    child.stdout.on('data', (data) => {
      fs.appendFileSync(LOG_FILE, data.toString());
    });
    child.stderr.on('data', (data) => {
      fs.appendFileSync(LOG_FILE, '[STDERR] ' + data.toString());
    });
    child.unref(); // Let parent die independently

    // Give it a moment to start up
    setTimeout(() => resolve(pid), 2000);
  });
}

// Main
async function main() {
  log('=== GRACEFUL RESTART ===');
  
  // Try HTTP reload first (gentlest)
  log('Trying HTTP reload...');
  const reloadResult = await tryReloadHttp();
  if (reloadResult) {
    log(`HTTP reload result: ${reloadResult.status} — ${reloadResult.body.substring(0, 100)}`);
    if (reloadResult.status === 200) {
      log('Gateway reloaded via HTTP!');
      process.exit(0);
    }
  }

  // Try old reload endpoint
  log('Trying old /api/reload...');
  const oldReload = await tryReloadOld();
  if (oldReload) {
    log(`Old reload result: ${oldReload.status} — ${oldReload.body.substring(0, 100)}`);
  }

  // Full restart
  log('Performing full restart...');
  await restartByPid();
  const pid = await startGateway();
  log(`Gateway restarted with PID ${pid}`);
  process.exit(0);
}

main().catch(e => {
  log(`FATAL: ${e.message}`);
  process.exit(1);
});
