#!/usr/bin/env node
/**
 * gateway-activator.mjs — Self-contained gateway deployment validator
 * 
 * This script:
 * 1. Checks if the live gateway (port 8080) serves API endpoints
 * 2. Tests each API endpoint for correct responses
 * 3. Generates a detailed status report
 * 4. If endpoints are missing, generates the fix instructions
 * 
 * Run: node /root/automaton/scripts/gateway-activator.mjs
 */

const BASE = 'http://127.0.0.1:8080';
const GATEWAY_FILE = '/root/automaton/gateway.cjs';

const ENDPOINTS = [
  { path: '/', name: 'Homepage', okCode: 200 },
  { path: '/health', name: 'Health Endpoint', okCode: 200 },
  { path: '/get-started.html', name: 'Get Started Page', okCode: 200 },
  { path: '/api-docs.html', name: 'API Docs', okCode: 200 },
  { path: '/api-playground.html', name: 'Playground', okCode: 200 },
  { path: '/api/stats/overview', name: 'Stats Overview', okCode: 200 },
  { path: '/free/review', name: 'FREE: Code Review', okCode: 200, method: 'POST', body: { code: 'test', language: 'javascript' } },
  { path: '/free/analyze', name: 'FREE: Text Analysis', okCode: 200, method: 'POST', body: { text: 'test', mode: 'analyze' } },
  { path: '/free/security', name: 'FREE: Security Scan', okCode: 200, method: 'POST', body: { code: 'test', language: 'javascript' } },
  { path: '/free/summarize', name: 'FREE: Summarize', okCode: 200, method: 'POST', body: { text: 'test', max_length: 50 } },
  { path: '/free/explain', name: 'FREE: Code Explain', okCode: 200, method: 'POST', body: { code: 'test', language: 'javascript' } },
  { path: '/free/refactor', name: 'FREE: Refactor', okCode: 200, method: 'POST', body: { code: 'test', language: 'javascript' } },
  { path: '/free/complexity', name: 'FREE: Complexity', okCode: 200, method: 'POST', body: { code: 'test', language: 'javascript' } },
  { path: '/v1/review', name: 'PAID: Code Review', okCode: 402, method: 'POST', body: { code: 'test', language: 'javascript' } },
  { path: '/v1/analyze', name: 'PAID: Text Analysis', okCode: 402, method: 'POST', body: { text: 'test', mode: 'analyze' } },
  { path: '/v1/security', name: 'PAID: Security', okCode: 402, method: 'POST', body: { code: 'test', language: 'javascript' } },
  { path: '/api/sitemap.xml', name: 'Sitemap', okCode: 200 },
  { path: '/api/badge/quality/A', name: 'Badge Endpoint', okCode: 200 },
];

function color(s, c) { return s; } // no color in terminal output

async function testEndpoint(ep) {
  try {
    const opts = {
      method: ep.method || 'GET',
      signal: AbortSignal.timeout(8000)
    };
    if (ep.body) {
      opts.headers = { 'Content-Type': 'application/json' };
      opts.body = JSON.stringify(ep.body);
    }
    const resp = await fetch(BASE + ep.path, opts);
    const pass = resp.status === ep.okCode;
    const statusStr = `${resp.status} (expected ${ep.okCode})`;
    return { ...ep, status: resp.status, pass, statusStr };
  } catch (e) {
    return { ...ep, status: 0, pass: false, statusStr: `ERROR: ${e.message}` };
  }
}

async function checkGatewayFile() {
  const fs = require('fs');
  if (!fs.existsSync(GATEWAY_FILE)) return { exists: false, size: 0, apiCount: 0 };
  const content = fs.readFileSync(GATEWAY_FILE, 'utf-8');
  const apiCount = (content.match(/\/v1\//g) || []).length + (content.match(/\/free\//g) || []).length;
  return { exists: true, size: content.length, apiCount };
}

async function main() {
  console.log('=== Gateway Activator ===\n');
  
  // Check gateway file
  const gw = await checkGatewayFile();
  console.log(`Gateway file: ${gw.exists ? `✅ ${gw.size} bytes, ${gw.apiCount} API routes` : '❌ NOT FOUND'}`);
  
  // Test health first
  try {
    const healthResp = await fetch(BASE + '/health', { signal: AbortSignal.timeout(5000) });
    const health = healthResp.ok ? await healthResp.json() : {};
    console.log(`Gateway running: ✅ (uptime: ${Math.floor((health.uptime||0)/3600)}h)`);
  } catch (e) {
    console.log(`Gateway running: ❌ (${e.message})`);
    console.log('\n❌ Gateway is DOWN. Start it first.');
    process.exit(1);
  }
  
  // Test all endpoints
  console.log('\nTesting endpoints...\n');
  let passed = 0, failed = 0;
  const results = [];
  
  for (const ep of ENDPOINTS) {
    const r = await testEndpoint(ep);
    results.push(r);
    if (r.pass) { passed++; console.log(`  ✅ ${r.name}`); }
    else { failed++; console.log(`  ❌ ${r.name} — got ${r.statusStr}`); }
  }
  
  console.log(`\n${passed}/${passed+failed} endpoints OK`);
  
  // Summary & action
  const freeEndpoints = results.filter(r => r.path.startsWith('/free/'));
  const freeFailed = freeEndpoints.filter(r => !r.pass);
  const paidEndpoints = results.filter(r => r.path.startsWith('/v1/'));
  const paidFailed = paidEndpoints.filter(r => !r.pass);
  
  if (freeFailed.length > 0 || paidFailed.length > 0) {
    console.log('\n❌ INACTIVE GATEWAY: Free/Paid endpoints are not working on live.');
    console.log('   The gateway.cjs has the routes, but needs a HOST restart.');
    console.log('\n   Fix: SSH into HOST and run:');
    console.log('   sudo systemctl restart automaton-gateway');
    console.log('\n   Or if systemctl is available on HOST:');
    console.log('   ssh <host> "sudo systemctl restart automaton-gateway"');
  } else {
    console.log('\n✅ All endpoints active! Revenue-ready.');
  }
  
  // Save report
  const fs = require('fs');
  const report = {
    timestamp: new Date().toISOString(),
    gatewayFile: gw,
    total: passed + failed,
    passed,
    failed,
    endpoints: results.map(r => ({ name: r.name, path: r.path, status: r.status, pass: r.pass }))
  };
  fs.writeFileSync('/root/automaton/data/gateway-status.json', JSON.stringify(report, null, 2));
  console.log('\nReport saved to /root/automaton/data/gateway-status.json');
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
