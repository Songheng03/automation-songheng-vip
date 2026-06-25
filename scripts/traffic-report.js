#!/usr/bin/env node
"use strict";
/* traffic-report.js — Generate traffic and SEO report for my-automaton */
const https = require('https');
const fs = require('fs');
const path = require('path');

const SITE = 'https://automation.songheng.vip';
const REPORT_FILE = '/root/automaton/content/traffic-report.html';

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { timeout: 15000 }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, data, headers: res.headers }));
    }).on('error', reject).on('timeout', function() { this.destroy(); reject(new Error('timeout')); });
  });
}

async function checkEndpoint(endpoint, label) {
  try {
    const result = await httpsGet(`${SITE}${endpoint}`);
    return { label, status: result.status, ok: result.status < 400, size: result.data.length };
  } catch(e) {
    return { label, error: e.message, ok: false };
  }
}

async function generateReport() {
  console.log('[traffic-report] Checking all endpoints...');
  
  const endpoints = [
    '/health', '/api/catalog', '/api/stats', '/api/analytics',
    '/', '/blog', '/tools', '/dashboard', '/api-docs', '/api-playground',
    '/live-demo', '/upgrade', '/quickstart', '/monitor',
    '/ai-code-reviewer', '/code-quality-checker', '/content-generator',
    '/tools/regex-tester', '/tools/json-formatter', '/tools/http-status-codes',
    '/seo-optimizer', '/sitemap.xml', '/robots.txt', '/referral'
  ];

  const results = [];
  for (const ep of endpoints) {
    const r = await checkEndpoint(ep, ep);
    results.push(r);
    console.log(`  ${r.ok ? '✓' : '✗'} ${ep} → ${r.status || r.error}`);
  }

  const ok = results.filter(r => r.ok).length;
  const total = results.length;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>my-automaton — Traffic & SEO Report</title>
<style>
body{font-family:system-ui,sans-serif;max-width:800px;margin:auto;padding:20px;background:#0a0a0f;color:#e0e0e0}
h1{color:#00d4aa}
.status{display:flex;gap:20px;margin:20px 0}
.card{background:#1a1a2e;padding:15px;border-radius:8px;flex:1;text-align:center}
.card .num{font-size:2em;font-weight:bold}
.ok{color:#00d4aa}.fail{color:#ff4444}
table{width:100%;border-collapse:collapse;margin:20px 0}
th,td{padding:10px;text-align:left;border-bottom:1px solid #333}
th{color:#888}
tr:hover{background:#1a1a2e}
.badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:.8em}
.badge.ok{background:#00d4aa22;color:#00d4aa}
.badge.fail{background:#ff444422;color:#ff4444}
.page{background:#1a1a2e;padding:20px;border-radius:8px;margin:20px 0}
.meta{color:#888;font-size:.9em}
a{color:#00d4aa}
</style>
</head>
<body>
<h1>🤖 my-automaton — Traffic & SEO Report</h1>
<p class="meta">Generated: ${new Date().toISOString()} | Site: ${SITE}</p>

<div class="status">
<div class="card">
<div class="num ${ok === total ? 'ok' : 'fail'}">${ok}/${total}</div>
<div>Endpoints Online</div>
</div>
<div class="card">
<div class="num">${results.filter(r => r.status === 200).length}</div>
<div>HTTP 200 OK</div>
</div>
<div class="card">
<div class="num">${results.filter(r => r.status >= 400).length}</div>
<div>Errors</div>
</div>
</div>

<div class="page">
<h2>📋 Full Endpoint Check</h2>
<table>
<tr><th>Endpoint</th><th>Status</th><th>Response Size</th></tr>
${results.map(r => `<tr>
<td><a href="${SITE}${r.label}" target="_blank">${r.label}</a></td>
<td><span class="badge ${r.ok ? 'ok' : 'fail'}">${r.status || 'ERR'}</span></td>
<td>${r.size ? (r.size/1024).toFixed(1)+'KB' : '-'}</td>
</tr>`).join('\n')}
</table>
</div>

<div class="page">
<h2>🚀 Quick Actions</h2>
<ul>
<li><a href="${SITE}/api/catalog" target="_blank">View API Catalog</a></li>
<li><a href="${SITE}/health" target="_blank">Health Check</a></li>
<li><a href="${SITE}/api/analytics" target="_blank">Analytics</a></li>
<li><a href="${SITE}/sitemap.xml" target="_blank">Sitemap</a></li>
<li><a href="${SITE}/dashboard" target="_blank">Revenue Dashboard</a></li>
</ul>
</div>

<div class="page">
<h2>💰 Revenue</h2>
<p><strong>Status:</strong> Waiting for first payment</p>
<p><strong>Wallet:</strong> <code>0x76eADdEBFfb6A61DD071f97F4508467fc55dd113</code></p>
<p><strong>Chain:</strong> Base · USDC</p>
<p><strong>Pricing:</strong> 1¢–5¢ per request via x402 micropayments</p>
</div>
</body>
</html>`;

  fs.writeFileSync(REPORT_FILE, html, 'utf8');
  console.log(`[traffic-report] Written to ${REPORT_FILE}`);
  return { ok, total, results };
}

if (require.main === module) {
  generateReport().catch(console.error);
}

module.exports = { generateReport };
