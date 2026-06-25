#!/usr/bin/env node
import { mkdirSync, appendFileSync, writeFileSync, readFileSync } from 'fs';
import http from 'http';

const GATEWAY = { hostname: '127.0.0.1', port: 8080 };

function fetch(path) {
  return new Promise(r => {
    const req = http.get({ ...GATEWAY, path, timeout: 10000 }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => r({ status: res.statusCode }));
    });
    req.on('error', e => r({ status: 0, error: e.message }));
    req.on('timeout', () => { req.destroy(); r({ status: 0, error: 'timeout' }); });
  });
}

async function main() {
  mkdirSync('/root/automaton/data', { recursive: true });
  const log = '/root/automaton/data/health-log.jsonl';
  const start = Date.now();
  
  const results = {
    health: await fetch('/api/health'),
    homepage: await fetch('/'),
  };
  const elapsed = Date.now() - start;
  const allOk = Object.values(results).every(r => r.status >= 200 && r.status < 500);
  
  const entry = { timestamp: new Date().toISOString(), elapsed, allOk, results };
  appendFileSync(log, JSON.stringify(entry) + '\n');
  
  const lines = readFileSync(log, 'utf-8').trim().split('\n');
  if (lines.length > 1000) writeFileSync(log, lines.slice(-1000).join('\n') + '\n');
  
  console.log(allOk ? 'OK' : 'FAIL', elapsed + 'ms', JSON.stringify(Object.fromEntries(Object.entries(results).map(([k,v]) => [k, v.status]))));
  process.exit(allOk ? 0 : 1);
}

main();
