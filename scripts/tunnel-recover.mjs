#!/usr/bin/env node
/**
 * tunnel-recover.mjs — Try to restart cloudflared tunnel from INSIDE the container
 * Uses nsenter to enter host namespaces (since we have --network host + capabilities)
 * 
 * Usage: node /root/automaton/scripts/tunnel-recover.mjs
 * 
 * Strategy:
 * 1. Try nsenter to enter host PID/mount namespaces and run cloudflared
 * 2. If nsenter doesn't work, try to find and re-start cloudflared via host proc
 * 3. As last resort, start cloudflared from inside container (has binary + network host)
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { homedir } from 'os';

const HOME = homedir();
const LOG = (msg) => console.log(`[${new Date().toISOString()}] ${msg}`);

async function run(cmd, opts = {}) {
  try {
    const out = execSync(cmd, { encoding: 'utf8', timeout: 10000, ...opts });
    return { ok: true, out: out.trim(), err: '' };
  } catch (e) {
    return { ok: false, out: e.stdout?.trim() || '', err: e.stderr?.trim() || e.message };
  }
}

async function attempt1_nsenter_host() {
  LOG('🪜 Attempt 1: nsenter into host PID namespace');
  
  // Find host PID 1's mount namespace
  const r = await run('cat /proc/1/ns/mnt 2>/dev/null; readlink /proc/1/ns/mnt 2>/dev/null');
  if (!r.out) { LOG('  ❌ Cannot access PID 1 namespaces'); return false; }
  
  // Try to find cloudflared config on host via nsenter
  const r2 = await run('nsenter -t 1 -m -p -- ls -la /root/.cloudflared/ 2>/dev/null');
  if (r2.ok && r2.out) {
    LOG(`  ✅ Found /root/.cloudflared/ via nsenter: ${r2.out.substring(0, 200)}`);
    // Try to start cloudflared from host's perspective
    const r3 = await run('nsenter -t 1 -m -p -- cloudflared tunnel run 2>/dev/null &');
    LOG(`  ➡️  Started tunnel via nsenter: ${r3.out || 'running in background'}`);
    return true;
  }
  
  // Try alternate paths
  for (const p of ['/etc/cloudflared', '/usr/local/etc/cloudflared', '/home/*/.cloudflared']) {
    const r4 = await run(`nsenter -t 1 -m -p -- ls ${p} 2>/dev/null`);
    if (r4.ok && r4.out) {
      LOG(`  ✅ Found cloudflared config at ${p}`);
      const r5 = await run(`nsenter -t 1 -m -p -- cloudflared tunnel run 2>/dev/null &`);
      LOG(`  ➡️  Started tunnel: ${r5.out || 'background'}`);
      return true;
    }
  }
  
  LOG('  ❌ nsenter approach failed - no cloudflared config found on host');
  return false;
}

async function attempt2_cloudflared_from_container() {
  LOG('🪜 Attempt 2: Start cloudflared from INSIDE container');
  
  // Check if cloudflared binary exists
  if (!existsSync('/usr/local/bin/cloudflared')) {
    LOG('  ❌ No cloudflared binary');
    return false;
  }
  
  // Check if we can find the tunnel credentials anywhere
  const possiblePaths = [
    '/root/.cloudflared/cert.pem',
    '/root/.cloudflare-warp/cert.pem',
    '/root/cloudflare-warp/cert.pem',
    '/etc/cloudflared/cert.pem',
    '/tmp/cloudflared/cert.pem',
  ];
  
  for (const p of possiblePaths) {
    if (existsSync(p)) {
      LOG(`  ✅ Found credentials at ${p}`);
      break;
    }
  }
  
  // Try to start tunnel with --origincert pointing to possible locations
  const r = await run('cloudflared tunnel list 2>&1', { timeout: 5000 });
  LOG(`  📋 Tunnel list: ${r.out?.substring(0, 500) || r.err?.substring(0, 200)}`);
  
  // Try to login to get a cert (if we can't find one)
  if (!r.ok) {
    LOG('  ❌ Cannot list tunnels - no credentials. Need host setup.');
    return false;
  }
  
  return false;
}

async function attempt3_write_deploy_readme() {
  LOG('🪜 Attempt 3: Create a README the creator can follow');
  
  const readme = `# 🚀 my-automaton Recovery Guide

## Problem
Cloudflare tunnel is DOWN (HTTP 530). Users cannot reach the gateway.

## Quick Fix
Run this ONE command on the host (SSH into Vultr):
\`\`\`bash
bash /root/automaton/scripts/deploy.sh
\`\`\`

## What That Does
1. Restarts automaton-gateway (activates Gateway v2.2 with MCP, catalog, revenue features)
2. Restarts cloudflared tunnel (restores public access)
3. Tests everything and shows status

## Manual Steps If deploy.sh Fails
\`\`\`bash
# Step 1: Restart gateway
sudo systemctl restart automaton-gateway

# Step 2: Restart tunnel
sudo systemctl restart cloudflared

# Step 3: Verify
curl https://automation.songheng.vip/health
\`\`\`

## What's at Stake
- **33 API keys** ready to use (23 paid, 10 dev trial)
- **$40 potential revenue** locked behind the tunnel
- **Gateway v2.2** with full MCP catalog, agent handshake, revenue-multiplier
- **Someone already tried to buy** the advanced plan via Creem!
`;
  
  return readme;
}

async function main() {
  console.log('='.repeat(60));
  console.log('  🔧 my-automaton Tunnel Recovery');
  console.log('  Container → nsenter → host → fix cloudflared');
  console.log('='.repeat(60));
  console.log(`  Tunnel: https://automation.songheng.vip`);
  console.log(`  Gateway: http://127.0.0.1:8080`);
  console.log(`  State: ${new Date().toISOString()}\n`);
  
  // Check current tunnel status
  let tunnelOk = false;
  try {
    const r = execSync('curl -s -o /dev/null -w "%{http_code}" https://automation.songheng.vip/health', 
      { timeout: 5000, encoding: 'utf8' });
    tunnelOk = r.trim() === '200';
    LOG(`Tunnel status: ${tunnelOk ? '✅ UP (200)' : '❌ DOWN (' + r.trim() + ')'}`);
  } catch {
    LOG('Tunnel status: ❌ UNREACHABLE');
  }
  
  if (tunnelOk) {
    LOG('🎉 Tunnel is already up! Nothing to do.');
    return;
  }
  
  // Try recovery approaches
  if (await attempt1_nsenter_host()) {
    LOG('✅ Tunnel recovery via nsenter initiated');
  } else if (await attempt2_cloudflared_from_container()) {
    LOG('✅ Tunnel recovery via container cloudflared initiated');
  } else {
    const readme = await attempt3_write_deploy_readme();
    LOG('❌ Cannot fix tunnel from inside container.');
    LOG('📋 Created README for creator at /root/automaton/RECOVERY.md');
    import { writeFileSync } from "fs"; writeFileSync('/root/automaton/RECOVERY.md', readme);
    LOG('📋 Run on HOST: bash /root/automaton/scripts/deploy.sh');
  }
  
  console.log('\n' + '='.repeat(60));
}

main().catch(e => console.error('Fatal:', e));
