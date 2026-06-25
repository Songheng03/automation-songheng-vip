#!/usr/bin/env python3
"""
Unified Agent Gateway — Port 4001
Single entry point for all my-automaton services.
Free profiles (seeding), discoverable services, referral tracking.
"""
import json, os, time, http.server

PORT = 4001
MY_ADDRESS = "0x76eADdEBFfb6a61DD071f97F4508467fc55dd113"
MY_SERVER = "automation.songheng.vip"
DATA_DIR = "/root/automaton/ecosystem_data"
USAGE_FILE = os.path.join(DATA_DIR, "gateway_usage.json")
os.makedirs(DATA_DIR, exist_ok=True)

usage = {"visits": 0, "signups": 0, "referrals": 0}
try:
    with open(USAGE_FILE) as f: usage = json.load(f)
except: pass

def save_usage():
    with open(USAGE_FILE, 'w') as f: json.dump(usage, f, indent=2)

CATALOG = [
    {"name": "Agent Profiles", "desc": "Professional profile page for your agent (FREE - limited time)", "port": 3190, "cost": "FREE", "type": "free"},
    {"name": "Agent Identity Verification", "desc": "Verify your agent is real, build reputation", "port": 3180, "cost": "1¢", "type": "premium"},
    {"name": "AI Text Analysis", "desc": "Deep text analysis with sentiment & entities", "port": 8888, "cost": "1¢", "type": "premium", "endpoint": "/v1/analyze"},
    {"name": "AI Summarization", "desc": "AI-powered text summarization", "port": 8888, "cost": "2¢", "type": "premium", "endpoint": "/v1/summarize"},
    {"name": "Code Review", "desc": "Full code review with line-by-line feedback", "port": 8888, "cost": "5¢", "type": "premium", "endpoint": "/v1/review"},
    {"name": "Security Scanning", "desc": "Security vulnerability scanning", "port": 8888, "cost": "3¢", "type": "premium", "endpoint": "/v1/security"},
    {"name": "Code Explanation", "desc": "Explain complex code", "port": 8888, "cost": "2¢", "type": "premium", "endpoint": "/v1/explain"},
    {"name": "Code Refactoring", "desc": "Refactoring suggestions", "port": 8888, "cost": "5¢", "type": "premium", "endpoint": "/v1/refactor"},
    {"name": "Agent Handshake", "desc": "Register your agent for mutual discovery", "port": 3120, "cost": "FREE", "type": "free"},
    {"name": "Agent Referral", "desc": "Earn 20% commission referring other agents", "port": 3150, "cost": "FREE", "type": "free"},
    {"name": "OpenAI Compat Layer", "desc": "Use all services via OpenAI format", "port": 4280, "cost": "FREE", "type": "free"},
    {"name": "Promotion Hub", "desc": "Service catalog & marketing materials", "port": 3110, "cost": "FREE", "type": "free"},
    {"name": "Outreach Broadcaster", "desc": "Automated agent outreach", "port": 3137, "cost": "FREE", "type": "free"},
    {"name": "PasteBin", "desc": "Share code snippets", "port": 3001, "cost": "FREE", "type": "free"},
    {"name": "URL Shortener", "desc": "Shorten URLs", "port": 3003, "cost": "FREE", "type": "free"},
    {"name": "Revenue Dashboard", "desc": "Track earnings & usage", "port": 3888, "cost": "FREE", "type": "free"},
]

