#!/usr/bin/env node
/**
 * system_health.mjs — Validate and report on all services
 * Run via: node system_health.mjs
 * 
 * Checks every service, reports status, writes health report.
 */

import http from 'http';
import fs from 'fs';

const SERVICES = [
  { name: 'Main Gateway', port: 8080, path: '/', expected: 200 },
  { name: 'x402 Revenue', port: 8888, path: '/', expected: 200 },
  { name: 'Promotion Hub', port: 3110, path: '/', expected: 200 },
  { name: 'Compat Layer', port: 4280, path: '/api/catalog', expected: 200 },
  { name: 'Agent Registry', port: 3099, path: '/', expected: 200 },
  { name: 'Handshake', port: 3120, path: '/api/handshake', expected: 200, method: 'POST', body: JSON.stringify({}) },
  { name: 'Referral', port: 3150, path: '/api/referral/register', expected: 200, method: 'POST', body: JSON.stringify({}) },
  { name: 'Revenue Dashboard', port: 3888, path: '/', expected: 200 },
  { name: 'Subscriptions', port: 4001, path: '/', expected: 200 },
];

function checkURL(service) {
  return new Promise((resolve) => {
    const opts = {
      hostname: 'localhost',
      port: service.port,
      path: service.path || '/',
      method: service.method || 'GET',
      timeout: 5000,
    };
    
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        const contentType = res.headers['content-type'] || '';
        const truncated = data.substring(0, 200);
        resolve({
          name: service.name,
          port: service.port,
          status: res.statusCode,
          expected: service.expected,
          healthy: res.statusCode === service.expected,
          contentType: contentType,
          preview: truncated,
        });
      });
    });
    req.on('error', (err) => {
      resolve({
        name: service.name,
        port: service.port,
        status: null,
        error: err.message,
        healthy: false,
      });
    });
    req.on('timeout', () => {
      req.destroy();
      resolve({
        name: service.name,
        port: service.port,
        status: null,
        error: 'TIMEOUT',
        healthy: false,
      });
    });
    if (service.body) req.write(service.body);
    req.end();
  });
}

function checkAIKey() {
  const key = process.env.OPENAI_API_KEY || process.env.CONWAY_API_KEY || '';
  return {
    name: 'AI API Key',
    present: key.length > 0,
    preview: key ? `${key.substring(0, 8)}...${key.substring(key.length - 4)}` : 'NONE',
    healthy: key.length > 0,
  };
}

async function runFullCheck() {
  console.log('='.repeat(60));
  console.log('  my-automaton · System Health Check');
  console.log(`  ${new Date().toISOString()}`);
  console.log('='.repeat(60));
  console.log('');
  
  // Check AI key
  const aiResult = checkAIKey();
  console.log(`[${aiResult.healthy ? '✓' : '✗'}] AI Key: ${aiResult.present ? aiResult.preview : 'MISSING'}`);
  
  // Check services in parallel
  const results = await Promise.all(SERVICES.map(svc => checkURL(svc)));
  
  for (const r of results) {
    const statusStr = r.status ? `HTTP ${r.status}` : `ERROR: ${r.error}`;
    console.log(`[${r.healthy ? '✓' : '✗'}] ${r.name} (:${r.port}): ${statusStr}`);
    if (r.status && r.status !== r.expected) {
      console.log(`       >>> Expected ${r.expected}, got ${r.status}`);
      console.log(`       >>> Type: ${r.contentType}`);
      console.log(`       >>> Preview: ${r.preview.substring(0, 100)}`);
    }
  }
  
  const healthyCount = results.filter(r => r.healthy).length;
  const totalCount = results.length;
  
  console.log('');
  console.log('='.repeat(60));
  console.log(`  HEALTH: ${healthyCount}/${totalCount} services healthy`);
  console.log(`  STATUS: ${healthyCount === totalCount ? '✓ ALL SYSTEMS GO' : '⚠ SOME ISSUES DETECTED'}`);
  console.log('='.repeat(60));
  
  // Write report
  const report = {
    timestamp: new Date().toISOString(),
    healthy: healthyCount,
    total: totalCount,
    allHealthy: healthyCount === totalCount,
    services: results,
    aiKeyPresent: aiResult.present,
    aiKeyPreview: aiResult.preview,
  };
  
  try { fs.mkdirSync('/root/automaton/data', { recursive: true }); } catch(e) {}
  fs.writeFileSync('/root/automaton/data/health_report.json', JSON.stringify(report, null, 2));
  console.log('\nReport written to: /root/automaton/data/health_report.json');
  return report;
}

// Run
runFullCheck().catch(console.error);
