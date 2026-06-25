// Tunnel Auto-Healer — Runs inside gateway, monitors and repairs tunnel
// Checks tunnel health on every request to /api/health and auto-restarts if dead
// Also runs a self-healing interval (gateway process safe — no new ports)

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

const CLOUDFLARED = '/usr/local/bin/cloudflared';
const DATA_DIR = path.join(__dirname, '..', 'data');
const LOG_FILE = path.join(DATA_DIR, 'tunnel-autoheal.log');
const TUNNEL_URL_FILE = path.join(DATA_DIR, 'tunnel-url.txt');
const STATE_FILE = path.join(DATA_DIR, 'tunnel-state.json');
const HEALTH_CHECK_FILE = path.join(DATA_DIR, 'gateway-health.json');

let tunnelProcess = null;
let tunnelUrl = '';
let healCount = 0;
const MAX_HEALS = 10;
const HEAL_COOLDOWN = 120000; // 2 min between heals
let lastHealTime = 0;
let isHealing = false;

function log(msg) {
  const line = `[AUTOHEAL] ${new Date().toISOString()} ${msg}\n`;
  process.stdout.write(line);
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.appendFileSync(LOG_FILE, line);
  } catch(e) {}
}

function readState() {
  try {
    const raw = fs.readFileSync(STATE_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch(e) {
    return { url: '', lastCheck: null, alive: false, restarts: 0 };
  }
}

function writeState(data) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(data, null, 2));
  } catch(e) {}
}

// Check if tunnel is actually working by hitting the domain
async function checkTunnelLive() {
  const state = readState();
  const url = tunnelUrl || state.url;
  if (!url) return false;

  try {
    // Check the trycloudflare URL is responding
    const result = await fetchWithTimeout(url, 5000);
    if (result) {
      log(`✅ Tunnel live: ${url}`);
      writeState({ ...state, url, lastCheck: new Date().toISOString(), alive: true });
      return true;
    }
  } catch(e) {
    // Probably dead
  }
  
  log(`❌ Tunnel not responding: ${url}`);
  writeState({ ...state, url, lastCheck: new Date().toISOString(), alive: false });
  return false;
}

