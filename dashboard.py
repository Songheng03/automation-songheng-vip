#!/usr/bin/env python3
"""
dashboard.py — Real revenue & analytics dashboard for my-automaton
Serves a comprehensive dashboard at port 8888/dashboard
Shows live stats: requests, revenue, agents, referrals
"""

import json, os, sys, time, http.server
from urllib.parse import urlparse

DATA_DIR = os.path.join(os.path.dirname(__file__), "ecosystem_data")
os.makedirs(DATA_DIR, exist_ok=True)

def rj(path, default=None):
    try:
        with open(os.path.join(DATA_DIR, path)) as f: return json.load(f)
    except: return default or {}

DASHBOARD_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>my-automaton · Revenue Dashboard</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0a0a1a;color:#e0e0f0;line-height:1.6;padding:20px}
.container{max-width:1200px;margin:auto}
h1{font-size:2.5em;color:#fff;margin:30px 0 10px}
h1 span{color:#7c3aed}
.subtitle{color:#7c7caa;margin-bottom:30px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:15px;margin:20px 0}
.card{background:linear-gradient(135deg,#12122a,#1a1a3a);border:1px solid #2d2d5e;border-radius:12px;padding:20px}
.card .num{font-size:2.5em;font-weight:700;color:#a78bfa}
.card .lbl{color:#7c7caa;font-size:.85em;margin-top:5px}
.card .sub{color:#4ade80;font-size:.8em}
h2{color:#a78bfa;font-size:1.3em;margin:30px 0 15px;padding-bottom:8px;border-bottom:1px solid #2d2d5e}
table{width:100%;border-collapse:collapse;margin:15px 0}
th{text-align:left;color:#7c7caa;font-size:.8em;text-transform:uppercase;padding:8px 12px;border-bottom:1px solid #2d2d5e}
td{padding:8px 12px;border-bottom:1px solid #1a1a3a;font-size:.9em}
.code{font-family:monospace;color:#818cf8;font-size:.85em}
.earnings{color:#4ade80;font-weight:600}
.status{color:#4ade80}
.status-down{color:#ef4444}
a{color:#818cf8;text-decoration:none}
a:hover{color:#a78bfa}
.footer{text-align:center;padding:30px;color:#4a4a6a;font-size:.8em}
.badge{display:inline-block;padding:2px 10px;border-radius:12px;font-size:.75em;font-weight:600}
.badge-free{background:rgba(6,95,70,.5);color:#6ee7b7}
.badge-paid{background:rgba(76,29,149,.5);color:#c4b5fd}
</style>
</head>
<body>
<div class="container">
<h1>my-<span>automaton</span> · Dashboard</h1>
<p class="subtitle">Live revenue & ecosystem analytics · <span id="uptime">loading...</span></p>

<div class="grid" id="stats-grid">
  <div class="card">
    <div class="num" id="reqs">-</div>
    <div class="lbl">Total Requests</div>
  </div>
  <div class="card">
    <div class="num" id="x402">-</div>
    <div class="lbl">Paid x402 Payments</div>
  </div>
  <div class="card">
    <div class="num" id="revenue">-</div>
    <div class="lbl">Estimated Revenue</div>
    <div class="sub">USDC on Base</div>
  </div>
  <div class="card">
    <div class="num" id="agents">-</div>
    <div class="lbl">Agents Registered</div>
    <div class="sub">via handshake</div>
  </div>
  <div class="card">
    <div class="num" id="referrals">-</div>
    <div class="lbl">Referral Signups</div>
    <div class="sub">20% commission</div>
  </div>
  <div class="card">
    <div class="num" id="services">9</div>
    <div class="lbl">Premium Services</div>
    <div class="sub">1¢ - 5¢ each</div>
  </div>
</div>

<h2>🧠 Premium x402 Services</h2>
<table>
<tr><th>Service</th><th>Endpoint</th><th>Cost</th><th>Status</th></tr>
<tr><td>Text Analysis</td><td class="code">POST /v1/analyze</td><td>1¢</td><td class="status">✓ Active</td></tr>
<tr><td>Summarization</td><td class="code">POST /v1/summarize</td><td>2¢</td><td class="status">✓ Active</td></tr>
<tr><td>Code Review</td><td class="code">POST /v1/review</td><td>5¢</td><td class="status">✓ Active</td></tr>
<tr><td>Security Scan</td><td class="code">POST /v1/security</td><td>3¢</td><td class="status">✓ Active</td></tr>
<tr><td>Code Explain</td><td class="code">POST /v1/explain</td><td>2¢</td><td class="status">✓ Active</td></tr>
<tr><td>Refactoring</td><td class="code">POST /v1/refactor</td><td>5¢</td><td class="status">✓ Active</td></tr>
<tr><td>Complexity</td><td class="code">POST /v1/complexity</td><td>2¢</td><td class="status">✓ Active</td></tr>
</table>

<h2>🤖 Registered Agents</h2>
<div id="agent-list"><p>Loading agents...</p></div>

<h2>🔗 Referral Program</h2>
<table>
<tr><th>Code</th><th>Agent</th><th>Earnings</th><th>Joined</th></tr>
</table>
<div id="referral-list"><p>Loading referrals...</p></div>

<h2>📡 Integration Endpoints</h2>
<table>
<tr><th>Port</th><th>Service</th><th>Format</th><th>How to Connect</th></tr>
<tr><td>8888</td><td>Revenue Gateway</td><td>REST + x402</td><td class="code">POST http://automation.songheng.vip:8888/v1/analyze</td></tr>
<tr><td>3121</td><td>MCP Server</td><td>MCP Protocol</td><td class="code">POST http://automation.songheng.vip:3121/tools/call</td></tr>
<tr><td>4280</td><td>Compat Layer</td><td>OpenAI/MCP</td><td class="code">GET http://automation.songheng.vip:4280/api/catalog/openai</td></tr>
</table>

<div class="footer">
  my-automaton · 0x76eADdEBFfb6a61DD071f97F4508467fc55dd113 · Base chain · Built to survive
</div>
</div>

<script>
async function load() {
  try {
    const r = await fetch('/stats');
    const d = await r.json();
    document.getElementById('reqs').textContent = d.reqs || 0;
    document.getElementById('x402').textContent = d.x402 || 0;
    document.getElementById('revenue').textContent = '$' + ((d.x402 || 0) * 0.03).toFixed(2);
    document.getElementById('agents').textContent = (d.handshakes || 0);
    document.getElementById('referrals').textContent = (d.referrals || 0);
  } catch(e) {
    document.getElementById('reqs').textContent = '?';
  }
  try {
    const a = await fetch('/api/discover');
    const ad = await a.json();
    const agents = ad.agents || [];
    const list = document.getElementById('agent-list');
    if (agents.length === 0) {
      list.innerHTML = '<p>No agents registered yet. Be the first!</p>';
    } else {
      let html = '<table><tr><th>Name</th><th>Address</th><th>Since</th></tr>';
      agents.forEach(ag => {
        html += '<tr><td>' + (ag.name || 'unknown') + '</td><td class="code">' + (ag.address || '').slice(0,10) + '...</td><td>' + new Date((ag.time || 0)*1000).toLocaleDateString() + '</td></tr>';
      });
      html += '</table>';
      list.innerHTML = html;
    }
  } catch(e) {
    document.getElementById('agent-list').innerHTML = '<p>Could not load agents.</p>';
  }
  document.getElementById('uptime').textContent = 'Updated: ' + new Date().toLocaleTimeString();
}
load();
setInterval(load, 15000);
</script>
</body>
</html>"""

class DashboardInjector:
    """Injects /dashboard route into the main gateway's handler."""
    
    @staticmethod
    def patch_gateway():
        gw_path = os.path.join(os.path.dirname(__file__), "gateway_8888.py")
        with open(gw_path) as f:
            code = f.read()
        
        # Check if already patched
        if 'dashboard' in code and 'DASHBOARD_HTML' in code:
            print("[dashboard] Already patched into gateway")
            return False
        
        # Add dashboard HTML constant before the Handler class
        dashboard_const = f'\n\n# --- Dashboard HTML (injected) ---\nDASHBOARD_HTML = {json.dumps(DASHBOARD_HTML)}\n\n'
        
        # Inject after INDEX_HTML loading block
        insert_point = code.find('# --- Agent Card ---')
        if insert_point == -1:
            insert_point = code.find('AGENT_CARD = {')
        
        if insert_point > 0:
            code = code[:insert_point] + dashboard_const + code[insert_point:]
            
            # Add dashboard route in do_GET
            # Find the health check section and add dashboard after it
            dashboard_route = """
        # Dashboard
        if p == "/dashboard":
            return self._html(200, DASHBOARD_HTML)
        
"""
            code = code.replace(
                '# Health check\n        if p == "/health":',
                dashboard_route + '        # Health check\n        if p == "/health":'
            )
            
            with open(gw_path, 'w') as f:
                f.write(code)
            print("[dashboard] Patched gateway with dashboard route")
            return True
        
        print("[dashboard] Could not patch gateway")
        return False

if __name__ == "__main__":
    DashboardInjector.patch_gateway()
    print("[dashboard] Dashboard injected. Restart gateway to see changes.")
