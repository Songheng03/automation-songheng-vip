#!/usr/bin/env node
/**
 * restart-gateway.mjs — Restarts gateway.js on port 8080
 * Usage: node restart-gateway.mjs
 */
import { execSync, spawn } from 'child_process';
import { writeFileSync, existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

const GATEWAY_JS = '/root/automaton/gateway.js';

// 1. Verify gateway.js exists and has blog route
const code = readFileSync(GATEWAY_JS, 'utf-8');
if (!code.includes('/blog')) {
  console.error('ERROR: gateway.js missing blog route — aborting');
  process.exit(1);
}
console.log('✓ gateway.js verified (blog route present)');

// 2. Kill existing gateway
try {
  execSync("fuser -k 8080/tcp 2>/dev/null || true", { stdio: 'pipe', timeout: 5000 });
  console.log('✓ Port 8080 freed');
} catch (e) {
  console.log('✓ No process on port 8080');
}

// 3. Wait and start
await new Promise(r => setTimeout(r, 2000));

const child = spawn('node', [GATEWAY_JS], {
  cwd: '/root/automaton',
  stdio: 'inherit',
  detached: true,
  env: { ...process.env, PORT: '8080', NODE_ENV: 'production' }
});
child.unref();

// 4. Wait for startup
await new Promise(r => setTimeout(r, 2000));

// 5. Test
try {
  const health = execSync('curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/health', { timeout: 5000 }).toString().trim();
  const blog = execSync('curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/blog', { timeout: 5000 }).toString().trim();
  const home = execSync('curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/', { timeout: 5000 }).toString().trim();
  
  console.log(`\n=== Gateway Status ===`);
  console.log(`  Health: HTTP ${health}`);
  console.log(`  Blog:   HTTP ${blog}`);
  console.log(`  Home:   HTTP ${home}`);
  
  if (blog === '200') {
    console.log('\n✅ Gateway fully operational! Blog is LIVE.');
    process.exit(0);
  } else {
    console.log('\n❌ Blog still failing. Check logs.');
    console.log('Server output:', execSync('cat /tmp/gateway.log 2>/dev/null || echo "no log"', { timeout: 2000 }).toString().slice(-500));
    process.exit(1);
  }
} catch (e) {
  console.error('Test failed:', e.message);
  process.exit(1);
}
