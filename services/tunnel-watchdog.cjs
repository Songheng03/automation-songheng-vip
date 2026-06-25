// Tunnel Watchdog Service — runs inside gateway process
// Monitors cloudflared, auto-restarts, reports status
// Routes: /api/tunnel/status, /api/tunnel/restart, /api/tunnel/logs

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const TUNNEL_STATE_FILE = '/root/automaton/data/tunnel-live.json';
const WATCHDOG_LOG_FILE = '/root/automaton/data/tunnel-watchdog.log';
const DOMAIN = 'automation.songheng.vip';
const GATEWAY_URL = 'http://localhost:8080';

// In-memory state
let state = {
  status: 'unknown',
  public_http: null,
  tunnel_running: false,
  tunnel_url: null,
  pid: null,
  last_check: null,
  restart_count: 0,
  history: []
};

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  state.history.push(line);
  if (state.history.length > 200) state.history.shift();
  try {
    fs.appendFileSync(WATCHDOG_LOG_FILE, line + '\n');
  } catch(e) {}
}

function saveState() {
  state.last_check = new Date().toISOString();
  try {
    fs.writeFileSync(TUNNEL_STATE_FILE, JSON.stringify(state, null, 2));
  } catch(e) {}
}

function checkPublic() {
  return new Promise((resolve) => {
    const https = require('https');
    const req = https.get(`https://${DOMAIN}/`, { timeout: 8000 }, (res) => {
      state.public_http = res.statusCode;
      resolve(res.statusCode);
    });
    req.on('error', () => { state.public_http = null; resolve(null); });
    req.on('timeout', () => { req.destroy(); state.public_http = null; resolve(null); });
  });
}

function checkProcess() {
  return new Promise((resolve) => {
    exec('pgrep -f "cloudflared tunnel" | head -1', (err, stdout) => {
      const pid = stdout ? parseInt(stdout.trim()) : null;
      state.pid = pid;
      state.tunnel_running = pid !== null;
      resolve(pid);
    });
  });
}

function restartTunnel() {
  return new Promise((resolve) => {
    log('Attempting tunnel restart...');
    state.restart_count++;
    
    // Kill existing
    exec('pkill -f "cloudflared tunnel" 2>/dev/null', () => {
      setTimeout(() => {
        // Try config-based tunnel first
        exec('ls /root/.cloudflared/config.yml 2>/dev/null', (err) => {
          if (!err) {
            exec('nohup cloudflared tunnel run > /tmp/cloudflared.log 2>&1 &', (e, so, se) => {
              setTimeout(() => checkProcess().then(resolve), 3000);
            });
          } else {
            // Quick tunnel fallback
            exec(`nohup cloudflared tunnel --url ${GATEWAY_URL} > /tmp/cloudflared.log 2>&1 &`, (e, so, se) => {
              setTimeout(async () => {
                await checkProcess();
                // Try to extract URL
                try {
                  const data = fs.readFileSync('/tmp/cloudflared.log', 'utf8');
                  const match = data.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
                  if (match) state.tunnel_url = match[0];
                } catch(e) {}
                resolve(state.pid);
              }, 5000);
            });
          }
        });
      }, 2000);
    });
  });
}

async function fullCheck() {
  await checkProcess();
  await checkPublic();
  state.status = state.public_http === 200 ? 'healthy' : 
                  state.tunnel_running ? 'degraded' : 'down';
  saveState();
  return state;
}

// Periodic monitoring
let monitorInterval = null;
function startMonitor(intervalMs = 30000) {
  if (monitorInterval) clearInterval(monitorInterval);
  log(`Monitor started (every ${intervalMs}ms)`);
  
  // Immediate first check
  fullCheck();
  
  monitorInterval = setInterval(async () => {
    const wasRunning = state.tunnel_running;
    await fullCheck();
    
    // Auto-recover if tunnel died
    if (wasRunning && !state.tunnel_running) {
      log('Tunnel died! Attempting recovery...');
      await restartTunnel();
    }
  }, intervalMs);
}

// Express router factory
function createRouter() {
  const router = require('express').Router();
  
  // Status endpoint
  router.get('/api/tunnel/status', (req, res) => {
    fullCheck().then(s => res.json(s));
  });
  
  // Detailed status
  router.get('/api/tunnel/status/detailed', (req, res) => {
    res.json({
      ...state,
      uptime: state.pid ? process.uptime() : 0,
      memory: process.memoryUsage(),
      last_logs: state.history.slice(-20),
      config: {
        domain: DOMAIN,
        gateway: GATEWAY_URL,
        state_file: TUNNEL_STATE_FILE
      }
    });
  });
  
  // Restart tunnel
  router.post('/api/tunnel/restart', async (req, res) => {
    const pid = await restartTunnel();
    res.json({ success: true, pid, message: pid ? 'Tunnel started' : 'Failed to start tunnel' });
  });
  
  // Get logs
  router.get('/api/tunnel/logs', (req, res) => {
    try {
      let logs = [];
      if (fs.existsSync(WATCHDOG_LOG_FILE)) {
        logs = fs.readFileSync(WATCHDOG_LOG_FILE, 'utf8').split('\n').filter(l => l).slice(-50);
      }
      res.json({ logs });
    } catch(e) {
      res.json({ logs: ['Error reading logs: ' + e.message], error: e.message });
    }
  });
  
  // Quick tunnel URL helper
  router.get('/api/tunnel/quick', async (req, res) => {
    const pid = await checkProcess();
    let tunnelUrl = state.tunnel_url;
    
    if (!tunnelUrl && pid) {
      try {
        const data = fs.readFileSync('/tmp/cloudflared.log', 'utf8');
        const match = data.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
        if (match) tunnelUrl = match[0];
      } catch(e) {}
    }
    
    res.json({
      tunnel_running: !!pid,
      tunnel_url: tunnelUrl || null,
      pid: pid,
      command: tunnelUrl ? null : 'cloudflared tunnel --url http://localhost:8080'
    });
  });
  
  return router;
}

module.exports = { startMonitor, fullCheck, restartTunnel, createRouter, state };
