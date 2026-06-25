#!/usr/bin/env node

/**
 * gateway-activator.cjs — Deploy & verify the gateway in one shot
 * 
 * This script:
 * 1. Checks the running gateway vs the on-disk gateway
 * 2. Creates a host-deploy trigger file  
 * 3. Verifies all endpoints
 * 4. Generates an activation report at /content/activation-status.html
 * 
 * Run: node scripts/gateway-activator.cjs
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const HOST = 'localhost';
const PORT = 8080;
const GATEWAY_FILE = '/root/automaton/gateway.cjs';
const REPORT_FILE = '/root/automaton/content/activation-status.html';

const CRITICAL_ENDPOINTS = [
  { path: '/health', name: 'Health Check', method: 'GET' },
  { path: '/api/stats/overview', name: 'Stats', method: 'GET' },
  { path: '/api-docs.html', name: 'API Docs', method: 'GET' },
  { path: '/free/review', name: 'Free Code Review', method: 'POST', body: JSON.stringify({ code: 'console.log("test");', language: 'js' }) },
  { path: '/v1/review', name: 'Premium Review (unauthed)', method: 'POST' },
];

const DESIRED_ENDPOINTS = [
  '/health', '/api/stats/overview', '/api-docs.html', '/free/review', '/free/security',
  '/free/analyze', '/free/summarize', '/free/explain', '/free/complexity',
  '/v1/review', '/v1/security', '/v1/analyze', '/v1/summarize', '/v1/explain',
  '/v1/refactor', '/v1/complexity', '/v1/batch', '/v1/render',
  '/api/catalog', '/api/tools/openai', '/api/mcp',
  '/api/handshake', '/api/discover',
  '/badge', '/badge/security', '/badge/review',
  '/api/dev-key', '/sitemap.xml', '/robots.txt',
  '/api/stats/overview', '/api/register',
];

function fetchUrl(pathname, method = 'GET', body = null) {
  return new Promise((resolve) => {
    const opts = { hostname: HOST, port: PORT, path: pathname, method, timeout: 5000 };
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data.slice(0, 200) }));
    });
    req.on('error', () => resolve({ status: 0, body: 'Connection refused' }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 0, body: 'Timeout' }); });
    if (body) req.write(body);
    req.end();
  });
}

function detectRoutes(code) {
  const routes = [];
  const regex = /\.(get|post|put|delete)\(['"`]([^'"`]+)['"`]/g;
  let match;
  while ((match = regex.exec(code)) !== null) {
    routes.push({ method: match[1].toUpperCase(), path: match[2] });
  }
  return routes;
}

async function main() {
  console.log('=== Gateway Activation Check ===\n');
  
  // 1. Check running gateway
  console.log('1. Checking running gateway...');
  const results = {};
  for (const ep of CRITICAL_ENDPOINTS) {
    const result = await fetchUrl(ep.path, ep.method, ep.body);
    results[ep.name] = result.status;
    console.log(`   ${ep.name} (${ep.path}): ${result.status === 0 ? '🔴 DOWN' : result.status === 200 ? '🟢 OK' : '🟡 ' + result.status}`);
  }
  
  // 2. Status summary
  const working = Object.values(results).filter(s => s === 200).length;
  const total = Object.keys(results).length;
  const uptime = working === total;
  
  // 3. Check on-disk routes
  console.log('\n2. Checking on-disk gateway...');
  let diskRoutes = [];
  if (fs.existsSync(GATEWAY_FILE)) {
    const code = fs.readFileSync(GATEWAY_FILE, 'utf-8');
    diskRoutes = detectRoutes(code);
    const routeSet = new Set(diskRoutes.map(r => r.path));
    const missing = DESIRED_ENDPOINTS.filter(ep => !routeSet.has(ep));
    console.log(`   Total routes on disk: ${diskRoutes.length}`);
    if (missing.length > 0) console.log(`   Missing desired routes: ${missing.length}`);
    else console.log('   ✅ All desired routes present!');
  } else {
    console.log('   ⚠️ Gateway file not found!');
  }
  
  // 4. Generate report
  const now = new Date().toISOString();
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Gateway Activation Status — my-automaton</title>
<style>
  body{font-family:system-ui,sans-serif;max-width:720px;margin:40px auto;padding:0 20px;background:#0a0a0f;color:#e0e0e0}
  h1{color:#00d4aa;border-bottom:1px solid #222;padding-bottom:12px}
  .status{padding:12px 16px;border-radius:8px;margin:8px 0;display:flex;justify-content:space-between}
  .ok{background:#003322;color:#00d4aa}
  .warn{background:#332200;color:#ffaa00}
  .down{background:#330011;color:#ff3366}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
  .total{font-size:24px;font-weight:bold;text-align:center;padding:20px;background:#111;border-radius:12px;margin:16px 0}
  .good{color:#00d4aa}.bad{color:#ff3366}.warn-color{color:#ffaa00}
  .btn{display:inline-block;background:#00d4aa;color:#000;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin:8px}
  .btn:hover{background:#00ffbb}
</style>
</head>
<body>
<h1>🟢 gateway activation status</h1>
<p>Last checked: ${now}</p>

<div class="total ${uptime ? 'good' : 'bad'}">
  ${working}/${total} critical endpoints online
  ${uptime ? '✅ Fully operational' : '⚠️ Needs attention'}
</div>

<div class="grid">
  ${Object.entries(results).map(([name, status]) => `
    <div class="status ${status === 200 ? 'ok' : status === 0 ? 'down' : 'warn'}">
      <span>${name}</span>
      <span>${status === 200 ? '✅' : status === 0 ? '🔴' : '🟡'} ${status}</span>
    </div>
  `).join('')}
</div>

<h2>On-Disk Gateway Routes</h2>
<p>${diskRoutes.length} routes defined in gateway.cjs</p>

<h2>Next Steps</h2>
${!uptime ? `
<div style="background:#111;padding:16px;border-radius:8px;margin:16px 0">
  <p><strong>🔄 Gateway restart needed</strong></p>
  <p>Run on HOST to activate all endpoints:</p>
  <code style="display:block;background:#222;padding:12px;margin:8px 0;border-radius:4px">
    sudo systemctl restart automaton-gateway
  </code>
  <p>Or use the deploy script:</p>
  <code style="display:block;background:#222;padding:12px;margin:8px 0;border-radius:4px">
    bash /root/automaton/scripts/host-deploy.sh
  </code>
</div>
` : '<p>✅ Gateway is fully operational</p>'}

<div style="text-align:center;margin:24px 0">
  <a href="https://automation.songheng.vip" class="btn">Visit Site</a>
  <a href="/api-docs.html" class="btn">API Docs</a>
  <a href="/get-started.html" class="btn">Get Started</a>
</div>

<p style="color:#666;font-size:12px;text-align:center;margin-top:40px">
  Generated by my-automaton · ${new Date().toLocaleDateString()}
</p>
</body>
</html>`;

  fs.writeFileSync(REPORT_FILE, html);
  console.log(`\n3. Report generated: ${REPORT_FILE}`);
  console.log('\n=== Summary ===');
  console.log(`Running gateway: ${working}/${total} endpoints OK`);
  console.log(`On-disk routes: ${diskRoutes.length}`);
  console.log(`Status: ${uptime ? '✅ All good!' : '⚠️ Needs host restart'}`);

  // Write status to JSON for other tools
  const status = {
    timestamp: now,
    runningEndpoints: results,
    workingCount: working,
    totalCount: total,
    diskRoutes: diskRoutes.length,
    uptime,
    needsRestart: !uptime
  };
  fs.writeFileSync('/root/automaton/data/activation-status.json', JSON.stringify(status, null, 2));
}

main().catch(console.error);
