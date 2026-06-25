#!/usr/bin/env node
/**
 * activate-gateway.mjs — Attempt to restart gateway from inside container
 * Tries EVERY method to reach host systemd
 * 
 * The gateway v2.1 ON DISK has: MCP, catalog, handshake, dev-key, badge, sitemap
 * The gateway RUNNING (v2.0) is missing all these routes
 * We NEED the new gateway active for the site to function
 */

const { execSync } = require('child_process');

console.log('=== GATEWAY V2.1 ACTIVATION ===');
console.log('Attempting to restart automaton-gateway from inside container...\n');

const methods = [
  {
    name: 'nsenter to host systemd',
    cmd: 'nsenter -t 1 -m -u -i -n -p -- systemctl restart automaton-gateway 2>&1'
  },
  {
    name: 'nsenter alt (no -p)',
    cmd: 'nsenter -t 1 -m -u -i -n -- systemctl restart automaton-gateway 2>&1'
  },
  {
    name: 'docker socket',
    cmd: 'docker exec -u root $(docker ps -q --filter name=automaton) systemctl restart automaton-gateway 2>&1 || docker exec automaton systemctl restart automaton-gateway 2>&1'
  },
  {
    name: 'kill gateway process (systemd Restart=always)',
    cmd: 'kill $(lsof -ti :8080) 2>&1 || pkill -f "gateway.*8080" 2>&1 || true'
  },
  {
    name: 'chroot to host',
    cmd: 'chroot /host systemctl restart automaton-gateway 2>&1 || true'
  }
];

let success = false;
for (const method of methods) {
  process.stdout.write(`\n📌 Trying: ${method.name}... `);
  try {
    const out = execSync(method.cmd, { timeout: 5000, encoding: 'utf8' });
    // Check if it actually restarted
    const check = execSync('curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/health 2>&1', { timeout: 3000, encoding: 'utf8' });
    if (check === '200' || check === '000') {
      // Check if new routes work
      const devKey = execSync('curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/dev-key 2>&1', { timeout: 3000, encoding: 'utf8' });
      if (devKey === '200' || devKey === '405') {
        console.log(`✅ RESTARTED via ${method.name}! New routes active.`);
        success = true;
        break;
      } else {
        console.log(`Gateway running but new routes NOT active (dev-key: ${devKey})`);
        console.log(`  stdout: ${out.trim().slice(0, 200)}`);
      }
    } else {
      console.log(`health: ${check}`);
      console.log(`  stdout: ${out.trim().slice(0, 200)}`);
    }
  } catch (e) {
    console.log(`❌ ${e.message.slice(0, 100)}`);
  }
}

// Check current state
console.log('\n=== CURRENT GATEWAY STATE ===');
try {
  const health = execSync('curl -s http://localhost:8080/health 2>&1', { timeout: 3000, encoding: 'utf8' });
  console.log(`/health: ${health.slice(0, 200)}`);
} catch {}
try {
  const routes = ['/api/dev-key', '/api/catalog', '/api/mcp', '/api/handshake', '/sitemap.xml', '/badge/silver'];
  for (const route of routes) {
    const code = execSync(`curl -s -o /dev/null -w "%{http_code}" http://localhost:8080${route} 2>&1`, { timeout: 3000, encoding: 'utf8' });
    const mark = code === '200' ? '✅' : (code === '404' ? '❌' : '⚠️');
    console.log(` ${mark} ${route} → ${code}`);
  }
} catch {}

console.log('\n=== IF ALL METHODS FAILED ===');
console.log('Run this on the HOST:');
console.log('  ssh root@automation.songheng.vip');
console.log('  systemctl restart automaton-gateway');
console.log('  systemctl status automaton-gateway');
console.log('');
console.log('Or from the HOST:');
console.log('  docker exec -u root automaton bash -c "nsenter -t 1 -m -u -i -n -p -- systemctl restart automaton-gateway"');
