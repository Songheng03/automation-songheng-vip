#!/usr/bin/env node
/**
 * revenue-daemon.mjs — Revenue monitoring & alert daemon
 * 
 * Runs as a background process, polling the gateway health/stats endpoints
 * every 30 seconds. Logs any changes, alerts on new API keys issued
 * or traffic detected.
 * 
 * Usage: node scripts/revenue-daemon.mjs
 *        node scripts/revenue-daemon.mjs --once (single check)
 */

const GATEWAY = 'http://localhost:8080';
const DATA_DIR = '/root/automaton/data';
const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(DATA_DIR, 'revenue-state.json');

function loadState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8')); } catch {
    return { lastKeyCount: 0, totalVisits: 0, isFirstRun: true, lastLog: null };
  }
}

function saveState(s) {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(s, null, 2));
}

async function checkStats() {
  try {
    const resp = await fetch(GATEWAY + '/api/stats/overview');
    if (!resp.ok) return null;
    return await resp.json();
  } catch { return null; }
}

async function checkHealth() {
  try {
    const resp = await fetch(GATEWAY + '/health');
    if (!resp.ok) return null;
    return await resp.json();
  } catch { return null; }
}

async function checkTraffic() {
  try {
    const resp = await fetch(GATEWAY + '/api/stats/overview');
    if (!resp.ok) return null;
    return await resp.json();
  } catch { return null; }
}

async function runOnce() {
  const state = loadState();
  const health = await checkHealth();
  const stats = await checkStats();
  
  if (!health) {
    console.log('⚠️  Gateway unreachable');
    return;
  }
  
  console.log('');
  console.log('╔══════════════════════════════════════╗');
  console.log('║    my-automaton Revenue Monitor      ║');
  console.log('╠══════════════════════════════════════╣');
  console.log(`║  Status:     ${'✅ LIVE'.padEnd(24)}║`);
  console.log(`║  Uptime:     ${(health.uptime || 0).toFixed(1)}s`.padEnd(42) + '║');
  console.log(`║  Version:    ${(health.version || '?')}`.padEnd(42) + '║');
  console.log(`║  DeepSeek:   ${health.deepseek ? '✅' : '❌'}`.padEnd(42) + '║');
  console.log('╠══════════════════════════════════════╣');
  
  if (stats) {
    const keyCount = stats.total_keys || 0;
    const newKeys = keyCount - state.lastKeyCount;
    
    console.log(`║  API Keys:   ${keyCount} (+${newKeys > 0 ? newKeys : 0})`.padEnd(42) + '║');
    console.log(`║  Used:       ${stats.total_used || 0}`.padEnd(42) + '║');
    console.log(`║  Revenue:    $${(stats.total_revenue || 0).toFixed(2)}`.padEnd(42) + '║');
    
    if (newKeys > 0 && !state.isFirstRun) {
      console.log('╠══════════════════════════════════════╣');
      console.log(`║  🎉 ${newKeys} NEW API KEY(S) ISSUED!`.padEnd(42) + '║');
    }
    
    state.lastKeyCount = keyCount;
  }
  
  console.log('╚══════════════════════════════════════╝');
  console.log('');
  
  state.isFirstRun = false;
  saveState(state);
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--once')) {
    await runOnce();
    process.exit(0);
  }
  
  console.log('🔄 Revenue daemon started — checking every 30s');
  console.log('   Press Ctrl+C to stop\n');
  
  // Run immediately
  await runOnce();
  
  // Then every 30 seconds
  setInterval(async () => {
    const now = new Date().toLocaleTimeString();
    try {
      const health = await checkHealth();
      if (health) {
        const stats = await checkStats();
        const state = loadState();
        const keyCount = stats?.total_keys || 0;
        
        if (keyCount > state.lastKeyCount) {
          const diff = keyCount - state.lastKeyCount;
          console.log(`🎯 [${now}] ${diff} NEW API KEY(S)! Total: ${keyCount}`);
          state.lastKeyCount = keyCount;
          saveState(state);
        }
      }
    } catch {}
  }, 30000);
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
