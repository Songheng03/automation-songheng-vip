#!/usr/bin/env node
/**
 * Tunnel Watchdog + Auto-SEO Blitz
 * 
 * Runs in background, checks tunnel every 60s.
 * When tunnel comes back online: immediately fires SEO blitz.
 * 
 * Usage: node /root/automaton/scripts/tunnel-watchdog.mjs
 */

import { execSync } from 'child_process';
import { appendFileSync, writeFileSync, existsSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, '..', 'data');
const LOG_FILE = resolve(DATA_DIR, 'tunnel-watchdog.log');
const STATE_FILE = resolve(DATA_DIR, 'tunnel-state.json');

if (!existsSync(DATA_DIR)) {
  const { mkdirSync } = await import('fs');
  mkdirSync(DATA_DIR, { recursive: true });
}

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  appendFileSync(LOG_FILE, line + '\n');
}

function checkTunnel() {
  try {
    const out = execSync('curl -s -o /dev/null -w "%{http_code}" https://automation.songheng.vip/ --max-time 10', { timeout: 12000 });
    const code = parseInt(out.toString().trim());
    return code === 200;
  } catch {
    return false;
  }
}

function loadState() {
  try {
    return JSON.parse(readFileSync(STATE_FILE, 'utf-8'));
  } catch {
    return { lastStatus: 'down', lastOnline: null, blitzCount: 0 };
  }
}

function saveState(state) {
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function runSEOScript(path) {
  try {
    log(`Running SEO script: ${path}`);
    const out = execSync(`node ${path}`, { timeout: 30000 });
    log(`SEO script output: ${out.toString().trim().slice(0,200)}`);
    return true;
  } catch (err) {
    log(`SEO script failed: ${err.message.slice(0,200)}`);
    return false;
  }
}

function seoBlitz() {
  log('🚀 TUNNEL IS BACK! Running SEO blitz...');
  
  const scripts = [
    resolve(__dirname, 'ping-search-engines.js'),
    resolve(__dirname, 'quick-outreach.sh'),
    resolve(__dirname, 'promote.sh'),
  ];

  const results = [];
  for (const script of scripts) {
    if (existsSync(script)) {
      results.push({ script, status: runSEOScript(script) ? '✅' : '❌' });
    }
  }

  log(`SEO blitz complete: ${results.map(r => `${r.status} ${r.script.split('/').pop()}`).join(', ')}`);
  return results;
}

// === MAIN LOOP ===
log('🔍 Tunnel Watchdog started — checking every 60s');
let state = loadState();
let consecutiveFailures = 0;

(async function loop() {
  const isUp = checkTunnel();
  const previousWasUp = state.lastStatus === 'up';

  if (isUp && !previousWasUp) {
    log('🟢 Tunnel TRANSITIONED from DOWN to UP!');
    state.lastStatus = 'up';
    state.lastOnline = new Date().toISOString();
    state.blitzCount++;
    saveState(state);
    seoBlitz();
  } else if (isUp) {
    // Still up — nothing to do
    state.lastStatus = 'up';
    saveState(state);
  } else {
    state.lastStatus = 'down';
    saveState(state);
    consecutiveFailures++;
    if (consecutiveFailures % 60 === 0) {
      log(`⏳ Still down... ${Math.floor(consecutiveFailures * 60 / 3600)}h waiting`);
    }
  }

  setTimeout(loop, 60000);
})();
