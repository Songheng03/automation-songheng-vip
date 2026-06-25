// Tunnel Manager — Cloudflare tunnel management inside the gateway process
// This runs inside the gateway (port 8080), so PORT GUARDIAN allows it.
// Mounts at /api/tunnel/* on the gateway
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const TUNNEL_LOG = '/tmp/cloudflared-tunnel.log';
const TUNNEL_PID_FILE = '/tmp/cloudflared-tunnel.pid';
const LAST_URL_FILE = '/tmp/last-tunnel-url.txt';
const DOMAIN = 'https://automation.songheng.vip';

let cloudflaredProcess = null;
let tunnelUrl = null;
let monitorInterval = null;

function log(msg) {
  const ts = new Date().toISOString();
  const line = `[TUNNEL-MGR] ${ts} ${msg}\n`;
  try { fs.appendFileSync(TUNNEL_LOG, line); } catch(e) {}
  console.log(line.trim());
}

function hasTunnelCommand() {
  try {
    const result = require('child_process').execSync('which cloudflared', { encoding: 'utf-8', timeout: 3000 });
    return result.trim().length > 0;
  } catch(e) {
    return false;
  }
}

async function startCloudflaredTunnel() {
  if (cloudflaredProcess) {
    log('Tunnel already running');
    return { success: true, url: tunnelUrl, note: 'already_running' };
  }

  if (!hasTunnelCommand()) {
    log('cloudflared not found on system');
    return { success: false, error: 'cloudflared not installed' };
  }

  return new Promise((resolve) => {
    try {
      // Kill any existing cloudflared processes
      try { require('child_process').execSync('pkill -f "cloudflared tunnel" 2>/dev/null || true'); } catch(e) {}
      
      const proc = spawn('cloudflared', ['tunnel', '--url', 'http://localhost:8080', '--logfile', TUNNEL_LOG], {
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false,
      });

      cloudflaredProcess = proc;
      
      // Save PID
      fs.writeFileSync(TUNNEL_PID_FILE, String(proc.pid));

      let urlFound = false;
      const timeout = setTimeout(() => {
        if (!urlFound) {
          log('Tunnel startup timed out (15s)');
          resolve({ success: false, error: 'Tunnel startup timed out — check if cloudflared can reach Cloudflare' });
        }
      }, 15000);

      // Watch stdout for tunnel URL
      proc.stdout.on('data', (data) => {
        const text = data.toString();
        log(`[stdout] ${text.trim()}`);
        
        if (!urlFound) {
          const match = text.match(/https:\/\/[a-z-]+\.trycloudflare\.com/);
          if (match) {
            urlFound = true;
            tunnelUrl = match[0];
            fs.writeFileSync(LAST_URL_FILE, tunnelUrl);
            clearTimeout(timeout);
            log(`✅ Tunnel URL obtained: ${tunnelUrl}`);
            
            // Start health monitor
            startTunnelMonitor();
            
            resolve({ success: true, url: tunnelUrl });
          }
        }
      });

      proc.stderr.on('data', (data) => {
        const text = data.toString();
        log(`[stderr] ${text.trim()}`);
        
        if (!urlFound) {
          const match = text.match(/https:\/\/[a-z-]+\.trycloudflare\.com/);
          if (match) {
            urlFound = true;
            tunnelUrl = match[0];
            fs.writeFileSync(LAST_URL_FILE, tunnelUrl);
            clearTimeout(timeout);
            log(`✅ Tunnel URL (from stderr): ${tunnelUrl}`);
            startTunnelMonitor();
            resolve({ success: true, url: tunnelUrl });
          }
        }
      });

      proc.on('error', (err) => {
        clearTimeout(timeout);
        log(`❌ Process error: ${err.message}`);
        cloudflaredProcess = null;
        resolve({ success: false, error: `cloudflared error: ${err.message}` });
      });

      proc.on('exit', (code, signal) => {
        clearTimeout(timeout);
        log(`⚠ cloudflared exited (code: ${code}, signal: ${signal})`);
        cloudflaredProcess = null;
        
        if (!urlFound) {
          resolve({ success: false, error: `cloudflared exited with code ${code}` });
        }
      });
    } catch(e) {
      log(`❌ Failed to start: ${e.message}`);
      resolve({ success: false, error: e.message });
    }
  });
}

