#!/usr/bin/env node
// Minimal tunnel checker - verifies current tunnel status
import { readFileSync, writeFileSync, existsSync } from 'fs';

const URL_FILE = '/root/automaton/data/tunnel-live.json';

async function main() {
  const data = JSON.parse(readFileSync(URL_FILE, 'utf8'));
  const url = data.url;
  console.log(`Tunnel URL: ${url}`);
  
  try {
    const resp = await fetch(url + '/');
    console.log(`Gateway: ${resp.status}`);
    return resp.status === 200;
  } catch(e) {
    console.log(`Gateway FAILED: ${e.message}`);
    return false;
  }
}

main().then(ok => process.exit(ok ? 0 : 1));
