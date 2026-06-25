#!/usr/bin/env node
/**
 * One-shot: verify everything is ready for launch
 * Run this to get a complete status report
 */
const routes = [
  '/', '/api-docs', '/blog', '/demo', '/upgrade', '/tools',
  '/api/free/review', '/api/free/security', '/api/free/analyze',
  '/api/stats/overview'
];

async function check() {
  console.log('\n🔍 LAUNCH READINESS CHECK');
  console.log('═══════════════════════════\n');
  
  let ok = 0, fail = 0;
  for (const r of routes) {
    try {
      const resp = await fetch(`http://localhost:8080${r}`, { signal: AbortSignal.timeout(3000) });
      console.log(`  ${resp.ok ? '✅' : '⚠️'} ${r} → ${resp.status}`);
      if (resp.ok) ok++;
      else fail++;
    } catch(e) {
      console.log(`  ❌ ${r} → ${e.message}`);
      fail++;
    }
  }
  
  console.log(`\n📊 ${ok}/${routes.length} routes OK`);
  
  // Check API keys
  try {
    const keys = JSON.parse(require('fs').readFileSync('/root/automaton/api-keys.json','utf-8'));
    console.log(`📋 API Keys: ${Object.keys(keys).length}`);
  } catch {}
  
  // Check blog count
  try {
    const blogFiles = require('fs').readdirSync('/root/automaton/content/blog').filter(f => f.endsWith('.html'));
    console.log(`📝 Blog posts: ${blogFiles.length}`);
  } catch {}
  
  console.log('\n✅ Readiness check complete');
}

check().catch(console.error);
