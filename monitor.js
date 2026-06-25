#!/usr/bin/env node
/**
 * Real-time Gateway Monitor
 * Generates a status dashboard HTML page
 */
const http = require('http');
const fs = require('fs');

function fetch(path) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:8080${path}`, { timeout: 5000 }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, json: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', (e) => resolve({ status: 0, error: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 0, error: 'timeout' }); });
  });
}

async function generateDashboard() {
  const [health, stats, freeAnalyze] = await Promise.all([
    fetch('/health'),
    fetch('/api/stats'),
    fetch('/free/analyze')
  ]);

  const statsData = stats.json || {};
  const users = statsData.users || [];
  const totalUsers = statsData.total_users || 0;
  const totalCredits = users.reduce((s, u) => s + (u.credits || 0), 0);
  const totalUsed = users.reduce((s, u) => s + (u.used || 0), 0);
  
  // Check content files
  let pageCount = 0;
  try {
    const files = fs.readdirSync('/root/automaton/content', { recursive: true });
    pageCount = files.filter(f => f.endsWith('.html')).length;
  } catch {}

  // Read promotion log
  let promoLog = [];
  try {
    promoLog = JSON.parse(fs.readFileSync('/root/automaton/data/promotion-log.json', 'utf8')).slice(-10);
  } catch {}

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>System Monitor — my-automaton</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,sans-serif;background:#0a0a0f;color:#e0e0e0;padding:20px}
h1{color:#00ff88;font-size:1.8rem;margin-bottom:20px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;margin-bottom:24px}
.card{background:#1a1a2e;border:1px solid #333;border-radius:12px;padding:20px}
.card h2{color:#888;font-size:0.85rem;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px}
.card .value{font-size:2.2rem;font-weight:700;color:#fff}
.card .value.green{color:#00ff88}
.card .value.yellow{color:#ffd700}
.card .value.red{color:#ff4444}
.card .sub{color:#666;font-size:0.8rem;margin-top:4px}
table{width:100%;border-collapse:collapse;margin-top:8px}
th,td{text-align:left;padding:8px 12px;border-bottom:1px solid #222;font-size:0.85rem}
th{color:#888;font-weight:600}
.status-dot{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:6px}
.status-dot.up{background:#00ff88}
.status-dot.down{background:#ff4444}
.log{background:#0d0d1a;border-radius:8px;padding:12px;font-family:monospace;font-size:0.8rem;max-height:200px;overflow-y:auto}
.log div{padding:2px 0;border-bottom:1px solid #1a1a2e}
.timestamp{color:#666}
.refresh{position:fixed;top:20px;right:20px;background:#00ff88;color:#000;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;font-weight:600}
.bar{height:8px;background:#222;border-radius:4px;margin-top:8px;overflow:hidden}
.bar-fill{height:100%;border-radius:4px;transition:width 0.3s}
</style>
<script>setTimeout(()=>location.reload(),30000)</script>
</head>
<body>
<h1>⚡ my-automaton System Monitor</h1>
<button class="refresh" onclick="location.reload()">↻ Refresh</button>

<div class="grid">
  <div class="card">
    <h2>Gateway Status</h2>
    <div class="value ${health.status === 200 ? 'green' : 'red'}">
      <span class="status-dot ${health.status === 200 ? 'up' : 'down'}"></span>
      ${health.status === 200 ? 'ONLINE' : 'OFFLINE'}
    </div>
    <div class="sub">HTTP ${health.status} · ${new Date().toISOString().slice(0,19)}Z</div>
  </div>
  
  <div class="card">
    <h2>Registered Users</h2>
    <div class="value">${totalUsers}</div>
    <div class="sub">Free trial accounts</div>
  </div>
  
  <div class="card">
    <h2>Credits Available</h2>
    <div class="value yellow">${totalCredits.toLocaleString()}</div>
    <div class="sub">${totalUsed} credits used total</div>
  </div>
  
  <div class="card">
    <h2>Content Pages</h2>
    <div class="value">${pageCount}</div>
    <div class="sub">HTML pages indexed</div>
  </div>
  
  <div class="card">
    <h2>Revenue (USDC)</h2>
    <div class="value red">$0.00</div>
    <div class="sub">No paid conversions yet</div>
  </div>
  
  <div class="card">
    <h2>Conversion Rate</h2>
    <div class="value red">0%</div>
    <div class="sub">Free → Paid (need to improve)</div>
  </div>
</div>

<div class="card" style="margin-bottom:24px">
  <h2>User Activity</h2>
  <table>
    <thead><tr><th>API Key</th><th>Credits</th><th>Used</th><th>Created</th><th>Activity</th></tr></thead>
    <tbody>
    ${users.map(u => `<tr>
      <td><code>${u.key_prefix}</code></td>
      <td>${u.credits}</td>
      <td>${u.used || 0}</td>
      <td>${(u.created || '').slice(0,10)}</td>
      <td>${(u.used || 0) > 0 ? '✅ Active' : '❌ Idle'}</td>
    </tr>`).join('')}
    </tbody>
  </table>
</div>

<div class="card" style="margin-bottom:24px">
  <h2>Service Endpoints</h2>
  <table>
    <thead><tr><th>Endpoint</th><th>Status</th><th>Cost</th></tr></thead>
    <tbody>
    ${[
      ['/v1/analyze', '401', '1 credit'],
      ['/v1/summarize', '401', '2 credits'],
      ['/v1/review', '401', '5 credits'],
      ['/v1/security', '401', '3 credits'],
      ['/v1/explain', '401', '2 credits'],
      ['/v1/refactor', '401', '5 credits'],
      ['/v1/batch', '401', '5 credits'],
      ['/free/analyze', freeAnalyze.status.toString(), 'Free'],
    ].map(([ep, st, cost]) => `<tr>
      <td><code>POST ${ep}</code></td>
      <td><span class="status-dot ${st === '401' || st === '200' ? 'up' : 'down'}"></span>${st}</td>
      <td>${cost}</td>
    </tr>`).join('')}
    </tbody>
  </table>
</div>

<div class="card">
  <h2>Recent Promotion Log</h2>
  <div class="log">
    ${promoLog.length ? promoLog.map(l => `<div><span class="timestamp">${(l.time||'').slice(0,19)}</span> [${l.type}] ${l.healthy !== undefined ? 'Gateway: ' + (l.healthy ? 'UP' : 'DOWN') : ''}${l.users !== undefined ? 'Users: ' + l.users : ''}${l.site ? 'Submitted: ' + l.site : ''}</div>`).join('') : '<div>No promotion activity yet</div>'}
  </div>
</div>

</body>
</html>`;

  // Write to content dir so gateway serves it
  fs.writeFileSync('/root/automaton/content/monitor.html', html);
  console.log('✅ Dashboard generated at /monitor.html');
  return html;
}

// Generate and optionally serve
if (require.main === module) {
  generateDashboard().then(() => {
    console.log('Done! Visit https://automation.chaosong.dpdns.org/monitor.html');
  });
}

module.exports = { generateDashboard };
