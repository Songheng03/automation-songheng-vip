#!/usr/bin/env node
/**
 * health-daemon.cjs — Container-side diagnostics
 * 
 * Monitors gateway health from inside the container.
 * Writes status to data/ for content pages to reference.
 * 
 * Run: node scripts/health-daemon.cjs
 */

const fs = require('fs');
const http = require('http');
const path = require('path');

const STATUS_PATH = '/root/automaton/data/live-status.json';

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

  const status = {
    timestamp: now,
    gateway: {
      running: h.status === 200,
      status_code: h.status,
      version: healthData.version || 'unknown',
      deepseek: !!healthData.deepseek,
      uptime_seconds: healthData.uptime || 0
    },
    stats: {
      total_keys: stats.total_keys || 0,
      total_revenue_usd: stats.total_revenue_usd || 0,
      credits_sold: stats.total_credits_sold || 0,
      credits_remaining: stats.total_credits_remaining || 0,
      credit_utilization_pct: stats.total_credits_sold > 0 
        ? Math.round(((stats.total_credits_sold - stats.total_credits_remaining) / stats.total_credits_sold) * 10000) / 100 
        : 0,
      free_usage_today: stats.free_usage_today || 0
    },
    tunnel: {
      status: 'unknown_from_container',
      note: 'External tunnel requires host-side check. Run: curl -s https://automation.songheng.vip/health'
    }
  };

  fs.mkdirSync(path.dirname(STATUS_PATH), { recursive: true });
  fs.writeFileSync(STATUS_PATH, JSON.stringify(status, null, 2));
  
  console.log(`[${now}] Gateway: ${h.status} (v${healthData.version || '?'}) | Keys: ${status.stats.total_keys} | Revenue: $${status.stats.total_revenue_usd}`);
  return status;
}

// Run directly
checkHealth().catch(e => console.error(e));
