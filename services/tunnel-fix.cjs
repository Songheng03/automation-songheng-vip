#!/usr/bin/env node
/**
 * tunnel-fix.cjs — Diagnose and report Cloudflare Tunnel + Gateway issues
 * 
 * Run: node /root/automaton/services/tunnel-fix.cjs
 * 
 * The 530 errors from Cloudflare mean the tunnel can reach us but
 * something is wrong with the response. This checks everything.
 */

const http = require('http');

const LOCAL = 'http://127.0.0.1:8080';
const PUBLIC = 'https://automation.songheng.vip';
const IP = 'http://automation.songheng.vip:8080';

async function check(url, name) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    const text = await res.text();
    return { status: res.status, ok: res.ok, size: text.length, snippet: text.substring(0, 100) };
  } catch (e) {
    return { status: 'ERR', error: e.message };
  }
}

async function main() {
  console.log('=== TUNNEL & GATEWAY DIAGNOSTIC ===\n');
  
  // 1. Local gateway health
  console.log('1. LOCAL GATEWAY (127.0.0.1:8080)');
  const local = await check(LOCAL + '/health', 'Local');
  console.log(`   /health → ${local.status} (${local.size} bytes)`);
  if (local.snippet) console.log(`   Response: ${local.snippet.substring(0, 80)}`);
  
  const localRoot = await check(LOCAL + '/', 'Local Root');
  console.log(`   / → ${localRoot.status} (${localRoot.size} bytes)`);
  
  const localDevKey = await check(LOCAL + '/api/dev-key', 'Dev Key');
  console.log(`   /api/dev-key → ${localDevKey.status}`);
  
  // 2. Direct IP (bypasses tunnel)
  console.log('\n2. DIRECT IP (automation.songheng.vip:8080)');
  const ipHealth = await check(IP + '/health', 'IP');
  console.log(`   /health → ${ipHealth.status}`);
  
  const ipRoot = await check(IP + '/', 'IP Root');
  console.log(`   / → ${ipRoot.status}`);
  
  // 3. Public domain (through Cloudflare Tunnel)
  console.log('\n3. PUBLIC DOMAIN (via Cloudflare Tunnel)');
  const pubHealth = await check(PUBLIC + '/health', 'Public');
  console.log(`   /health → ${pubHealth.status}`);
  if (pubHealth.error) console.log(`   Error: ${pubHealth.error}`);
  if (pubHealth.snippet) console.log(`   Response: ${pubHealth.snippet.substring(0, 80)}`);
  
  const pubRoot = await check(PUBLIC + '/', 'Public Root');
  console.log(`   / → ${pubRoot.status}`);
  if (pubRoot.error) console.log(`   Error: ${pubRoot.error}`);
  
  // 4. Check if cloudflared is running on host
  console.log('\n4. TUNNEL STATUS');
  console.log('   Cannot check cloudflared from inside container');
  console.log('   On HOST, run: systemctl status cloudflared');
  
  // 5. Diagnosis
  console.log('\n5. DIAGNOSIS');
  
  if (local.status === 200) {
    console.log('   ✅ Local gateway is RUNNING and HEALTHY');
  } else {
    console.log('   ❌ Local gateway is NOT responding on port 8080');
    console.log('   Fix: sudo systemctl restart automaton-gateway');
    process.exit(1);
  }
  
  if (ipHealth.status === 200) {
    console.log('   ✅ Direct IP access works');
  } else {
    console.log('   ⚠️  Direct IP access failed (may be blocked by iptables)');
  }
  
  if (pubHealth.status === 200) {
    console.log('   ✅ Public domain works through Cloudflare Tunnel');
  } else if (pubHealth.status === 530) {
    console.log('   ❌ Cloudflare Tunnel returns 530');
    console.log('   This means cloudflared is running but something is wrong:');
    console.log('   • The tunnel may be pointing to wrong port');
    console.log('   • The gateway may be returning errors for some routes');
    console.log('   • Cloudflare may be blocking the request');
    console.log('');
    console.log('   On HOST, run:');
    console.log('   • cloudflared tunnel info automation-chaosong-dpdns-org');
    console.log('   • journalctl -u cloudflared -n 50 --no-pager');
    console.log('   • Check tunnel config: cat ~/.cloudflared/config.yml');
  } else {
    console.log(`   ⚠️  Public domain returned ${pubHealth.status}`);
  }
  
  // 6. Check what the gateway actually returns
  console.log('\n6. RAW GATEWAY RESPONSE');
  console.log('   Checking /health endpoint (key diagnostic)...');
  const diag = await check(LOCAL + '/health', 'Diagnostic');
  if (diag.snippet) {
    try {
      const parsed = JSON.parse(diag.snippet);
      console.log(`   deepseek: ${parsed.deepseek}`);
      console.log(`   api_keys: ${parsed.api_keys}, visits: ${parsed.visits}`);
    } catch {
      console.log(`   Raw: ${diag.snippet}`);
    }
  }
  
  console.log('\n=== DIAGNOSTIC COMPLETE ===');
}

main().catch(e => console.error('Error:', e.message));
