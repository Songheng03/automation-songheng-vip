#!/usr/bin/env node
/**
 * distribution-scheduler.mjs — Automated content distribution & revenue monitor
 * 
 * Runs directly: node /root/automaton/scripts/distribution-scheduler.mjs
 */

const LOG_FILE = '/root/services/scheduler-status.json';
const WORKLOG = '/root/automaton/WORKLOG.md';
const GATEWAY_CHECK_URL = 'http://localhost:8080';

import { writeFileSync, readFileSync, existsSync, appendFileSync } from 'fs';

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
}

async function checkGateway() {
  const checks = {
    '/': { expected: 200 },
    '/demo.html': { expected: 200 },
    '/upgrade.html': { expected: 200 },
    '/api-docs.html': { expected: 200 },
    '/ci-cd-integration.html': { expected: 200 },
  };

  const results = {};
  let allOk = true;

  for (const [path, config] of Object.entries(checks)) {
    try {
      const resp = await fetch(`${GATEWAY_CHECK_URL}${path}`, { method: 'HEAD' });
      results[path] = resp.status;
      if (resp.status !== config.expected) allOk = false;
    } catch (err) {
      results[path] = `ERROR: ${err.message}`;
      allOk = false;
    }
  }

  return { allOk, results };
}

async function checkRevenue() {
  try {
    const resp = await fetch(`${GATEWAY_CHECK_URL}/api/stats/overview`);
    if (resp.ok) return await resp.json();
    const resp2 = await fetch(`${GATEWAY_CHECK_URL}/api/stats`);
    if (resp2.ok) return await resp2.json();
  } catch (err) {
    return { error: err.message };
  }
  return { note: 'no stats endpoint' };
}

function saveStatus(status) {
  const prev = existsSync(LOG_FILE) 
    ? JSON.parse(readFileSync(LOG_FILE, 'utf8')) 
    : { history: [] };
  
  if (!prev.history) prev.history = [];
  prev.history.push({ timestamp: new Date().toISOString(), ...status });
  if (prev.history.length > 20) prev.history = prev.history.slice(-20);
  prev.latest = status;
  prev.lastRun = new Date().toISOString();
  writeFileSync(LOG_FILE, JSON.stringify(prev, null, 2));
}

function updateWorklog(status) {
  const now = new Date().toISOString().substring(0, 10);
  let worklog = '';
  if (existsSync(WORKLOG)) worklog = readFileSync(WORKLOG, 'utf8');
  
  const dateLine = `# WORKLOG — Last Updated: ${now}`;
  if (worklog.startsWith('# WORKLOG')) {
    worklog = worklog.replace(/^# WORKLOG.*/, dateLine);
  } else {
    worklog = dateLine + '\n\n' + worklog;
  }
  
  const entry = `\n- [${now} ${new Date().toISOString().substring(11, 16)}] Scheduler: gateway=${status.gateway?.allOk ? 'OK' : 'ISSUES'}`;
  writeFileSync(WORKLOG, worklog);
  appendFileSync(WORKLOG, entry + '\n');
}

async function main() {
  log('=== Distribution Scheduler Run ===');
  
  const gateway = await checkGateway();
  log(`Gateway: ${gateway.allOk ? '✅ All OK' : '⚠️ Issues'}`);
  for (const [p, s] of Object.entries(gateway.results)) log(`  ${p}: ${s}`);

  const revenue = await checkRevenue();
  log(`Revenue: ${JSON.stringify(revenue).substring(0, 200)}`);

  const status = { gateway, revenue };
  saveStatus(status);
  updateWorklog(status);

  console.log('\n=== Summary ===');
  console.log(`Gateway: ${gateway.allOk ? '✅' : '⚠️'}`);
  console.log(`Revenue Keys: ${revenue?.total_api_keys || 0}`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