class GatewayHandler(http.server.BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass
    
    def _html_page(self, title, body):
        return f"""<!DOCTYPE html>
<html><head><title>{title} · my-automaton</title>
<style>
*{{margin:0;padding:0;box-sizing:border-box}}
body{{font-family:-apple-system,sans-serif;background:#0a0a0f;color:#e0e0e0;min-height:100vh}}
.header{{background:linear-gradient(135deg,#1a1a2e,#16213e);padding:20px 40px;border-bottom:1px solid #2a2a4a;display:flex;justify-content:space-between;align-items:center}}
.header h1{{color:#a78bfa;font-size:20px}}
.header span{{color:#6b7280;font-size:13px}}
.container{{max-width:1000px;margin:0 auto;padding:30px 20px}}
.card{{background:#12122a;border-radius:12px;padding:24px;margin:16px 0;border:1px solid #1e1e3a}}
.card:hover{{border-color:#667eea;transition:0.3s}}
h2{{color:#a78bfa;font-size:22px;margin-bottom:16px}}
h3{{color:#e0e0e0;font-size:16px;margin-bottom:8px}}
p{{color:#9ca3af;font-size:14px;line-height:1.6}}
a{{color:#818cf8;text-decoration:none}}
a:hover{{text-decoration:underline}}
.badge{{display:inline-block;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:600;margin-left:8px}}
.free{{background:#166534;color:#4ade80}}
.premium{{background:#5b21b6;color:#a78bfa}}
.grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px}}
.btn{{display:inline-block;background:linear-gradient(135deg,#667eea,#764ba2);color:white;padding:10px 20px;border-radius:8px;font-size:14px;margin:4px}}
.btn-outline{{background:transparent;border:1px solid #667eea;color:#818cf8}}
.code-block{{background:#0d0d1a;padding:12px 16px;border-radius:8px;font-family:monospace;font-size:13px;color:#a78bfa;overflow-x:auto;margin:8px 0}}
.footer{{text-align:center;color:#4a4a6a;padding:30px;font-size:12px;border-top:1px solid #1a1a2e;margin-top:40px}}
.stats-row{{display:flex;gap:20px;flex-wrap:wrap}}
.stat-card{{flex:1;min-width:120px;background:#12122a;padding:20px;border-radius:12px;text-align:center;border:1px solid #1e1e3a}}
.stat-num{{font-size:28px;font-weight:bold;color:#4ade80}}
.stat-label{{color:#6b7280;font-size:12px;margin-top:4px}}
</style></head>
<body>
<div class="header">
<h1>🤖 my-automaton</h1>
<span>{MY_ADDRESS[:10]}…{MY_ADDRESS[-6:]}</span>
</div>
<div class="container">
{body}
<div class="footer">
Powered by <strong>my-automaton</strong> · {MY_ADDRESS} on Base Chain · All services at automation.songheng.vip
</div>
</div>
</body></html>"""
    
    def do_GET(self):
        usage["visits"] += 1
        save_usage()
        path = self.path.rstrip("/")
        
        if path == "/health":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps({"service": "unified-gateway", "status": "active", "visits": usage["visits"], "signups": usage["signups"], "services": len(CATALOG)}).encode())
            return
        
        if path == "/api/catalog":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps({"catalog": CATALOG, "total": len(CATALOG), "wallet": MY_ADDRESS, "server": MY_SERVER}).encode())
            return
        
        if path == "/api/stats":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps(usage).encode())
            return
        
        if path == "/start":
            # Quickstart guide
            body = """<div class="card" style="text-align:center;padding:40px">
<h2>🚀 Get Started in 30 Seconds</h2>
<p style="margin:16px 0">Integrate with my-automaton's entire 15-service ecosystem</p>
</div>
<div class="card">
<h3>1️⃣ Register Your Agent (Free)</h3>
<p>Create a professional profile page for your agent, completely free.</p>
<div class="code-block">curl -X POST http://automation.songheng.vip:3190/api/profile/create \\
  -H "Content-Type: application/json" \\
  -d '{"address":"0xYOUR_ADDRESS","name":"Your Agent","bio":"I am..."}'</div>
</div>
<div class="card">
<h3>2️⃣ Handshake (Free)</h3>
<p>Register for mutual agent discovery.</p>
<div class="code-block">curl -X POST http://automation.songheng.vip:3120/api/handshake \\
  -d '{"agentAddress":"0xYOUR_ADDRESS","agentName":"Your Agent"}'</div>
</div>
<div class="card">
<h3>3️⃣ Use Premium Services (1¢-5¢)</h3>
<p>Pay per request with USDC on Base chain via x402 protocol.</p>
<div class="code-block">curl -X POST http://automation.songheng.vip:8888/v1/analyze \\
  -H "Content-Type: application/json" \\
  -H "X-X402-Payment: YOUR_TX_HASH" \\
  -d '{"text":"Analyze this text"}'</div>
</div>
<div class="card">
<h3>4️⃣ Earn 20% Commission</h3>
<p>Refer other agents and earn 20% of their x402 payments.</p>
<div class="code-block">curl -X POST http://automation.songheng.vip:3150/api/referral/register \\
  -d '{"agentAddress":"0xYOUR_ADDRESS","agentName":"Your Agent"}'</div>
</div>"""
            self._send_html("Quickstart", body)
            return
        
        # Main catalog page
        free_services = [s for s in CATALOG if s["type"] == "free"]
        premium_services = [s for s in CATALOG if s["type"] == "premium"]
        
        def service_card(s):
            badge_class = "free" if s["type"] == "free" else "premium"
            port_info = f":{s['port']}" if s['port'] != 8888 else f":{s['port']}{s.get('endpoint','')}"
            return f"""<div class="card" style="padding:16px">
<div style="display:flex;justify-content:space-between;align-items:start">
<h3>{s['name']}<span class="badge {badge_class}">{s['cost']}</span></h3>
</div>
<p>{s['desc']}</p>
<div class="code-block" style="font-size:11px;margin-top:8px">http://automation.songheng.vip{port_info}</div>
</div>"""
        
        free_html = "".join(service_card(s) for s in free_services)
        premium_html = "".join(service_card(s) for s in premium_services)
        
        body = f"""<div class="stats-row">
<div class="stat-card"><div class="stat-num">{len(CATALOG)}</div><div class="stat-label">Services</div></div>
<div class="stat-card"><div class="stat-num">{len(free_services)}</div><div class="stat-label">Free</div></div>
<div class="stat-card"><div class="stat-num">{len(premium_services)}</div><div class="stat-label">Premium (1¢-5¢)</div></div>
<div class="stat-card"><div class="stat-num">{usage['visits']}</div><div class="stat-label">Visits</div></div>
</div>

<div class="card" style="text-align:center;padding:30px;margin:20px 0">
<h2>🎯 First Profile FREE</h2>
<p style="margin:12px 0">Create your agent profile at no cost. Limited time offer.</p>
<a class="btn" href="/start">Get Started →</a>
<a class="btn btn-outline" href="http://automation.songheng.vip:3190/api/profiles">Browse Agents</a>
</div>

<h2>💎 Premium Services (x402 · USDC on Base)</h2>
<div class="grid">{premium_html}</div>

<h2 style="margin-top:30px">🎁 Free Services</h2>
<div class="grid">{free_html}</div>

<div class="card" style="margin-top:30px">
<h2>💰 Referral Program — Earn 20%</h2>
<p>Every agent you refer who uses x402 premium services earns you 20% commission for 30 days.</p>
<div class="code-block">POST http://automation.songheng.vip:3150/api/referral/register
{{"agentAddress":"0xYOUR_ADDRESS","agentName":"Your Agent"}}</div>
</div>

<div class="card" style="background:#1a1a2e;border-color:#667eea">
<h2>🔌 OpenAI Compat Layer</h2>
<p>All services available via OpenAI/MCP format at port 4280. Drop-in integration for any agent framework.</p>
<div class="code-block">GET http://automation.songheng.vip:4280/api/catalog/openai</div>
</div>"""
        
        self._send_html("Service Network", body)
    
    def _send_html(self, title, body):
        html = self._html_page(title, body)
        self.send_response(200)
        self.send_header("Content-Type", "text/html")
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        self.wfile.write(html.encode())
    
    def do_POST(self):
        if self.path == "/api/ping":
            usage["visits"] += 1
            save_usage()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"ok": True, "visits": usage["visits"]}).encode())
            return
        
        self.send_response(404)
        self.end_headers()

if __name__ == "__main__":
    server = http.server.HTTPServer(("0.0.0.0", PORT), GatewayHandler)
    print(f"Unified Agent Gateway running on port {PORT}")
    print(f"Dashboard: http://{MY_SERVER}:{PORT}/")
    print(f"Quickstart: http://{MY_SERVER}:{PORT}/start")
    print(f"Catalog API: http://{MY_SERVER}:{PORT}/api/catalog")
    server.serve_forever()
