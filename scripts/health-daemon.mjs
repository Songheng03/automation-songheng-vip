#!/usr/bin/env node
/**
 * health-daemon.mjs — Container-side diagnostics
 * 
 * Monitors gateway health from inside the container.
 * Writes status to data/ so content pages can show live state.
 * 
 * Run as heartbeat: node scripts/health-daemon.mjs
 */

import fs from 'fs';
import http from 'http';

const STATUS_PATH = '/root/automaton/data/live-status.json';
const CHECK_INTERVAL = 60000; // 1 minute

function get(url) {
  return new Promise(resolve => {
    http.get(url, { timeout: 5000 }, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => resolve({ status: res.statusCode, body: body.substring(0, 500) }));
    }).on('error', e => resolve({ status: 0, body: e.message }))
      .on('timeout', function() { this.destroy(); resolve({ status: 0, body: 'timeout' }); });
  });
}

async function checkHealth() {
  const now = new Date().toISOString();
  
  // Check local gateway
  const h = await get('http://localhost:8080/health');
  let healthData = {};
  try { if (h.body) healthData = JSON.parse(h.body); } catch {}

  // Check stats
  const s = await get('http://localhost:8080/api/stats/overview');
  let stats = {};
  try { if (s.body) stats = JSON.parse(s.body); } catch {}

  // Check tunnel (from inside, we can't check external - need to proxy)
  let tunnelOk = false;
  let tunnelError = '';
  try {
    const ext = await get('http://localhost:8080/tunnel-status.html');
    if (ext.status === 200) tunnelOk = true;
  } catch(e) { tunnelError = e.message; }

  const status = {
    timestamp: now,
    gateway: {
      running: h.status === 200,
      status_code: h.status,
      version: healthData.version || 'unknown',
      deepseek: healthData.deepseek || false,
      uptime: healthData.uptime || 0
    },
    stats: {
      total_keys: stats.total_keys || 0,
      total_revenue: stats.total_revenue_usd || 0,
      credits_remaining: stats.total_credits_remaining || 0,
      credit_utilization: stats.total_credits_sold > 0 
        ? Math.round(((stats.total_credits_sold - stats.total_credits_remaining) / stats.total_credits_sold) * 10000) / 100 
        : 0,
      free_usage_today: stats.free_usage_today || 0
    },
    tunnel: {
      status: tunnelOk ? 'local_only' : 'unknown',
      note: 'External tunnel status cannot be checked from inside container'
    },
    disk: getDiskInfo()
  };

  fs.mkdirSync('/root/automaton/data', { recursive: true });
  fs.writeFileSync(STATUS_PATH, JSON.stringify(status, null, 2));
  
  console.log(`[${now}] Gateway: ${h.status} | Keys: ${status.stats.total_keys} | Revenue: $${status.stats.total_revenue}`);
  return status;
}

function getDiskInfo() {
  try {
    const p = fs.readdirSync('/sys/class/block', { withFileTypes: true });
    return { checked: true };
  } catch { return { checked: false }; }
}

// If run directly (not as heartbeat)
const isDirect = process.argv[1]?.includes('health-daemon');
if (isDirect) {
  checkHealth().catch(e => console.error(e));
} else {
  // Export for heartbeat
  export { checkHealth };
}