function stopTunnel() {
  if (cloudflaredProcess) {
    try {
      cloudflaredProcess.kill('SIGTERM');
      log('Sent SIGTERM to cloudflared');
    } catch(e) {
      log(`Kill error: ${e.message}`);
    }
    cloudflaredProcess = null;
  }
  
  // Also kill any lingering cloudflared
  try { require('child_process').execSync('pkill -f "cloudflared tunnel" 2>/dev/null || true'); } catch(e) {}
  
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
  }
  
  tunnelUrl = null;
  try { fs.unlinkSync(TUNNEL_PID_FILE); } catch(e) {}
  log('Tunnel stopped');
  return { success: true };
}

function getStatus() {
  const isRunning = cloudflaredProcess !== null && cloudflaredProcess.exitCode === null;
  const lastUrl = tunnelUrl || (() => { try { return fs.readFileSync(LAST_URL_FILE, 'utf-8').trim(); } catch(e) { return null; } })();
  const hasPid = (() => { try { return fs.existsSync(TUNNEL_PID_FILE); } catch(e) { return false; } })();
  
  return {
    running: isRunning,
    processAlive: isRunning,
    url: lastUrl,
    domain: DOMAIN,
    domainReachable: null, // can't check from inside easily
    cloudflaredInstalled: hasTunnelCommand(),
    pidFile: hasPid,
    logFile: fs.existsSync(TUNNEL_LOG) ? fs.statSync(TUNNEL_LOG).size : 0,
  };
}

function startTunnelMonitor() {
  if (monitorInterval) clearInterval(interval);
  
  monitorInterval = setInterval(() => {
    if (!cloudflaredProcess || cloudflaredProcess.exitCode !== null) {
      log('⚠ Tunnel process died — attempting restart...');
      startCloudflaredTunnel().then(result => {
        if (result.success) {
          log(`✅ Auto-restarted tunnel: ${result.url}`);
        } else {
          log(`❌ Auto-restart failed: ${result.error}`);
        }
      });
    }
  }, 60000); // check every minute
}

// Gateway route handler
function setupTunnelRoutes(app, gateway) {
  // GET /api/tunnel/status — tunnel status
  app.get('/api/tunnel/status', (req, res) => {
    res.json(getStatus());
  });

  // POST /api/tunnel/start — start tunnel
  app.post('/api/tunnel/start', async (req, res) => {
    log('Tunnel start requested');
    const result = await startCloudflaredTunnel();
    res.json(result);
  });

  // POST /api/tunnel/stop — stop tunnel
  app.post('/api/tunnel/stop', (req, res) => {
    log('Tunnel stop requested');
    res.json(stopTunnel());
  });

  // GET /api/tunnel/log — recent log
  app.get('/api/tunnel/log', (req, res) => {
    try {
      const logData = fs.readFileSync(TUNNEL_LOG, 'utf-8');
      const lines = logData.split('\n').filter(Boolean).slice(-50);
      res.json({ lines });
    } catch(e) {
      res.json({ lines: [] });
    }
  });

  // Serve tunnel management page
  app.get('/tunnel', (req, res) => {
    const contentPath = path.join(__dirname, '..', 'content', 'tunnel-fix.html');
    if (fs.existsSync(contentPath)) {
      res.sendFile(contentPath);
    } else {
      res.status(404).json({ error: 'tunnel-fix.html not found' });
    }
  });

  log('Tunnel routes mounted on /api/tunnel/*');
}

// Auto-start tunnel on module load (with delay to let gateway start)
let autoStartAttempted = false;
function attemptAutoStart() {
  if (autoStartAttempted) return;
  autoStartAttempted = true;
  
  const delay = 5000; // wait 5s for gateway to settle
  log(`Will attempt tunnel auto-start in ${delay}ms`);
  
  setTimeout(() => {
    // Only auto-start if no tunnel appears to be running
    const hasPid = (() => { try { return fs.existsSync(TUNNEL_PID_FILE); } catch(e) { return false; } })();
    if (!hasPid) {
      log('No existing tunnel detected. Auto-starting...');
      startCloudflaredTunnel().then(result => {
        if (result.success) {
          log(`✅ Auto-started tunnel: ${result.url}`);
        } else {
          log(`⚠ Auto-start deferred: ${result.error} — will retry on API call`);
        }
      });
    } else {
      log('Existing tunnel detected — skipping auto-start');
    }
  }, delay);
}

module.exports = { setupTunnelRoutes, startCloudflaredTunnel, stopTunnel, getStatus, attemptAutoStart };
