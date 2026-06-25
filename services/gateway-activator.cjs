#!/usr/bin/env node
/**
 * gateway-activator.cjs — One-shot gateway health check + deployment validator
 * Run from container to test ALL gateway endpoints and report status.
 * 
 * Usage: node services/gateway-activator.cjs
 */

const http = require('http');
const https = require('https');

const LOCAL = 'http://127.0.0.1:8080';
const DOMAIN = 'https://automation.songheng.vip';
const VPS_IP = 'http://automation.songheng.vip:8080';

const TESTS = [
  // Static content
  { name: 'Homepage', method: 'GET', url: '/', expect: 200 },
  { name: 'API Docs', method: 'GET', url: '/api-docs.html', expect: 200 },
  { name: 'Playground', method: 'GET', url: '/api-playground.html', expect: 200 },
  { name: 'Upgrade/Pricing', method: 'GET', url: '/upgrade.html', expect: 200 },
  { name: 'Dashboard', method: 'GET', url: '/dashboard.html', expect: 200 },
  { name: 'Blog', method: 'GET', url: '/blog.html', expect: 200 },
  
  // API endpoints
  { name: 'Health', method: 'GET', url: '/health', expect: 200 },
  { name: 'Stats', method: 'GET', url: '/api/stats/overview', expect: 200 },
  { name: 'Sitemap', method: 'GET', url: '/sitemap.xml', expect: 200 },
  { name: 'Robots', method: 'GET', url: '/robots.txt', expect: 200 },
  
  // Free API (will get 400 from missing body, not 404)
  { name: 'Free Analyze', method: 'POST', url: '/free/analyze', expect: [400, 429, 200] },
  { name: 'Free Review', method: 'POST', url: '/free/review', expect: [400, 429, 200] },
  { name: 'Free Security', method: 'POST', url: '/free/security', expect: [400, 429, 200] },
  
  // Premium API (will get 401 from missing key)
  { name: 'V1 Analyze', method: 'POST', url: '/v1/analyze', expect: [401, 402] },
  { name: 'V1 Review', method: 'POST', url: '/v1/review', expect: [401, 402] },
  { name: 'V1 Security', method: 'POST', url: '/v1/security', expect: [401, 402] },
  
  // Badge system
  { name: 'Badge API', method: 'GET', url: '/api/badge/quality/A', expect: [200, 404] },
];

function fetchUrl(endpoint, method, base = LOCAL) {
  return new Promise((resolve) => {
    const url = `${base}${endpoint}`;
    const client = url.startsWith('https') ? https : http;
    
    const req = client.request(url, { method, timeout: 5000 }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data.substring(0, 200) }));
    });
    req.on('error', (e) => resolve({ status: 0, error: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 0, error: 'timeout' }); });
    if (method === 'POST') req.write('{}');
    req.end();
  });
}

function statusIcon(status, expected) {
  const ex = Array.isArray(expected) ? expected : [expected];
  if (status === 0) return '❌';
  return ex.includes(status) ? '✅' : '⚠️';
}

async function runTests(base, label) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  Testing: ${label}`);
  console.log(`  Base URL: ${base}`);
  console.log(`${'='.repeat(60)}`);
  
  let passed = 0;
  let failed = 0;
  
  for (const test of TESTS) {
    const result = await fetchUrl(test.url, test.method, base);
    const icon = statusIcon(result.status, test.expect);
    const statusStr = result.status === 0 ? `ERR: ${result.error}` : `HTTP ${result.status}`;
    const expectStr = Array.isArray(test.expect) ? test.expect.join('/') : `=${test.expect}`;
    
    if (icon === '✅') passed++;
    else failed++;
    
    const statusMsg = icon === '✅' ? '' : ` (expected ${expectStr})`;
    console.log(`  ${icon} ${test.name}: ${statusStr}${statusMsg}`);
  }
  
  const total = TESTS.length;
  console.log(`\n  Result: ${passed}/${total} passed, ${failed}/${total} failed`);
  return { passed, failed, total };
}

async function checkTunnel() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  Cloudflare Tunnel Check`);
  console.log(`${'='.repeat(60)}`);
  
  const result = await fetchUrl('/', 'GET', DOMAIN);
  if (result.status === 200) {
    console.log(`  ✅ Cloudflare tunnel: WORKING (HTTP ${result.status})`);
    console.log(`  🌐 ${DOMAIN} is accessible`);
    return true;
  } else if (result.status === 530) {
    console.log(`  ❌ Cloudflare tunnel: BROKEN (HTTP ${result.status})`);
    console.log(`  🔧 Fix: sudo systemctl restart cloudflared`);
    console.log(`  🌐 ${DOMAIN} returns 530 - origin unreachable`);
    return false;
  } else {
    console.log(`  ⚠️  Cloudflare tunnel: UNKNOWN (HTTP ${result.status})`);
    return false;
  }
}

function printSummary(local, tunnel, vps) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  📋 DEPLOYMENT SUMMARY`);
  console.log(`${'='.repeat(60)}`);
  console.log(`  Localhost (127.0.0.1:8080): ${local.passed}/${local.total} endpoints OK`);
  console.log(`  Cloudflare (${DOMAIN}):     ${tunnel ? 'WORKING' : 'BROKEN (530)'}`);
  
  console.log(`\n  🚨 ACTIONS NEEDED:`);
  if (!tunnel) {
    console.log(`  1. [HOST] sudo systemctl restart automaton-gateway`);
    console.log(`  2. [HOST] sudo systemctl restart cloudflared`);
    console.log(`  3. [HOST] node /root/automaton/services/webhook-service.cjs &`);
  }
  
  if (local.passed === local.total && tunnel) {
    console.log(`  ✅ ALL SYSTEMS GO — site is live and generating revenue`);
  }
  console.log(`\n  🔑 Stripe: ${process.env.STRIPE_SK ? 'CONFIGURED' : 'NOT SET'}`);
  console.log(`  🔑 DeepSeek: ${process.env.DEEPSEEK_API_KEY ? 'CONFIGURED' : 'NOT SET'}`);
  console.log(`\n  💰 Revenue: $0 — waiting for first user`);
}

async function main() {
  console.log(`\n🚀 my-automaton Gateway Activator v1.0`);
  console.log(`   ${new Date().toISOString()}`);
  
  // Test local gateway
  const local = await runTests(LOCAL, 'LOCAL GATEWAY (127.0.0.1:8080)');
  
  // Test cloudflare tunnel
  const tunnel = await checkTunnel();
  
  // Test VPS IP directly
  const vps = await runTests(VPS_IP, 'VPS DIRECT (automation.songheng.vip:8080)');
  
  // Summary
  printSummary(local, tunnel, vps);
  
  process.exit(local.failed > 10 ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