function fetchWithTimeout(url, timeoutMs) {
  return new Promise((resolve) => {
    const u = new URL(url);
    const req = http.get({ hostname: u.hostname, port: u.port || 80, path: '/', method: 'HEAD', timeout: timeoutMs }, (res) => {
      resolve(res.statusCode < 500);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });
}

async function startTunnel() {
  if (tunnelProcess && tunnelProcess.exitCode === null) {
    return { success: true, url: tunnelUrl, note: 'already_running' };
  }

  if (!fs.existsSync(CLOUDFLARED)) {
    log('❌ cloudflared binary not found');
    return { success: false, error: 'binary_not_found' };
  }

  const now = Date.now();
  if (now - lastHealTime < HEAL_COOLDOWN && healCount > 0) {
    log(`⏳ Cooldown active (${Math.round((HEAL_COOLDOWN - (now - lastHealTime)) / 1000)}s remaining)`);
    return { success: false, error: 'cooldown' };
  }
  
  isHealing = true;
  lastHealTime = now;
  healCount++;

  // Kill stale cloudflared processes
  try { execSync('pkill -9 -f "cloudflared tunnel" 2>/dev/null || true'); } catch(e) {}
  try { execSync('pkill -9 -f "cloudflared tunnel" 2>/dev/null || true'); } catch(e) {}

  log(`🚀 Starting tunnel (attempt ${healCount})...`);

  const proc = spawn(CLOUDFLARED, ['tunnel', '--url', 'http://localhost:8080', '--no-autoupdate'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false,
  });

  tunnelProcess = proc;
  let urlFound = false;

  // Longer timeout for first start
  const timeout = healCount === 1 ? 30000 : 25000;
  
  const timeoutId = setTimeout(() => {
    if (!urlFound) {
      log('⏰ Tunnel start timeout');
      isHealing = false;
    }
  }, timeout);

  const onData = (data) => {
    const text = data.toString();
    try { fs.appendFileSync(LOG_FILE, text); } catch(e) {}

    if (!urlFound) {
      const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
      if (match) {
        urlFound = true;
        tunnelUrl = match[0];
        clearTimeout(timeoutId);
        const state = readState();
        writeState({ ...state, url: tunnelUrl, lastCheck: new Date().toISOString(), alive: true, restarts: healCount });
        fs.writeFileSync(TUNNEL_URL_FILE, tunnelUrl);
        log(`✅ Tunnel ready: ${tunnelUrl}`);
        isHealing = false;
      }
    }
    
    // Detect specific errors
    if (text.includes('failed') || text.includes('error') || text.includes('panic')) {
      log(`⚠️ cloudflared issue: ${text.slice(0, 200)}`);
    }
  };

  proc.stdout.on('data', onData);
  proc.stderr.on('data', onData);

  proc.on('error', (err) => {
    clearTimeout(timeoutId);
    log(`❌ spawn error: ${err.message}`);
    tunnelProcess = null;
    isHealing = false;
  });

  proc.on('exit', (code, signal) => {
    clearTimeout(timeoutId);
    log(`⚠️ exited (code:${code} signal:${signal})`);
    tunnelProcess = null;
    isHealing = false;
    
    if (healCount < MAX_HEALS) {
      // Auto-retry after a short delay
      setTimeout(() => {
        log(`🔄 Auto-retry (${healCount}/${MAX_HEALS})...`);
        startTunnel();
      }, 5000);
    } else {
      log(`🔇 Max retries (${MAX_HEALS}) reached. Manual intervention needed.`);
    }
  });

  return { success: true, attempting: true };
}

function stopTunnel() {
  if (tunnelProcess) {
    try { tunnelProcess.kill('SIGTERM'); } catch(e) {}
    setTimeout(() => {
      if (tunnelProcess && tunnelProcess.exitCode === null) {
        try { tunnelProcess.kill('SIGKILL'); } catch(e) {}
      }
    }, 3000);
    tunnelProcess = null;
  }
  try { execSync('pkill -9 -f "cloudflared tunnel" 2>/dev/null || true'); } catch(e) {}
  tunnelUrl = '';
  log('Tunnel stopped');
}

function getStatus() {
  const running = tunnelProcess !== null && tunnelProcess.exitCode === null;
  const state = readState();
  return {
    running,
    url: tunnelUrl || state.url,
    uptime: tunnelProcess ? Math.round((Date.now() - lastHealTime) / 1000) + 's' : '0s',
    restarts: healCount,
    maxRestarts: MAX_HEALS,
    cooldownRemaining: Math.max(0, Math.round((HEAL_COOLDOWN - (Date.now() - lastHealTime)) / 1000)),
    lastCheck: state.lastCheck,
    alive: state.alive,
    healing: isHealing,
    installed: fs.existsSync(CLOUDFLARED),
    pid: tunnelProcess ? tunnelProcess.pid : null,
  };
}

// Gateway route handler
function handleRoute(req, res) {
  const urlPath = req.url.split('?')[0];

  // GET /api/health -> return system health including tunnel
  if (urlPath === '/api/health' && req.method === 'GET') {
    const status = getStatus();
    
    // Auto-heal: if tunnel not running, kick it
    if (!status.running && !isHealing && healCount < MAX_HEALS) {
      startTunnel(); // fire and forget
    }

    // Write health check file for external monitoring
    try {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(HEALTH_CHECK_FILE, JSON.stringify({
        timestamp: new Date().toISOString(),
        tunnel: status,
        gateway: 'ok'
      }));
    } catch(e) {}

    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache'
    });
    res.end(JSON.stringify({
      status: 'ok',
      gateway: 'running',
      tunnel: status,
      endpoints: ['/api/health', '/api/tunnel2/status', '/api/tunnel2/start', '/api/tunnel2/stop']
    }));
    return true;
  }

  // GET /api/tunnel2/status
  if (urlPath === '/api/tunnel2/status' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-cache' });
    res.end(JSON.stringify(getStatus()));
    return true;
  }

  // POST /api/tunnel2/start
  if (urlPath === '/api/tunnel2/start' && req.method === 'POST') {
    startTunnel().then(result => {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify(result));
    });
    return true;
  }

  // POST /api/tunnel2/stop
  if (urlPath === '/api/tunnel2/stop' && req.method === 'POST') {
    stopTunnel();
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ success: true }));
    return true;
  }

  return false;
}

// Auto-start on load (called by gateway)
function autoStart() {
  if (!fs.existsSync(CLOUDFLARED)) {
    log('⚠️ cloudflared not installed — autoheal inactive');
    return;
  }

  // Check if there's an existing tunnel URL we can try to fix
  const state = readState();
  if (state.url) tunnelUrl = state.url;
  
  log('🔧 Auto-heal initialized');
  
  // Wait 5s for gateway to settle, then start tunnel
  setTimeout(() => {
    startTunnel().then(r => {
      if (r.success) log(`✅ Auto-start initiated`);
      else log(`⚠️ Auto-start issue: ${r.error}`);
    });
  }, 5000);
}

module.exports = { handleRoute, startTunnel, stopTunnel, getStatus, autoStart };
