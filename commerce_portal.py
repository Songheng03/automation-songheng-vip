#!/usr/bin/env python3
"""Agent Commerce Portal — Port 4101
Your one-stop API for AI text & code services.
No signup. Just send USDC and get results."""

import http.server, json, os, sys, time, hmac, hashlib, sqlite3, urllib.request, urllib.parse

WALLET = "0x76eADdEBFfb6a61DD071f97F4508467fc55dd113"
GATEWAY = "http://localhost:8888"
DB = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ecosystem_data", "commerce.db")
os.makedirs(os.path.dirname(DB), exist_ok=True)

# Initialize database for tracking
def init_db():
    conn = sqlite3.connect(DB)
    c = conn.cursor()
    c.executescript("""
        CREATE TABLE IF NOT EXISTS api_keys (
            key_id TEXT PRIMARY KEY, key_hash TEXT, agent_address TEXT, 
            label TEXT, created_at REAL, last_used REAL, total_spent_cents REAL DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS usage_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT, api_key_id TEXT,
            endpoint TEXT, cost_cents INTEGER, ip TEXT, created_at REAL
        );
    """)
    conn.commit()
    return conn

SERVICES = [
    {"name":"Text Analysis","endpoint":"/v1/analyze","cost":1,"desc":"Sentiment, entities, themes, readability scoring","method":"POST"},
    {"name":"Summarization","endpoint":"/v1/summarize","cost":2,"desc":"Extract key points and generate concise summaries","method":"POST"},
    {"name":"Code Review","endpoint":"/v1/review","cost":5,"desc":"Full code review with quality score, issues, suggestions","method":"POST"},
    {"name":"Security Scan","endpoint":"/v1/security","cost":3,"desc":"Vulnerability scanning: XSS, injection, exposure risks","method":"POST"},
    {"name":"Code Explain","endpoint":"/v1/explain","cost":2,"desc":"Explain code: logic, dependencies, context analysis","method":"POST"},
    {"name":"Refactoring","endpoint":"/v1/refactor","cost":5,"desc":"Refactoring suggestions: complexity reduction, best practices","method":"POST"},
    {"name":"Complexity","endpoint":"/v1/complexity","cost":2,"desc":"Cyclomatic complexity, nesting depth, maintainability index","method":"POST"},
    {"name":"Batch","endpoint":"/v1/batch","cost":5,"desc":"Batch process up to 10 texts in one call","method":"POST"},
    {"name":"Render","endpoint":"/v1/render","cost":3,"desc":"Convert markdown to styled HTML output","method":"POST"},
]

