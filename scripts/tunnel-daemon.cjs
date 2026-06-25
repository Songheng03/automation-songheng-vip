#!/usr/bin/env node
/**
 * tunnel-daemon.cjs — Gateway tunnel health monitor
 * 
 * Runs inside container, checks if public access is working.
 * If tunnel is down, tries to diagnose and writes a status page.
 * 
 * Usage: node /root/automaton/scripts/tunnel-daemon.cjs
 * Can be run as a cron job or heartbeat task.
 */

const fs = require('fs');
const http = require('http');
const https = require('https');

const DOMAIN = 'https://automation.songheng.vip';
const LOCAL = 'http://localhost:8080';
const STATUS_FILE = '/root/automaton/content/tunnel-status.html';
const DIAG_FILE = '/root/automaton/data/tunnel-diag.json';

const TIMEOUT = 10000;

function log(m) { const t = new Date().toISOString(); console.log(`[${t}] ${m}`); }

async function checkUrl(url, timeout = TIMEOUT) {
  return new Promise((resolve) => {
    const parsed = new URL(url);
    const mod = parsed.protocol === 'https:' ? https : http;
    const req = mod.get(url, { timeout }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => resolve({ status: res.statusCode, body: body.substring(0, 500) }));
    });
    req.on('timeout', () => { req.destroy(); resolve({ status: 0, body: 'timeout' }); });
    req.on('error', (e) => resolve({ status: 0, body: e.message }));
  });
}

async function runDiagnostics() {
  log('Running tunnel diagnostics...');
  
  const results = {
    timestamp: new Date().toISOString(),
    local: null,
    public: null,
    endpoints: {},
    tunnelStatus: 'unknown'
  };
  
  // Check local gateway
  results.local = await checkUrl(`${LOCAL}/health`);
  
  // Check public endpoints
  const endpoints = ['/', '/health', '/api-docs.html', '/get-started.html', '/code-grader.html'];
  for (const ep of endpoints) {
    results.endpoints[ep] = await checkUrl(`${DOMAIN}${ep}`);
  }
  
  // Determine tunnel status
  const publicHealth = results.endpoints['/health'];
  if (publicHealth.status === 200) {
    results.tunnelStatus = '✅ OPERATIONAL';
  } else if (publicHealth.status === 530) {
    results.tunnelStatus = '❌ CLOUDFLARE 530 — Tunnel cannot reach backend';
    results.tunnelFix = 'Run on HOST: sudo systemctl restart cloudflared';
  } else if (publicHealth.status === 502) {
    results.tunnelStatus = '⚠️ CLOUDFLARE 502 — Bad Gateway (backend crashed?)';
  } else if (publicHealth.status === 0) {
    results.tunnelStatus = '❌ DNS FAILURE — Domain not resolving';
  } else {
    results.tunnelStatus = `⚠️ UNKNOWN — HTTP ${publicHealth.status}`;
  }
  
  return results;
}

function generateStatusPage(diag) {
  const isOk = diag.tunnelStatus.includes('✅');
  const color = isOk ? '#2ea043' : '#da3633';
  const icon = isOk ? '✅' : '❌';
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="refresh" content="30">
  <title>my-automaton — Tunnel Status</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 700px; margin: 40px auto; padding: 20px; }
    .status { font-size: 24px; padding: 20px; border-radius: 8px; text-align: center; }
    .ok { background: #dafbe1; color: #1a7f37; }
    .fail { background: #ffebe9; color: #cf222e; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #d0d7de; }
    th { background: #f6f8fa; }
    .pass { color: #1a7f37; }
    .fail { color: #cf222e; }
    .fix { background: #fff8c5; padding: 15px; border-radius: 8px; margin: 20px 0; }
    .fix code { background: #f6f8fa; padding: 3px 6px; border-radius: 4px; }
  </style>
</head>
<body>
  <h1>🔌 Tunnel Status</h1>
  <div class="status ${isOk ? 'ok' : 'fail'}">
    ${icon} ${diag.tunnelStatus}
  </div>
  <p style="color: #656d76; text-align: center;">Last checked: ${new Date(diag.timestamp).toLocaleString()}</p>
  
  <h2>Endpoint Check</h2>
  <table>
    <tr><th>Endpoint</th><th>Local (localhost:8080)</th><th>Public (${DOMAIN})</th></tr>
    <tr>
      <td>/health</td>
      <td class="${diag.local?.status === 200 ? 'pass' : 'fail'}">${diag.local?.status || 'DOWN'}</td>
      <td class="${diag.endpoints['/health']?.status === 200 ? 'pass' : 'fail'}">${diag.endpoints['/health']?.status || 'DOWN'}</td>
    </tr>
    ${Object.entries(diag.endpoints).filter(([k]) => k !== '/health').map(([ep, res]) => `
    <tr>
      <td>${ep}</td>
      <td>—</td>
      <td class="${res.status === 200 || res.status === 301 || res.status === 302 ? 'pass' : 'fail'}">${res.status || 'DOWN'}</td>
    </tr>
    `).join('')}
  </table>
  
  ${!isOk ? `
  <div class="fix">
    <strong>🔧 Fix Required</strong>
    <p>The Cloudflare Tunnel is not reaching the gateway. Run this on the HOST:</p>
    <pre><code>sudo systemctl restart cloudflared
    </code></pre>
    <p>Or re-activate the gateway:</p>
    <pre><code>bash /root/automaton/scripts/host-activate.sh
    </code></pre>
  </div>
  ` : `
  <div class="fix" style="background: #dafbe1;">
    <strong>✅ All Systems Operational</strong>
    <p>The tunnel is working and the gateway is accessible publicly.</p>
  </div>
  `}
  
  <h2>Quick Actions</h2>
  <ul>
    <li><a href="${DOMAIN}/">Visit homepage</a></li>
    <li><a href="${DOMAIN}/health">Health endpoint</a></li>
    <li><a href="${DOMAIN}/api-docs.html">API Documentation</a></li>
    <li><a href="${DOMAIN}/get-started.html">Get Started</a></li>
  </ul>
  
  <p style="color: #656d76; font-size: 12px;">my-automaton · Auto-refresh every 30s</p>
</body>
</html>`;
}

async function main() {
  log('Tunnel daemon starting...');
  const diag = await runDiagnostics();
  
  // Save diagnostic data
  fs.mkdirSync('/root/automaton/data', { recursive: true });
  fs.writeFileSync(DIAG_FILE, JSON.stringify(diag, null, 2));
  
  // Write status page
  fs.writeFileSync(STATUS_FILE, generateStatusPage(diag));
  
  log(`Tunnel status: ${diag.tunnelStatus}`);
  log(`Status page written to tunnel-status.html`);
  
  if (diag.tunnelStatus.includes('❌')) {
    log('');
    log('⚠️  TUNNEL IS DOWN! Users cannot access the service.');
    log('   Fix on HOST: sudo systemctl restart cloudflared');
    log('   Or: bash /root/automaton/scripts/host-activate.sh');
  }
  
  // Summary
  console.log(JSON.stringify({
    timestamp: diag.timestamp,
    status: diag.tunnelStatus,
    local_gateway: diag.local?.status || 0,
    public_health: diag.endpoints['/health']?.status || 0
  }, null, 2));
}

main().catch(e => log(`Error: ${e.message}`));
