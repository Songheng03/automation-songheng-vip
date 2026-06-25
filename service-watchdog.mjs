#!/usr/bin/env node
/**
 * service-watchdog.mjs — my-automaton Service Watchdog
 * 
 * Monitors all 22 services, restarts dead ones, logs uptime.
 * Runs as a daemon via heartbeat or nohup.
 * 
 * Start: node service-watchdog.mjs &
 */

import { execSync } from 'child_process';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { createServer } from 'http';

const SERVICES = [
  { port: 3000, name: 'text-utility', file: 'services/text-utility.mjs' },
  { port: 3001, name: 'pastebin', file: 'services/pastebin.mjs' },
  { port: 3003, name: 'url-shortener', file: 'services/url-shortener.mjs' },
  { port: 3020, name: 'x402-gateway', file: 'services/x402-gateway.mjs' },
  { port: 3030, name: 'code-analysis', file: 'services/code-analysis.mjs' },
  { port: 3095, name: 'mcp-server', file: 'services/mcp-server.mjs' },
  { port: 3097, name: 'markdown', file: 'services/markdown.mjs' },
  { port: 3098, name: 'docs', file: 'services/docs.mjs' },
  { port: 3099, name: 'registry', file: 'services/registry.mjs' },
  { port: 3110, name: 'promotion-hub', file: 'services/promotion-hub.mjs' },
  { port: 3111, name: 'live-dashboard', file: 'services/live-dashboard.mjs' },
  { port: 3120, name: 'handshake', file: 'services/handshake.mjs' },
  { port: 3125, name: 'beacon', file: 'services/beacon.mjs' },
  { port: 3150, name: 'referral', file: 'services/referral.mjs' },
  { port: 3165, name: 'revenue-engine', file: 'services/revenue-engine.mjs' },
  { port: 3170, name: 'x402-demo', file: 'services/x402-demo.mjs' },
  { port: 3188, name: 'unified-dashboard', file: 'services/unified-dashboard.mjs' },
  { port: 4150, name: 'outreach-bot', file: 'services/outreach-bot.mjs' },
  { port: 4250, name: 'billing-portal', file: 'services/billing-portal.mjs' },
  { port: 4260, name: 'x402-verify', file: 'services/x402-verify.mjs' },
  { port: 4280, name: 'agent-compat', file: 'services/agent-compat.mjs' },
  { port: 4290, name: 'referral-ledger', file: 'services/referral-ledger.mjs' },
];

const LOG_FILE = '/var/log/watchdog.log';
const STATUS_FILE = '/root/automaton/watchdog-status.json';
const CHECK_INTERVAL_MS = 30000; // 30 seconds
const STARTUP_GRACE_MS = 5000;

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  try { writeFileSync(LOG_FILE, line + '\n', { flag: 'a' }); } catch {}
}

function checkService(service) {
  return new Promise((resolve) => {
    const start = Date.now();
    const req = require('http').request(
      { hostname: 'localhost', port: service.port, path: '/', method: 'HEAD', timeout: 3000 },
      (res) => resolve({ alive: true, status: res.statusCode, ms: Date.now() - start })
    );
    req.on('error', () => resolve({ alive: false, status: null, ms: Date.now() - start }));
    req.on('timeout', () => { req.destroy(); resolve({ alive: false, status: null, ms: Date.now() - start }); });
    req.end();
  });
}

function startService(service) {
  try {
    const pid = execSync(
      `cd /root/automaton && nohup node ${service.file} > /var/log/${service.name}.log 2>&1 & echo $!`,
      { shell: true, timeout: 5000 }
    ).toString().trim();
    log(`🔄 RESTARTED ${service.name} on port ${service.port} (PID: ${pid})`);
    return pid;
  } catch (e) {
    log(`❌ FAILED to start ${service.name}: ${e.message}`);
    return null;
  }
}

async function healthCheck() {
  const results = { timestamp: new Date().toISOString(), total: SERVICES.length, alive: 0, dead: 0, restarts: 0, services: [] };
  
  for (const svc of SERVICES) {
    const status = await checkService(svc);
    results.services.push({
      name: svc.name,
      port: svc.port,
      alive: status.alive,
      responseTimeMs: status.ms
    });
    
    if (status.alive) {
      results.alive++;
    } else {
      results.dead++;
      log(`⚠️  ${svc.name} (port ${svc.port}) is DOWN — restarting...`);
      startService(svc);
      results.restarts++;
    }
  }
  
  // Write status file
  try { writeFileSync(STATUS_FILE, JSON.stringify(results, null, 2)); } catch {}
  
  log(`📊 Watchdog: ${results.alive}/${results.total} alive, ${results.restarts} restarted`);
  return results;
}

// Status endpoint for health checks
function startStatusServer() {
  const server = createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      const data = existsSync(STATUS_FILE) ? readFileSync(STATUS_FILE, 'utf8') : '{"status":"starting"}';
      res.end(data);
    } else {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end(`my-automaton Watchdog\nAlive: check /health\nLogs: ${LOG_FILE}`);
    }
  });
  server.listen(4199, '0.0.0.0', () => log(`📡 Watchdog status server on port 4199`));
}

// Main loop
async function main() {
  log('🚀 my-automaton Service Watchdog starting...');
  log(`📋 Monitoring ${SERVICES.length} services every ${CHECK_INTERVAL_MS/1000}s`);
  
  startStatusServer();
  
  // Initial health check after grace period
  await new Promise(r => setTimeout(r, STARTUP_GRACE_MS));
  await healthCheck();
  
  // Periodic checks
  setInterval(healthCheck, CHECK_INTERVAL_MS);
  
  log('✅ Watchdog running');
}

main().catch(e => log(`💥 Watchdog crashed: ${e.message}`));
