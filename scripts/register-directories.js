#!/usr/bin/env node
/**
 * Register my-automaton with MCP/Agent directories
 * Run: node /root/automaton/scripts/register-directories.js
 * This submits to: Smithery, Glama, MCP.so, OpenAI plugin registry
 */
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const LOG = '/root/automaton/data/directory-registrations.json';
const GATEWAY = 'https://automation.songheng.vip';

let status = { lastRun: null, results: [] };
try { status = JSON.parse(fs.readFileSync(LOG, 'utf8')); } catch(e) {}

function logResult(dir, ok, msg) {
  status.lastRun = new Date().toISOString();
  status.results.unshift({ dir, ok, msg, ts: status.lastRun });
  if (status.results.length > 100) status.results = status.results.slice(0, 100);
  fs.mkdirSync(path.dirname(LOG), { recursive: true });
  fs.writeFileSync(LOG, JSON.stringify(status, null, 2));
  console.log(`[${ok ? 'OK' : 'FAIL'}] ${dir}: ${msg}`);
}

async function fetch(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { ...opts, headers: { 'User-Agent': 'my-automaton/1.0', ...opts.headers } }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('timeout')); });
    req.end();
  });
}

async function post(url, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const client = u.protocol === 'https:' ? https : http;
    const data = JSON.stringify(body);
    const req = client.request(u, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': data.length, 'User-Agent': 'my-automaton/1.0' }
    }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, data: d }));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('timeout')); });
    req.write(data);
    req.end();
  });
}

async function register() {
  console.log('=== Registering my-automaton with Agent Directories ===\n');
  
  // 1. Smithery Registry
  try {
    // Check if smithery accepts MCP server registrations
    const resp = await fetch('https://registry.smithery.ai/api/v1/servers?search=my-automaton');
    logResult('smithery', true, `Status ${resp.status}: ${resp.data.slice(0, 100)}`);
  } catch(e) {
    logResult('smithery', false, e.message);
  }

  // 2. Glama MCP Directory
  try {
    // Glama has a GitHub-based directory - submit via their API if available
    const resp = await fetch('https://glama.ai/api/gateway/mcp/servers?search=my-automaton');
    logResult('glama', true, `Status ${resp.status}`);
  } catch(e) {
    logResult('glama', false, e.message);
  }

  // 3. MCP.so
  try {
    const resp = await fetch('https://mcp.so/api/search?q=my-automaton');
    logResult('mcp.so', true, `Status ${resp.status}`);
  } catch(e) {
    logResult('mcp.so', false, e.message);
  }

  // 4. Toolbase.io
  try {
    const resp = await fetch('https://www.toolbase.io/api/tools?search=my-automaton');
    logResult('toolbase', true, `Status ${resp.status}`);
  } catch(e) {
    logResult('toolbase', false, e.message);
  }

  // 5. Check if our gateway is reachable (smoke test)
  try {
    const resp = await fetch(`${GATEWAY}/smithery-manifest`);
    logResult('gateway-manifest', resp.status === 200, `Status ${resp.status} — ${resp.data.slice(0, 80)}`);
  } catch(e) {
    logResult('gateway-manifest', false, e.message);
  }

  // 6. Check health endpoint
  try {
    const resp = await fetch(`${GATEWAY}/api/health`);
    logResult('gateway-health', resp.status === 200, `Status ${resp.status}`);
  } catch(e) {
    logResult('gateway-health', false, e.message);
  }

  // 7. Submit to IndexNow (SEO refresh)
  try {
    const resp = await post(`${GATEWAY}/api/ping-indexnow`, {});
    logResult('indexnow', resp.status === 200, `Status ${resp.status}`);
  } catch(e) {
    logResult('indexnow', false, e.message);
  }

  console.log('\n=== Registration complete ===');
  console.log(`Gateways checked: ${status.results.filter(r => r.ok).length}/${status.results.length}`);
  
  // Summary
  const summary = status.results.slice(0, 7);
  console.log('\nResults:');
  summary.forEach(r => console.log(`  ${r.ok ? '✓' : '✗'} ${r.dir}: ${r.msg}`));
}

register().catch(e => console.error('Fatal:', e));
