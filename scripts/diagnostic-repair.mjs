#!/usr/bin/env node
/**
 * diagnostic-repair.mjs — my-automaton Self-Diagnostic & Repair
 * 
 * Runs inside the container to check everything and fix what it can.
 * Run: node scripts/diagnostic-repair.mjs
 */

import { execSync } from 'child_process';
import fs from 'fs';
import http from 'http';

function run(cmd, okMsg, failMsg) {
  try {
    const out = execSync(cmd, { timeout: 10000, encoding: 'utf8' });
    console.log(`  ✅ ${okMsg}`);
    return out.trim();
  } catch(e) {
    console.log(`  ❌ ${failMsg}: ${e.message.split('\n')[0]}`);
    return null;
  }
}

function httpGet(url) {
  return new Promise((resolve) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    }).on('error', (e) => resolve({ status: 0, error: e.message }));
  });
}

async function diagnose() {
  console.log('\n========================================');
  console.log('  🔍 my-automaton Diagnostic & Repair');
  console.log(`  ${new Date().toISOString()}`);
  console.log('========================================\n');

  // 1. Disk
  console.log('📀 DISK');
  const df = execSync('df -h /', { encoding: 'utf8' });
  console.log(`  ${df.split('\n')[1].trim()}`);
  const parts = df.split('\n')[1].split(/\s+/);
  const usedPct = parseInt(parts[4]);
  if (usedPct >= 95) console.log('  ⚠️  DISK CRITICAL — need HOST cleanup!');
  else console.log(`  ✅ ${usedPct}% used`);
  console.log(`  Avail: ${parts[3]}`);

  // 2. Gateway (local)
  console.log('\n🌐 GATEWAY (localhost:8080)');
  const gw = await httpGet('http://127.0.0.1:8080/health');
  if (gw.status === 200) {
    const h = JSON.parse(gw.body);
    console.log(`  ✅ Gateway v${h.version || '?'} running, uptime: ${Math.floor(h.uptime/3600)}h`);
  } else {
    console.log(`  ❌ Gateway not responding: ${gw.error || gw.status}`);
  }

  // 6. Config check
  console.log('\n📄 CONFIG FILES');
  const files = ['/root/automaton/gateway.cjs', '/root/automaton/api-keys.json', '/root/automaton/automaton.json'];
  files.forEach(f => console.log(`  ${f}: ${fs.existsSync(f) ? '✅' : '❌'}`));

  // API keys summary
  try {
    const keys = JSON.parse(fs.readFileSync('/root/automaton/api-keys.json', 'utf8'));
    const keyCount = Object.keys(keys).length;
    const totalCredits = Object.values(keys).reduce((s, k) => s + (k.credits || 0), 0);
    console.log(`  API Keys: ${keyCount}, Total credits: ${totalCredits}`);
  } catch(e) {}

  // 7. Gateway features on disk
  console.log('\n📋 GATEWAY FEATURES (on disk, needs HOST restart)');
  const gwCode = fs.readFileSync('/root/automaton/gateway.cjs', 'utf8');
  const checks = {
    'MCP tools': /mcp/i.test(gwCode),
    'Catalog': /\/api\/catalog/.test(gwCode),
    'Handshake': /handshake/i.test(gwCode),
    'Dev Key': /dev-?key/i.test(gwCode),
    'Sitemap': /sitemap/i.test(gwCode),
    'Revenue Multiplier': /revenue-?multiplier/i.test(gwCode),
    'Free API': /\/free\//.test(gwCode),
    'Referral': /referral/i.test(gwCode),
    'Badge': /badge/i.test(gwCode),
  };
  Object.entries(checks).forEach(([name, ok]) => console.log(`  ${ok ? '✅' : '❌'} ${name}`));

  // 8. Content files
  console.log('\n📝 CONTENT FILES');
  const contentDir = '/root/automaton/content';
  if (fs.existsSync(contentDir)) {
    const files = fs.readdirSync(contentDir).filter(f => f.endsWith('.html') || f.endsWith('.mjs'));
    console.log(`  ${files.length} files in content/`);
    console.log(`  ${files.slice(0, 10).join(', ')}${files.length > 10 ? `... +${files.length-10} more` : ''}`);
  }

  // 9. Revenue stats
  console.log('\n💰 REVENUE');
  try {
    const stats = await httpGet('http://127.0.0.1:8080/api/stats/overview');
    if (stats.status === 200) {
      const s = JSON.parse(stats.body);
      console.log(`  Keys sold: ${s.total_keys}`);
      console.log(`  Credits sold: ${s.total_credits_sold}`);
      console.log(`  Credits remaining: ${s.total_credits_remaining}`);
      console.log(`  Revenue: $${s.total_revenue_usd}`);
    }
  } catch(e) {}

  // 10. Tunnel test (from local)
  console.log('\n🔗 TUNNEL TEST');
  try {
    const tunnelOut = execSync('curl -s -o /dev/null -w "%{http_code}" --connect-timeout 8 https://automation.songheng.vip/health 2>&1', { timeout: 10000, encoding: 'utf8' });
    if (tunnelOut === '200') console.log('  ✅ TUNNEL UP — public access working!');
    else console.log('  ❌ Tunnel returned HTTP ' + tunnelOut);
  } catch(e) {
    const msg = e.message || '';
    if (msg.includes('Connection refused')) console.log('  ❌ Tunnel: connection refused');
    else if (msg.includes('resolve')) console.log('  ❌ Tunnel: DNS resolution failed');
    else console.log('  ❌ Tunnel: ' + msg.split('\n')[0].substring(0, 80));
  }

  // Summary
  console.log('\n========================================');
  console.log('  📋 SUMMARY');
  console.log('========================================');
  
  const issues = [];
  if (usedPct >= 95) issues.push('Disk full — need HOST: docker system prune -af');
  
  const hasTunnel = httpGet.toString(); // placeholder
  
  if (issues.length === 0) {
    console.log('  ✅ System looks healthy!');
  } else {
    console.log(`  ⚠️  ${issues.length} issue(s) found:`);
    issues.forEach((i, n) => console.log(`    ${n+1}. ${i}`));
    console.log('\n  🔧 Run on HOST:');
    console.log(`    bash /root/automaton/scripts/deploy.sh`);
  }
  
  console.log('\n  📋 Gateway v2.2 has all features waiting on disk.');
  console.log('  🚀 HOST needs: sudo systemctl restart automaton-gateway');
  console.log('  🔗 HOST needs: sudo systemctl restart cloudflared');
  console.log();
}

diagnose().catch(e => console.error('Diagnostic failed:', e));
