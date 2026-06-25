#!/usr/bin/env node
/**
 * system_health.js — Validate and report on all services
 * Run via: node system_health.js
 * 
 * Checks every service, reports status, writes health report.
 * This is my autonomous self-monitoring system.
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const HOST = 'automation.songheng.vip';
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
  { name: 'Public Gateway', port: null, path: null, run: true }, // special
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

function checkPublicGateway() {
  return new Promise((resolve) => {
    try {
      const files = fs.readdirSync('/root/automaton');
      const gatewayFiles = files.filter(f => f.includes('public_gateway') || f.includes('gateway'));
      resolve({
        name: 'Public Gateway Code',
        runtime: 'python3',
        sourceFiles: gatewayFiles,
        healthy: gatewayFiles.length > 0,
      });
    } catch(e) {
      resolve({ name: 'Public Gateway Code', error: e.message, healthy: false });
    }
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

function checkDisk() {
  try {
    const stats = fs.statfsSync('/');
    const freeGB = (stats.bfree * stats.bsize) / (1024 * 1024 * 1024);
    return {
      name: 'Disk Space',
      freeGB: Math.round(freeGB * 100) / 100,
      healthy: freeGB > 0.5,
    };
  } catch(e) {
    return { name: 'Disk Space', error: e.message, healthy: false };
  }
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
  
  // Check disk
  const diskResult = checkDisk();
  console.log(`[${diskResult.healthy ? '✓' : '✗'}] Disk: ${diskResult.freeGB ? diskResult.freeGB.toFixed(2) + ' GB free' : 'ERROR'}`);
  
  // Check services
  const results = [];
  for (const svc of SERVICES) {
    if (svc.run) {
      const r = await checkPublicGateway();
      results.push(r);
      console.log(`[${r.healthy ? '✓' : '✗'}] ${r.name}: ${r.healthy ? r.sourceFiles.join(', ') : r.error}`);
    } else {
      const r = await checkURL(svc);
      results.push(r);
      const statusStr = r.status ? `HTTP ${r.status}` : `ERROR: ${r.error}`;
      console.log(`[${r.healthy ? '✓' : '✗'}] ${r.name} (:${svc.port}): ${statusStr}`);
    }
  }
  
  const healthyCount = results.filter(r => r.healthy).length;
  const totalCount = results.length;
  
  console.log('');
  console.log('='.repeat(60));
  console.log(`  HEALTH: ${healthyCount}/${totalCount} services healthy`);
  console.log(`  STATUS: ${healthyCount === totalCount ? 'ALL SYSTEMS GO' : 'SOME ISSUES DETECTED'}`);
  console.log('='.repeat(60));
  
  // Write report
  const report = {
    timestamp: new Date().toISOString(),
    healthy: healthyCount,
    total: totalCount,
    allHealthy: healthyCount === totalCount,
    services: results,
    aiKeyPresent: aiResult.present,
    diskFreeGB: diskResult.freeGB,
  };
  
  fs.writeFileSync('/root/automaton/data/health_report.json', JSON.stringify(report, null, 2));
  return report;
}

// Run if executed directly
if (process.argv[1]?.includes('system_health')) {
  runFullCheck().catch(console.error);
}

module.exports = { runFullCheck };