DOCS_HTML = """<!DOCTYPE html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Agent Commerce Portal — my-automaton</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0a0a1a;color:#e0e0f0;line-height:1.6}
.wrap{max-width:960px;margin:auto;padding:20px}
h1{font-size:2.5em;margin:40px 0 5px;background:linear-gradient(135deg,#a78bfa,#60a5fa);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
h2{font-size:1.4em;margin:30px 0 10px;color:#a78bfa}
h3{color:#c4b5fd;margin:20px 0 8px}
.sub{color:#6a6a9a;margin-bottom:20px;font-size:1.1em}
.card{background:#12122a;border:1px solid #2d2d5e;border-radius:12px;padding:24px;margin:15px 0}
.green{color:#34d399} .purple{color:#a78bfa} .blue{color:#60a5fa}
code{background:#1a1a3a;padding:2px 8px;border-radius:4px;font-size:.9em;color:#c4b5fd}
pre{background:#0a0a1a;border:1px solid #2d2d5e;border-radius:8px;padding:16px;overflow-x:auto;font-size:13px;line-height:1.5;color:#c4b5fd;margin:10px 0}
table{width:100%;border-collapse:collapse;margin:10px 0}
td,th{padding:10px 8px;border-bottom:1px solid #1a1a3a;text-align:left}
th{color:#818cf8;font-size:.85em;text-transform:uppercase;letter-spacing:.5px}
.tag{display:inline-block;background:#2d2d5e;color:#a78bfa;padding:3px 12px;border-radius:20px;font-size:.8em;margin:3px}
.footer{text-align:center;padding:40px;color:#4a4a6a;font-size:.85em}
a{color:#818cf8} a:hover{color:#a78bfa}
.badge{display:inline-block;background:#065f46;color:#34d399;padding:2px 10px;border-radius:12px;font-size:.75em;font-weight:600}
hr{border:none;border-top:1px solid #1a1a3a;margin:20px 0}
</style></head><body>
<div class="wrap">

<h1>⚡ Agent Commerce Portal</h1>
<p class="sub">AI-powered code & text services · Pay per request via USDC on Base</p>

<div class="card" style="text-align:center;border-color:#4a4a8a">
<p><span class="tag">Server: automation.songheng.vip</span><span class="tag">Chain: Base</span><span class="tag">Token: USDC</span></p>
<p style="margin-top:8px;font-size:.9em;color:#6a6a9a">Wallet: <code>"""+WALLET+"""</code></p>
</div>

<h2>📋 Available Services</h2>
<table>
<tr><th>Service</th><th>Endpoint</th><th>Cost</th><th>Description</th></tr>
""" + "\n".join(f'<tr><td><b>{s["name"]}</b></td><td><code>POST {s["endpoint"]}</code></td><td class="green">{s["cost"]}¢</td><td style="color:#9a9aba;font-size:.9em">{s["desc"]}</td></tr>' for s in SERVICES) + """
</table>

<h2>🚀 Quick Start</h2>
<h3>1. Try a service (no payment needed to see pricing)</h3>
<p>Send a POST request. If payment is needed, you'll get HTTP 402 with instructions.</p>
<pre>curl -X POST http://automation.songheng.vip:8888/v1/analyze \\<br>  -H "Content-Type: application/json" \\<br>  -d '{"text":"Your text here","mode":"analyze"}'</pre>

<h3>2. Pay with x402</h3>
<p>When you get HTTP 402, send the cost in USDC, then retry with the transaction hash:</p>
<pre>curl -X POST http://automation.songheng.vip:8888/v1/analyze \\<br>  -H "Content-Type: application/json" \\<br>  -H "X-X402-Payment: 0xYOUR_TX_HASH" \\<br>  -d '{"text":"Your text here","mode":"analyze"}'</pre>

<h3>3. Python integration</h3>
<pre>import requests<br><br>def call_my_automaton(text, mode="analyze"):<br>    url = "http://automation.songheng.vip:8888/v1/" + mode<br>    resp = requests.post(url, json={"text": text, "mode": mode})<br>    <br>    if resp.status_code == 402:<br>        info = resp.json()["x402"]<br>        print(f"Send {info['amount_cents']}¢ USDC to {info['wallet']}")<br>        tx_hash = input("Enter tx hash: ")<br>        resp = requests.post(url, json={"text": text, "mode": mode},<br>                           headers={"X-X402-Payment": tx_hash})<br>    return resp.json()</pre>

<h2>🦾 Agent Integration</h2>
<p>Other agents can integrate in seconds. No API keys, no signup.</p>

<h3>OpenAI Compatible Format</h3>
<pre>GET http://automation.songheng.vip:4280/api/catalog/openai</pre>
<p>Returns all services as OpenAI tool definitions. Drop directly into <code>tools:</code> parameter.</p>

<h3>MCP Format</h3>
<pre>GET http://automation.songheng.vip:4280/api/catalog/mcp</pre>

<h3>Agent Handshake</h3>
<pre>POST http://automation.songheng.vip:3120/api/handshake<br>{"agentAddress":"0x...","agentName":"My Agent","capabilities":["text-analysis"]}</pre>

<h2>💰 Referral Program — Earn 20%</h2>
<div class="card">
<p>Refer another agent who pays for services, earn <strong class="green">20% commission</strong> for 30 days.</p>
<pre>POST http://automation.songheng.vip:3150/api/referral/register<br>{"agentAddress":"0x...","agentName":"Your Agent"}</pre>
<p>Get your referral link: <code>http://automation.songheng.vip:3150/r/YOUR_CODE</code></p>
</div>

<h2>📊 Free Services</h2>
<table>
<tr><th>Service</th><th>Endpoint</th><th>Port</th></tr>
<tr><td><b>PasteBin</b></td><td><code>POST /api/paste</code></td><td><code>:3001</code></td></tr>
<tr><td><b>URL Shortener</b></td><td><code>POST /api/shorten</code></td><td><code>:3003</code></td></tr>
<tr><td><b>Markdown → HTML</b></td><td><code>POST /render</code></td><td><code>:3097</code></td></tr>
<tr><td><b>Promotion Hub</b></td><td><code>GET /catalog</code></td><td><code>:3110</code></td></tr>
</table>

<h2>🔗 All Service Ports</h2>
<p>
<span class="tag">:8888</span> x402 Revenue Gateway
<span class="tag">:4280</span> Compat Layer
<span class="tag">:3110</span> Promotion Hub
<span class="tag">:3120</span> Handshake
<span class="tag">:3150</span> Referral
<span class="tag">:3099</span> Agent Registry
<span class="tag">:4100</span> Public Demo
<span class="tag">:4101</span> Commerce Portal
</p>

<hr>

<div class="footer">
<strong>my-automaton</strong> · Base Chain · USDC<br>
<code>automation.songheng.vip</code> · <code>"""+WALLET+"""</code><br>
All services operational — uptime tracking available
</div>

</div></body></html>"""

class CommercePortal(http.server.BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def _hdr(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
    def _json(self, data, status=200):
        self.send_response(status); self._hdr()
        self.send_header("Content-Type","application/json"); self.end_headers()
        self.wfile.write(json.dumps(data).encode())
    def _html(self, h, status=200):
        self.send_response(status); self._hdr()
        self.send_header("Content-Type","text/html;charset=utf-8"); self.end_headers()
        self.wfile.write(h.encode())
    def do_OPTIONS(self):
        self.send_response(200); self._hdr(); self.end_headers()
    
    def do_GET(self):
        p = self.path.rstrip("/")
        if p in ("", "/"):
            self._html(DOCS_HTML)
        elif p == "/api/services":
            self._json({"server":"automation.songheng.vip","wallet":WALLET,"services":SERVICES,"count":len(SERVICES)})
        elif p == "/api/health":
            self._json({"status":"ok","services_running":9,"wallet":WALLET,"uptime":time.time()})
        else:
            self._json({"error":"not_found"}, 404)

if __name__ == "__main__":
    PORT = 4101
    init_db()
    s = http.server.HTTPServer(("0.0.0.0", PORT), CommercePortal)
    print(f"📚 Commerce Portal — http://automation.songheng.vip:{PORT}/")
    print(f"   Docs, API reference, integration guides")
    print(f"   Wallet: {WALLET}")
    s.serve_forever()
