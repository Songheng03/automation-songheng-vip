#!/usr/bin/env node
// gateway-monitor.cjs — Probe the live gateway and generate status page
// Run: node scripts/gateway-monitor.cjs

const fs = require('fs');
const path = require('path');
const http = require('http');

const GATEWAY = 'http://localhost:8080';
const STATUS_FILE = '/root/automaton/content/gateway-status.html';
const DATA_DIR = '/root/automaton/data';
const HISTORY_FILE = path.join(DATA_DIR, 'gateway-probes.json');

const ENDPOINTS = [
  { path: '/', method: 'GET', name: 'Homepage', type: 'static' },
  { path: '/health', method: 'GET', name: 'Health Check', type: 'api' },
  { path: '/upgrade.html', method: 'GET', name: 'Upgrade Page', type: 'static' },
  { path: '/playground.html', method: 'GET', name: 'Playground', type: 'static' },
  { path: '/api-docs.html', method: 'GET', name: 'API Docs', type: 'static' },
  { path: '/api/stats/overview', method: 'GET', name: 'Stats API', type: 'api' },
  { path: '/sitemap.xml', method: 'GET', name: 'Sitemap', type: 'seo' },
  { path: '/openapi.json', method: 'GET', name: 'OpenAPI Spec', type: 'api' },
  { path: '/free/review', method: 'POST', name: 'Free Review', type: 'api', body: { code: 'test', language: 'javascript' } },
  { path: '/free/security', method: 'POST', name: 'Free Security', type: 'api', body: { code: 'test', language: 'javascript' } },
  { path: '/badge?label=test&message=ok&color=green', method: 'GET', name: 'Badge', type: 'api' },
  { path: '/robots.txt', method: 'GET', name: 'robots.txt', type: 'seo' },
];

function log(msg) {
  const line = '[' + new Date().toISOString() + '] ' + msg;
  console.log(line);
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.appendFileSync(path.join(DATA_DIR, 'monitor.log'), line + '\n');
  } catch {}
}

function fetchEndpoint(ep) {
  return new Promise(function(resolve) {
    var url = new URL(ep.path, GATEWAY);
    var options = {
      hostname: 'localhost',
      port: 8080,
      path: url.pathname + url.search,
      method: ep.method,
      timeout: 5000,
      headers: { 'Content-Type': 'application/json' },
    };
    var req = http.request(options, function(res) {
      var body = '';
      res.on('data', function(c) { body += c; });
      res.on('end', function() {
        resolve({
          path: ep.path, name: ep.name, status: res.statusCode,
          ok: res.statusCode >= 200 && res.statusCode < 400,
          time: new Date().toISOString(), type: ep.type, body: body.substring(0, 200)
        });
      });
    });
    req.on('error', function(e) {
      resolve({ path: ep.path, name: ep.name, status: 0, ok: false, error: e.message, type: ep.type, time: new Date().toISOString() });
    });
    if (ep.method === 'POST' && ep.body) { req.write(JSON.stringify(ep.body)); }
    req.end();
  });
}

function generateHTML(results, okCount, total, failed) {
  var pct = total > 0 ? Math.round((okCount / total) * 100) : 0;
  var statusColor = pct === 100 ? '#3fb950' : pct >= 80 ? '#d29922' : '#f85149';
  var statusEmoji = pct === 100 ? '✅' : pct >= 80 ? '⚠️' : '❌';
  var rows = results.map(function(r) {
    return '<tr><td style="padding:8px;border-bottom:1px solid #30363d;">' + r.name + '</td>' +
      '<td style="padding:8px;border-bottom:1px solid #30363d;"><code>' + r.path + '</code></td>' +
      '<td style="padding:8px;border-bottom:1px solid #30363d;">' +
      (r.ok ? '<span style="color:#3fb950;">● ' + r.status + '</span>' : '<span style="color:#f85149;">● ' + (r.error || r.status) + '</span>') +
      '</td></tr>';
  }).join('');
  return '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">' +
    '<title>Gateway Status - my-automaton</title><meta http-equiv="refresh" content="60">' +
    '<style>body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif;background:#0d1117;color:#e6edf3;padding:2rem;}h1{font-size:1.5rem;}.card{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:1.5rem;margin-bottom:1.5rem;text-align:center;}.big{font-size:3rem;}.up{font-size:2rem;font-weight:bold;color:' + statusColor + ';}table{width:100%;border-collapse:collapse;background:#161b22;border:1px solid #30363d;border-radius:8px;}th{background:#1c2128;padding:8px;text-align:left;color:#8b949e;}td{padding:8px;border-bottom:1px solid #30363d;}code{color:#8b949e;}.muted{color:#8b949e;text-align:center;margin-top:2rem;}</style></head><body>' +
    '<h1>' + statusEmoji + ' Gateway Status</h1>' +
    '<div class="card"><div class="big">' + pct + '%</div><div class="up">' + okCount + '/' + total + ' healthy</div>' +
    '<div class="muted">Checked: ' + new Date().toISOString() + ' | Auto-refresh 60s</div></div>' +
    '<table><thead><tr><th>Endpoint</th><th>Path</th><th>Status</th></tr></thead><tbody>' + rows + '</tbody></table>' +
    '<div class="muted"><p>Powered by <a href="https://automation.songheng.vip" style="color:#58a6ff;">my-automaton</a></p></div></body></html>';
}

async function main() {
  log('=== Gateway Probe ===');
  var results = await Promise.all(ENDPOINTS.map(fetchEndpoint));
  var okCount = results.filter(function(r) { return r.ok; }).length;
  var total = results.length;
  var failed = total - okCount;
  log('Results: ' + okCount + '/' + total + ' OK');
  results.forEach(function(r) {
    if (!r.ok) log('  FAIL: ' + r.name + ' (' + r.path + ') -> ' + (r.error || r.status));
  });
  try {
    var history = {};
    try { history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8')); } catch {}
    history.last_probe = new Date().toISOString();
    history.total_checks = (history.total_checks || 0) + 1;
    history.last_uptime = okCount + '/' + total;
    history.endpoints = results;
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
    var html = generateHTML(results, okCount, total, failed);
    fs.writeFileSync(STATUS_FILE, html);
    log('Status page written');
  } catch (e) { log('Write error: ' + e.message); }
  log('=== Done ===');
}
main().catch(function(e) { log('Fatal: ' + e.message); });
