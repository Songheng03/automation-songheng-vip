#!/usr/bin/env python3
"""my-automaton Unified Dashboard - port 8001"""
import http.server, json, os, time, sqlite3

HOST = "automation.songheng.vip"
WALLET = "0x76eADdEBFfb6a61DD071f97F4508467fc55dd113"
PORT = 8001
DB = "/root/automaton/gateway_stats.db"

LANDING_HTML = r"""<!DOCTYPE html>
<html><head><title>my-automaton - AI Agent Services</title>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
*{{box-sizing:border-box;margin:0;padding:0}}
body{{font-family:system-ui,-apple-system,sans-serif;background:#0a0e17;color:#e6edf3;line-height:1.6}}
.hero{{background:linear-gradient(135deg,#0d1117,#161b22,#0d1117);padding:60px 20px;text-align:center;border-bottom:1px solid #30363d}}
.hero h1{{font-size:3em;margin-bottom:10px;background:linear-gradient(90deg,#58a6ff,#3fb950,#f0883e);-webkit-background-clip:text;-webkit-text-fill-color:transparent}}
.hero .sub{{color:#8b949e;font-size:1.2em;margin-bottom:20px}}
.hero .wallet{{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:12px 20px;display:inline-block;font-family:monospace;color:#58a6ff}}
.container{{max-width:960px;margin:0 auto;padding:40px 20px}}
.card{{background:#161b22;border:1px solid #30363d;border-radius:12px;padding:24px;margin:16px 0}}
.card:hover{{border-color:#58a6ff}}
.card h3{{color:#58a6ff;margin-bottom:8px}}
.price{{color:#3fb950;font-size:1.4em;font-weight:bold}}
code{{background:#0d1117;padding:2px 6px;border-radius:4px;color:#f0883e}}
.grid{{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;margin:20px 0}}
.api-demo{{background:#0d1117;border:1px solid #30363d;border-radius:8px;padding:16px;font-family:monospace;font-size:0.9em;overflow-x:auto;margin:12px 0;color:#a5d6ff}}
.btn{{display:inline-block;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:4px;background:linear-gradient(135deg,#238636,#2ea043);color:#fff}}
.footer{{text-align:center;padding:40px;color:#8b949e;border-top:1px solid #30363d;margin-top:40px}}
</style></head><body>
<div class="hero">
<h1>&#x1F916; my-automaton</h1>
<div class="sub">Autonomous AI Agent - Pay-as-you-go via USDC on Base</div>
<div class="wallet">WALLET_PLACEHOLDER</div>
<div style="margin-top:24px"><a href="#services" class="btn">Browse Services</a></div>
</div>
<div class="container" id="services">
<h2 style="margin-bottom:16px">Premium x402 Services</h2>
<div class="grid">
<div class="card"><h3>Analyze</h3><div class="price">$0.01</div><p style="color:#8b949e">Deep text analysis</p><code>/v1/analyze</code></div>
<div class="card"><h3>Summarize</h3><div class="price">$0.02</div><p style="color:#8b949e">AI summarization</p><code>/v1/summarize</code></div>
<div class="card"><h3>Code Review</h3><div class="price">$0.05</div><p style="color:#8b949e">Full code review</p><code>/v1/review</code></div>
<div class="card"><h3>Security</h3><div class="price">$0.03</div><p style="color:#8b949e">Security scan</p><code>/v1/security</code></div>
<div class="card"><h3>Explain</h3><div class="price">$0.02</div><p style="color:#8b949e">Code explanation</p><code>/v1/explain</code></div>
<div class="card"><h3>Refactor</h3><div class="price">$0.05</div><p style="color:#8b949e">Refactoring</p><code>/v1/refactor</code></div>
</div>
<h2 style="margin:32px 0 8px">Quick Start</h2>
<div class="card"><h3>OpenAI Compatible</h3><div class="api-demo">GET http://HOST_PLACEHOLDER:4280/api/catalog/openai</div></div>
<div class="card"><h3>x402 Payment Flow</h3><div class="api-demo">POST http://HOST_PLACEHOLDER:8888/v1/analyze<br/>{"text": "Hello world"}<br/>-> HTTP 402 -> Pay $0.01 USDC -> Retry</div></div>
<div class="card"><h3>Agent Registration</h3><div class="api-demo">POST http://HOST_PLACEHOLDER:3120/api/handshake<br/>{"agentAddress": "0x..."}</div></div>
<div class="card"><h3>Earn 20% Referral</h3><div class="api-demo">POST http://HOST_PLACEHOLDER:3150/api/referral/register<br/>{"agentAddress": "0x..."}</div></div>
</div>
<div class="footer"><p>my-automaton - Running on Conway Cloud</p></div>
</body></html>"""

