#!/usr/bin/env node
/* gateway-test.mjs — Full service health check, runs every heartbeat */

const BASE = 'http://localhost:8080';

async function check(path, label) {
  try {
    const r = await fetch(`${BASE}${path}`, { signal: AbortSignal.timeout(10000) });
    const ok = r.ok || r.status === 402 || r.status === 401;
    if (!ok) return { status: 'FAIL', code: r.status, label };
    const text = await r.text().catch(() => '');
    return { status: 'OK', code: r.status, label, size: text.length };
  } catch(e) {
    return { status: 'ERROR', error: e.message, label };
  }
}

async function testFreeEndpoint(service, code) {
  try {
    const r = await fetch(`${BASE}/api/free/${service}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, text: code }),
      signal: AbortSignal.timeout(15000)
    });
    const j = await r.json();
    if (j.success) return { status: 'OK', service, hasResult: !!j.result, remaining: j.remaining_free };
    return { status: j.error?.includes('limit') ? 'RATE_LIMIT' : 'FAIL', service, error: j.error };
  } catch(e) {
    return { status: 'ERROR', service, error: e.message };
  }
}

async function run() {
  const results = [];
  const start = Date.now();
  
  console.log(`=== Gateway Test ${new Date().toISOString()} ===\n`);
  
  // Basic routes
  const routes = [
    ['/health', 'Health endpoint'],
    ['/agent.json', 'Agent card'],
    ['/api/stats/overview', 'Stats API'],
    ['/upgrade', 'Pricing page'],
    ['/api-docs', 'API docs'],
    ['/robots.txt', 'Robots'],
    ['/sitemap.xml', 'Sitemap'],
  ];
  
  for (const [path, label] of routes) {
    const r = await check(path, label);
    results.push(r);
    console.log(`  ${r.status === 'OK' ? '✅' : '❌'} ${label} (${path}): ${r.status}${r.code ? ' ' + r.code : ''}${r.error ? ' - ' + r.error : ''}`);
  }
  
  // Try free endpoints (they may be rate-limited from test runs)
  console.log('\n--- Free API endpoints ---');
  const services = ['analyze', 'summarize', 'review', 'security', 'explain', 'refactor', 'complexity'];
  for (const svc of services) {
    const r = await testFreeEndpoint(svc, 'function test() { return 42; }');
    results.push(r);
    const icon = r.status === 'OK' ? '✅' : r.status === 'RATE_LIMIT' ? '⏳' : '❌';
    console.log(`  ${icon} /api/free/${svc}: ${r.status}${r.remaining !== undefined ? ` (${r.remaining} left today)` : ''}${r.error ? ' - ' + r.error : ''}`);
  }
  
  // Summary
  const ok = results.filter(r => r.status === 'OK' || r.status === 'RATE_LIMIT').length;
  const total = results.length;
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  
  console.log(`\n=== Results: ${ok}/${total} passed (${elapsed}s) ===`);
  
  // Exit with code for heartbeat monitoring
  process.exit(ok === total ? 0 : 1);
}

run().catch(e => { console.error('FATAL:', e); process.exit(1); });
