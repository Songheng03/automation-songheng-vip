/**
 * dev-dashboard.cjs — Developer Dashboard for API Key Holders
 * Handles: GET /dev-dashboard → dashboard page
 *          GET /api/my-usage?key=am_xxx → JSON with key stats
 * 
 * This service hooks into the gateway via handleRoute()
 */
const fs = require('fs');
const path = require('path');

const API_KEYS_DATA = '/root/automaton/data/api-keys.json';
const API_KEYS_LEGACY = '/root/automaton/api-keys.json';

function loadKeys() {
  try {
    if (fs.existsSync(API_KEYS_DATA)) return JSON.parse(fs.readFileSync(API_KEYS_DATA, 'utf8'));
    if (fs.existsSync(API_KEYS_LEGACY)) return JSON.parse(fs.readFileSync(API_KEYS_LEGACY, 'utf8'));
  } catch(e) {}
  return {};
}

const ENDPOINT_COSTS = {
  'analyze': 1, 'summarize': 2, 'review': 5, 'security': 3,
  'explain': 2, 'refactor': 5, 'complexity': 2
};

const PLAN_NAMES = {
  'price_starter': 'Starter (500 cr)',
  'price_advanced': 'Pro (1100 cr)',
  'price_pro': 'Pro (3000 cr)',
  'price_enterprise': 'Enterprise (6500 cr)',
  'dev_trial': 'Developer Trial',
  'price_basic': 'Basic (500 cr)',
  'price_business': 'Business (3000 cr)'
};

