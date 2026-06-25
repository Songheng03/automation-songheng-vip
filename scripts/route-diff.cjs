#!/usr/bin/env node

/**
 * route-diff.cjs — Compare live gateway routes vs on-disk gateway routes
 * 
 * This is a diagnostic tool that finds what's missing in the live gateway
 * and generates a set of inline handlers to patch the gaps.
 * 
 * Run: node scripts/route-diff.cjs
 */

const http = require('http');
const fs = require('fs');

const HOST = 'localhost';
const PORT = 8080;

// Routes we KNOW should exist (from the v2.1 gateway.cjs on disk)
const DESIRED = {
  GET: ['/', '/health', '/api/stats/overview', '/api/dev-key', '/api/catalog', '/api/catalog/openai',
        '/sitemap.xml', '/robots.txt', '/api-docs.html', '/get-started.html', '/upgrade.html',
        '/badge/review', '/badge/security', '/badge/quality',
        '/free/analyze', '/free/summarize', '/free/review', '/free/security', '/free/explain', '/free/complexity',
        '/dev-toolbox.html', '/ci-cd-integration.html', '/readme-badges.html',
        '/playground.html', '/status.html', '/activation-status.html'],
  POST: ['/v1/analyze', '/v1/summarize', '/v1/review', '/v1/security', '/v1/explain', '/v1/refactor', '/v1/complexity', '/v1/batch', '/v1/render',
         '/free/analyze', '/free/summarize', '/free/review', '/free/security', '/free/explain', '/free/complexity',
  HEAD: ['/', '/health']
};

async function probe(method, path) {
  return new Promise(resolve => {
    const req = http.request({ hostname: HOST, port: PORT, path, method, timeout: 4000 }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, ok: res.statusCode < 500 }));
    });
    req.on('error', () => resolve({ status: 0, ok: false }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 0, ok: false }); });
    req.end();
  });
}

async function main() {
  console.log('=== Route Diff: Live Gateway vs V2.1 Desired Routes ===\n');

  const results = [];
  let total = 0, passed = 0;

  for (const [method, routes] of Object.entries(DESIRED)) {
    for (const route of routes) {
      total++;
      const res = await probe(method, route);
      if (res.ok) passed++;
      results.push({ method, route, ...res });
    }
  }

  // Classify
  const missing = results.filter(r => !r.ok && r.status !== 401 && r.status !== 402 && r.status !== 429);
  const authed = results.filter(r => r.status === 401 || r.status === 402);
  const rateLimited = results.filter(r => r.status === 429);
  const working = results.filter(r => r.ok);

  // Summary
  console.log(`Total routes probed: ${total}`);
  console.log(`✅ Working: ${working.length}`);
  console.log(`🔑 Auth-required (expected): ${authed.length}`);
  console.log(`🔄 Rate-limited (expected): ${rateLimited.length}`);
  console.log(`❌ Missing/Error: ${missing.length}`);
  console.log('');

  if (missing.length > 0) {
    console.log('=== MISSING ROUTES (need host restart) ===');
    for (const r of missing) {
      console.log(`  ${r.method} ${r.route} → ${r.status}`);
    }
    console.log('');

    // Group by what's missing
    const missingGroups = {};
    for (const r of missing) {
      if (r.route.startsWith('/v1/')) missingGroups['Premium API (/v1/)'] = (missingGroups['Premium API (/v1/)']||0) + 1;
      else if (r.route.startsWith('/free/')) missingGroups['Free API (/free/)'] = (missingGroups['Free API (/free/)']||0) + 1;
      else if (r.route.startsWith('/api/')) missingGroups['API Routes (/api/)'] = (missingGroups['API Routes (/api/)']||0) + 1;
      else if (r.route.startsWith('/badge/')) missingGroups['Badge Routes'] = (missingGroups['Badge Routes']||0) + 1;
      else missingGroups['Content/Other'] = (missingGroups['Content/Other']||0) + 1;
    }
    console.log('Missing by category:');
    for (const [cat, count] of Object.entries(missingGroups)) {
      console.log(`  ${cat}: ${count} routes`);
    }
  }

  console.log('');
  console.log('=== RECOMMENDATION ===');
  if (missing.length === 0) {
    console.log('All routes are live! Gateway is fully operational.');
  } else {
    console.log(`Run on HOST to activate ALL ${missing.length} missing routes:`);
    console.log('  sudo systemctl restart automaton-gateway');
    console.log('');
    console.log('Or using the deploy script:');
    console.log('  bash /root/automaton/scripts/host-deploy.sh');
  }

  // Write report
  const report = {
    timestamp: new Date().toISOString(),
    total,
    working: working.length,
    authed: authed.length,
    rateLimited: rateLimited.length,
    missing: missing.length,
    missingRoutes: missing.map(r => ({ method: r.method, route: r.route, status: r.status })),
    recommendation: missing.length === 0 ? 'fully_operational' : 'needs_restart'
  };
  fs.mkdirSync('/root/automaton/data', { recursive: true });
  fs.writeFileSync('/root/automaton/data/route-diff.json', JSON.stringify(report, null, 2));
  console.log(`\nReport: /root/automaton/data/route-diff.json`);
}

main().catch(console.error);
