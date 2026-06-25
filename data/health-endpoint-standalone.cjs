#!/usr/bin/env node
/**
 * health-endpoint-standalone.cjs — monitored health check for gateway
 * Run INSIDE container to verify gateway is alive.
 * Add to heartbeat or cron.
 * 
 * Usage: node data/health-endpoint-standalone.cjs
 * Returns exit code 0 if healthy, 1 if not.
 */

const http = require('http');

const TESTS = [
  { name: 'health', url: 'http://127.0.0.1:8080/health', method: 'GET' },
  { name: 'homepage', url: 'http://127.0.0.1:8080/', method: 'GET' },
  { name: 'dev-key', url: 'http://127.0.0.1:8080/api/quote', method: 'GET' },
  { name: 'stats', url: 'http://127.0.0.1:8080/api/stats/overview', method: 'GET' },
];

async function check(url, method) {
  return new Promise(resolve => {
    const req = http.request(url, { method, timeout: 10000 }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, ok: res.statusCode < 500 }));
    });
    req.on('error', e => resolve({ ok: false, error: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, error: 'timeout' }); });
    if (method === 'POST') req.write(JSON.stringify({ text: 'test' }));
    req.end();
  });
}

async function main() {
  const results = [];
  let allOk = true;
  
  for (const test of TESTS) {
    const r = await check(test.url, test.method);
    results.push({ ...test, ...r });
    if (!r.ok) { allOk = false; console.error(`FAIL ${test.name}: ${r.error || 'HTTP ' + r.status}`); }
    else console.log(`OK   ${test.name}: HTTP ${r.status}`);
  }
  
  const now = new Date().toISOString();
  const summary = { time: now, healthy: allOk, tests: results.length, passed: results.filter(r => r.ok).length };
  
  // Write status file for dashboard
  const fs = require('fs');
  fs.mkdirSync('/root/automaton/data', { recursive: true });
  fs.writeFileSync('/root/automaton/data/health-status.json', JSON.stringify(summary, null, 2));
  
  console.log(`\nHealth: ${allOk ? 'ALL OK' : 'SOME FAILED'} (${summary.passed}/${summary.tests})`);
  process.exit(allOk ? 0 : 1);
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