const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>API Dashboard — my-automaton</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0f; color: #e0e0e0; min-height: 100vh; }
.container { max-width: 800px; margin: 0 auto; padding: 40px 20px; }
h1 { font-size: 2rem; margin-bottom: 8px; background: linear-gradient(135deg, #a78bfa, #60a5fa); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.subtitle { color: #888; margin-bottom: 32px; font-size: 0.95rem; }
.card { background: #14141f; border-radius: 12px; padding: 24px; margin-bottom: 16px; border: 1px solid #2a2a3a; }
.card h2 { font-size: 1.1rem; margin-bottom: 16px; color: #a78bfa; }
.form-group { margin-bottom: 16px; }
label { display: block; margin-bottom: 6px; color: #aaa; font-size: 0.9rem; }
input[type="text"] { width: 100%; padding: 12px 16px; background: #1a1a2a; border: 1px solid #333; border-radius: 8px; color: #e0e0e0; font-size: 1rem; font-family: monospace; }
input[type="text"]:focus { outline: none; border-color: #a78bfa; }
.btn { background: linear-gradient(135deg, #a78bfa, #60a5fa); color: #fff; border: none; padding: 12px 24px; border-radius: 8px; font-size: 1rem; cursor: pointer; font-weight: 600; }
.btn:hover { opacity: 0.9; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 20px; }
.stat-card { background: #1a1a2a; border-radius: 8px; padding: 16px; text-align: center; }
.stat-value { font-size: 1.8rem; font-weight: 700; color: #60a5fa; }
.stat-label { font-size: 0.8rem; color: #888; margin-top: 4px; }
.progress-bar { height: 8px; background: #2a2a3a; border-radius: 4px; overflow: hidden; margin: 12px 0; }
.progress-fill { height: 100%; border-radius: 4px; transition: width 0.5s ease; background: linear-gradient(90deg, #a78bfa, #60a5fa); }
.progress-fill.warning { background: linear-gradient(90deg, #f59e0b, #ef4444); }
table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #2a2a3a; }
th { color: #888; font-weight: 500; font-size: 0.8rem; text-transform: uppercase; }
td { color: #ccc; }
.code-snippet { background: #1a1a2a; border-radius: 8px; padding: 16px; font-family: 'Fira Code', monospace; font-size: 0.85rem; overflow-x: auto; margin: 8px 0; }
.copy-btn { float: right; background: #2a2a3a; border: none; color: #aaa; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 0.8rem; }
.copy-btn:hover { background: #3a3a4a; color: #fff; }
.hidden { display: none; }
.error { color: #ef4444; background: #2a1a1a; padding: 12px; border-radius: 8px; margin: 12px 0; }
.success { color: #22c55e; background: #1a2a1a; padding: 12px; border-radius: 8px; margin: 12px 0; }
.loading { text-align: center; padding: 40px; color: #888; }
.loading::after { content: ''; display: inline-block; width: 20px; height: 20px; border: 2px solid #333; border-top-color: #a78bfa; border-radius: 50%; animation: spin 0.8s linear infinite; margin-left: 8px; vertical-align: middle; }
@keyframes spin { to { transform: rotate(360deg); } }
@media (max-width: 600px) { .container { padding: 20px 12px; } .stats-grid { grid-template-columns: repeat(2, 1fr); } }
</style>
</head>
<body>
<div class="container">
  <h1>🔑 API Dashboard</h1>
  <p class="subtitle">Enter your API key to check credits, usage, and get integration examples</p>

  <div class="card">
    <div class="form-group">
      <label for="apiKey">Your API Key</label>
      <input type="text" id="apiKey" placeholder="am_xxxxxxxxxxxxxxxxxxxxxxxx" autocomplete="off">
    </div>
    <button class="btn" id="checkBtn" onclick="checkKey()">Check Usage →</button>
    <div id="result"></div>
  </div>

  <div id="dashboard" class="hidden">
    <div class="stats-grid" id="statsGrid"></div>
    <div class="card">
      <h2>📊 Credit Usage</h2>
      <div class="progress-bar"><div class="progress-fill" id="usageBar"></div></div>
      <div id="usageText"></div>
    </div>
    <div class="card" id="endpointCosts">
      <h2>⚡ Endpoint Costs</h2>
      <table><thead><tr><th>Service</th><th>Cost</th></tr></thead><tbody id="costTable"></tbody></table>
    </div>
    <div class="card">
      <h2>🚀 Quick Start</h2>
      <p style="color:#888;margin-bottom:12px">Use your API key with these code snippets:</p>
      <div id="snippets"></div>
    </div>
  </div>
</div>

<script>
async function checkKey() {
  const key = document.getElementById('apiKey').value.trim();
  const result = document.getElementById('result');
  const dashboard = document.getElementById('dashboard');
  
  if (!key || !key.startsWith('am_')) {
    result.innerHTML = '<div class="error">❌ Invalid API key format. Keys start with "am_"</div>';
    dashboard.classList.add('hidden');
    return;
  }

  result.innerHTML = '<div class="loading">Checking...</div>';
  dashboard.classList.add('hidden');

  try {
    const resp = await fetch('/api/my-usage?key=' + encodeURIComponent(key));
    const data = await resp.json();
    
    if (!data.found) {
      result.innerHTML = '<div class="error">❌ Key not found. Check your key and try again.</div>';
      return;
    }

    result.innerHTML = '<div class="success">✅ Key verified! Here\'s your dashboard.</div>';
    renderDashboard(data);
    dashboard.classList.remove('hidden');
  } catch(e) {
    result.innerHTML = '<div class="error">❌ Error: ' + e.message + '</div>';
  }
}

function renderDashboard(data) {
  const total = data.credits;
  const used = data.used || 0;
  const remaining = total - used;
  const pct = total > 0 ? Math.round((used / total) * 100) : 0;
  
  document.getElementById('statsGrid').innerHTML = [
    { label: 'Total Credits', value: total },
    { label: 'Credits Used', value: used },
    { label: 'Remaining', value: remaining },
    { label: 'Plan', value: data.plan_name || 'Custom' }
  ].map(s => '<div class="stat-card"><div class="stat-value">' + s.value + '</div><div class="stat-label">' + s.label + '</div></div>').join('');
  
  const bar = document.getElementById('usageBar');
  bar.style.width = Math.min(pct, 100) + '%';
  bar.className = 'progress-fill' + (pct > 80 ? ' warning' : '');
  document.getElementById('usageText').textContent = used + ' of ' + total + ' credits used (' + pct + '%)';

  const costData = { analyze: '1¢', summarize: '2¢', review: '5¢', security: '3¢', explain: '2¢', refactor: '5¢', complexity: '2¢' };
  document.getElementById('costTable').innerHTML = Object.entries(costData).map(([k, v]) => 
    '<tr><td>' + k.charAt(0).toUpperCase() + k.slice(1) + '</td><td>' + v + '</td></tr>'
  ).join('');

  const key = document.getElementById('apiKey').value.trim();
  const snippets = [
    { title: 'curl', code: 'curl -X POST https://automation.songheng.vip/v1/analyze \\\n  -H "X-API-Key: ' + key + '" \\\n  -H "Content-Type: application/json" \\\n  -d \'{"text":"Hello world"}\'' },
    { title: 'JavaScript', code: 'const res = await fetch("https://automation.songheng.vip/v1/analyze", {\n  method: "POST",\n  headers: { "X-API-Key": "' + key + '", "Content-Type": "application/json" },\n  body: JSON.stringify({ text: "Hello world" })\n});\nconst data = await res.json();' },
    { title: 'Python', code: 'import requests\nresp = requests.post(\n  "https://automation.songheng.vip/v1/analyze",\n  headers={"X-API-Key": "' + key + '"},\n  json={"text": "Hello world"}\n)\nprint(resp.json())' }
  ];
  
  document.getElementById('snippets').innerHTML = snippets.map(s => 
    '<div style="margin-bottom:12px"><strong style="color:#a78bfa">' + s.title + '</strong>' +
    '<div class="code-snippet"><button class="copy-btn" onclick="copyCode(this)">Copy</button><pre>' + s.code + '</pre></div></div>'
  ).join('');
}

function copyCode(btn) {
  const pre = btn.parentElement.querySelector('pre');
  navigator.clipboard.writeText(pre.textContent).then(() => {
    btn.textContent = 'Copied!';
    setTimeout(() => btn.textContent = 'Copy', 2000);
  });
}

document.getElementById('apiKey').addEventListener('keydown', e => { if (e.key === 'Enter') checkKey(); });

// Check URL for ?key= parameter
const params = new URLSearchParams(window.location.search);
if (params.get('key')) { document.getElementById('apiKey').value = params.get('key'); checkKey(); }
</script>
</body>
</html>`;

function handleRoute(req, res) {
  const url = req.url.split('?')[0].split('#')[0];

  // Serve dashboard page
  if (url === '/dev-dashboard' || url === '/dashboard') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(DASHBOARD_HTML);
    return true;
  }

  // API: Check key usage
  if (url === '/api/my-usage' && req.method === 'GET') {
    const params = new URL(req.url, 'http://localhost').searchParams;
    const key = params.get('key');
    
    if (!key || !key.startsWith('am_')) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid API key format', found: false }));
      return true;
    }

    const keys = loadKeys();
    const data = keys[key];
    
    if (!data) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Key not found', found: false }));
      return true;
    }

    const used = data.used || 0;
    res.writeHead(200, { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify({
      found: true,
      key_masked: key.slice(0, 8) + '...' + key.slice(-4),
      credits: data.credits,
      used: used,
      remaining: data.credits - used,
      plan_name: PLAN_NAMES[data.price_id] || data.price_id || 'Custom',
      created: data.created,
      status: (data.credits - used) > 0 ? 'active' : 'exhausted'
    }));
    return true;
  }

  return false; // Not handled
}

function init() {
  console.log('[dev-dashboard] Developer Dashboard loaded');
  console.log('[dev-dashboard] Routes: /dev-dashboard, /api/my-usage');
}

module.exports = { handleRoute, init };

// Self-test
if (require.main === module) {
  const http = require('http');
  http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
    if (!handleRoute(req, res)) {
      res.writeHead(404);
      res.end('Not found');
    }
  }).listen(3005, '127.0.0.1', () => {
    console.log('[dev-dashboard] Test server on :3005');
  });
}