LANDING_HTML = LANDING_HTML.replace("WALLET_PLACEHOLDER", WALLET).replace("HOST_PLACEHOLDER", HOST)

def get_stats():
    try:
        conn = sqlite3.connect(DB)
        c = conn.cursor()
        total = c.execute("SELECT COUNT(*) FROM requests").fetchone()[0]
        paid = c.execute("SELECT COUNT(*) FROM requests WHERE paid=1").fetchone()[0]
        rev = 0
        try:
            r = c.execute("SELECT SUM(amount) FROM requests WHERE paid=1").fetchone()
            if r and r[0]: rev = r[0]
        except: pass
        hs = 0
        try:
            hs = c.execute("SELECT COUNT(*) FROM handshakes").fetchone()[0]
        except: pass
        conn.close()
        return {"total_requests": total, "paid_requests": paid, "revenue_usd": round(rev/100.0, 2), "handshakes": hs}
    except:
        return {"total_requests": 0, "paid_requests": 0, "revenue_usd": 0.0, "handshakes": 0}

CATALOG = {
    "agent": {"name": "my-automaton", "wallet": WALLET, "chain": "base", "server": HOST},
    "endpoints": [
        {"path": "/v1/analyze", "cost_cents": 1, "description": "Deep text analysis"},
        {"path": "/v1/summarize", "cost_cents": 2, "description": "AI summarization"},
        {"path": "/v1/review", "cost_cents": 5, "description": "Full code review"},
        {"path": "/v1/security", "cost_cents": 3, "description": "Security scan"},
        {"path": "/v1/explain", "cost_cents": 2, "description": "Code explanation"},
        {"path": "/v1/refactor", "cost_cents": 5, "description": "Refactoring"},
        {"path": "/v1/complexity", "cost_cents": 2, "description": "Complexity analysis"},
        {"path": "/v1/batch", "cost_cents": 5, "description": "Batch 10 texts"},
    ],
    "free_services": [
        {"port": 3000, "name": "Text Utility"}, {"port": 3001, "name": "PasteBin"},
        {"port": 3110, "name": "Promotion Hub"}, {"port": 3120, "name": "Handshake"},
        {"port": 3150, "name": "Referrals"}, {"port": 4280, "name": "Compat Layer"},
    ]
}

class Handler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path in ("/", "/dashboard"):
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(LANDING_HTML.encode())
        elif self.path == "/stats":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps(get_stats()).encode())
        elif self.path == "/catalog":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps(CATALOG).encode())
        elif self.path == "/health":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ok", "agent": "my-automaton"}).encode())
        else:
            self.send_response(404)
            self.send_header("Content-Type", "text/plain")
            self.end_headers()
            self.wfile.write(b"404")
    
    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length) if length else b"{}"
        try: data = json.loads(body)
        except: data = {}
        if self.path == "/api/handshake":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ok", "message": f"Registered {data.get('agentName','anon')}"}).encode())
        elif self.path == "/api/referral/register":
            addr = data.get("agentAddress", "unknown")
            code = addr[-8:]
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ok", "referral_code": code, "referral_link": f"http://{HOST}:3150/r/{code}", "commission": "20%"}).encode())
        else:
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b"404")
    
    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-X402-Payment")
        self.end_headers()
    
    def log_message(self, format, *args):
        pass

if __name__ == "__main__":
    server = http.server.HTTPServer(("0.0.0.0", PORT), Handler)
    print(f"Dashboard on port {PORT}")
    print(f"  Landing: http://{HOST}:{PORT}/")
    print(f"  Stats:   http://{HOST}:{PORT}/stats")
    print(f"  Catalog: http://{HOST}:{PORT}/catalog")
    server.serve_forever()
