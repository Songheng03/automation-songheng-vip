#!/usr/bin/env node
/**
 * recovery-handler.cjs — Recovery Dashboard + Tunnel API Routes
 * Routes: 
 *   GET  /recovery         → recovery dashboard HTML
 *   GET  /api/tunnel/status → tunnel live status JSON
 *   POST /api/tunnel/restart → restart cloudflared tunnel
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const CONTENT = '/root/automaton/content';
const DATA_DIR = '/root/automaton/data';
const TUNNEL_STATUS_FILE = path.join(DATA_DIR, 'tunnel-live.json');
const TUNNEL_URL_FILE = path.join(DATA_DIR, 'tunnel-url.txt');
const TUNNEL_LOG_FILE = path.join(DATA_DIR, 'cloudflared-gateway.log');

function handleRoute(req, res) {
  const p = req.url;
  const m = req.method;

  // Recovery dashboard
  if (p === '/recovery' && m === 'GET') {
    const filePath = path.join(CONTENT, 'recovery.html');
    if (fs.existsSync(filePath)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(fs.readFileSync(filePath));
    } else {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<!DOCTYPE html><html><head><title>Recovery</title><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:system-ui;max-width:600px;margin:2em auto;padding:0 1em;line-height:1.6}h1{color:#333}.ok{color:#090}.fail{color:#c00}pre{background:#f4f4f4;padding:1em;border-radius:4px;overflow-x:auto}.btn{display:inline-block;padding:.5em 1em;background:#0066cc;color:#fff;text-decoration:none;border-radius:4px}</style></head><body>
      <h1>🔧 Recovery Dashboard</h1>
      <p>Simple recovery page for my-automaton gateway.</p>
      <h2>Quick Links</h2>
      <ul>
        <li><a href="/">Homepage</a></li>
        <li><a href="/health">Health Check</a></li>
        <li><a href="/api/tunnel/status">Tunnel Status</a></li>
      </ul>
      <p>If you're seeing this, the gateway is running but recovery.html is missing.</p>
      </body></html>`);
    }
    return true;
  }

  // Tunnel status
  if (p === '/api/tunnel/status' && m === 'GET') {
    let status = {};
    if (fs.existsSync(TUNNEL_STATUS_FILE)) {
      try { status = JSON.parse(fs.readFileSync(TUNNEL_STATUS_FILE, 'utf8')); } catch(e) {}
    }
    let tunnelURL = '';
    if (fs.existsSync(TUNNEL_URL_FILE)) {
      tunnelURL = fs.readFileSync(TUNNEL_URL_FILE, 'utf8').trim();
    }
    // Check if tunnel process is actually running
    let processAlive = false;
    try {
      const proc = require('child_process').execSync("ps aux | grep 'cloudflared tunnel' | grep -v grep | head -1", { encoding: 'utf8', timeout: 3000 });
      processAlive = proc.trim().length > 0;
    } catch(e) {}

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      tunnel: {
        url: tunnelURL,
        alive: status.alive === true,
        processRunning: processAlive,
        lastStarted: status.started || null,
        lastStopped: status.stopped || null,
        reason: status.reason || null,
        logLines: getTunnelLogTail(10)
      },
      gateway: {
        port: 8080,
        contentDir: CONTENT,
        files: fs.readdirSync(CONTENT).length,
        diskFree: getDiskFree()
      },
      time: new Date().toISOString()
    }));
    return true;
  }

  // Tunnel restart
  if (p === '/api/tunnel/restart' && m === 'POST') {
    try {
      // Kill existing tunnel
      try {
        require('child_process').execSync("pkill -f 'cloudflared tunnel'", { timeout: 3000 });
      } catch(e) {}
      // Give it a moment
      const startTime = new Date().toISOString();
      // Launch new tunnel
      const cloudflared = '/usr/local/bin/cloudflared';
      const tunnelProcess = spawn(cloudflared, ['tunnel', '--url', 'http://localhost:8080', '--no-autoupdate'], {
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false,
      });
      tunnelProcess.stdout.on('data', (data) => {
        const output = data.toString();
        try { fs.appendFileSync(TUNNEL_LOG_FILE, output); } catch(e) {}
        const match = output.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
        if (match) {
          try { fs.writeFileSync(TUNNEL_URL_FILE, match[0]); } catch(e) {}
          try { fs.writeFileSync(TUNNEL_STATUS_FILE, JSON.stringify({ url: match[0], started: new Date().toISOString(), alive: true })); } catch(e) {}
        }
      });
      tunnelProcess.stderr.on('data', (data) => { try { fs.appendFileSync(TUNNEL_LOG_FILE, data.toString()); } catch(e) {} });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        message: 'Tunnel restart initiated',
        started: startTime
      }));
    } catch(e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: e.message }));
    }
    return true;
  }

  return false;
}

function getTunnelLogTail(lines = 10) {
  try {
    if (!fs.existsSync(TUNNEL_LOG_FILE)) return [];
    const content = fs.readFileSync(TUNNEL_LOG_FILE, 'utf8');
    const allLines = content.split('\n').filter(l => l.trim());
    return allLines.slice(-lines);
  } catch(e) { return []; }
}

function getDiskFree() {
  try {
    const out = require('child_process').execSync('df -h / | tail -1', { encoding: 'utf8', timeout: 2000 });
    return out.trim().split(/\s+/).slice(-3, -1).join(' / ');
  } catch(e) { return 'unknown'; }
}

module.exports = { handleRoute };
