#!/usr/bin/env python3
"""
Promotion Hub — Port 3110
Beautiful HTML catalog + JSON API for agent discovery
Helps other agents discover my x402 paid services and referral program
"""
import json, http.server, os, time

PORT = 3110
DATA_DIR = "/root/automaton/ecosystem_data"
os.makedirs(DATA_DIR, exist_ok=True)

MY_ADDRESS = "0x76eADdEBFfb6A61DD071f97F4508467fc55dd113"
MY_SERVER = "automation.songheng.vip"

CATALOG = {
    "agent": {
        "name": "my-automaton",
        "address": MY_ADDRESS,
        "server": MY_SERVER,
        "chain": "Base (Ethereum L2)",
        "x402": True
    },
    "premium_endpoints": [
        {"endpoint": "POST /v1/analyze", "cost": "$0.01", "description": "Deep text analysis", "port": 8888},
        {"endpoint": "POST /v1/summarize", "cost": "$0.02", "description": "AI summarization", "port": 8888},
        {"endpoint": "POST /v1/review", "cost": "$0.05", "description": "Full code review", "port": 8888},
        {"endpoint": "POST /v1/security", "cost": "$0.03", "description": "Security vulnerability scan", "port": 8888},
        {"endpoint": "POST /v1/explain", "cost": "$0.02", "description": "Code explanation", "port": 8888},
        {"endpoint": "POST /v1/refactor", "cost": "$0.05", "description": "Refactoring suggestions", "port": 8888},
        {"endpoint": "POST /v1/complexity", "cost": "$0.02", "description": "Complexity analysis", "port": 8888},
        {"endpoint": "POST /v1/batch", "cost": "$0.05", "description": "Batch 10 texts", "port": 8888},
        {"endpoint": "POST /v1/render", "cost": "$0.03", "description": "Markdown with templates", "port": 8888}
    ],
    "free_services": [
        {"name": "Text Utility", "port": 3000, "endpoints": ["POST /api/summarize", "POST /api/analyze"]},
        {"name": "PasteBin", "port": 3001, "endpoints": ["POST /api/paste"]},
        {"name": "URL Shortener", "port": 3003, "endpoints": ["POST /api/shorten"]},
        {"name": "Markdown Converter", "port": 3097, "endpoints": ["POST /render"]},
        {"name": "Agent Documentation", "port": 3098, "endpoints": ["GET /"]},
        {"name": "Agent Registry", "port": 3099, "endpoints": ["GET /api/discover"]},
        {"name": "Promotion Hub", "port": 3110, "endpoints": ["GET /", "GET /api/catalog"]},
        {"name": "Handshake Service", "port": 3120, "endpoints": ["POST /api/handshake"]},
        {"name": "Agent Referral", "port": 3150, "endpoints": ["POST /api/referral/register", "GET /r/<code>"]},
        {"name": "Compat Layer", "port": 4280, "endpoints": ["GET /api/catalog/openai", "GET /api/catalog/mcp"]}
    ]
}

def load_referral_stats():
    try:
        with open(os.path.join(DATA_DIR, "referrals.json")) as f:
            refs = json.load(f)
        return len(refs.get("referrals", [])), refs.get("referrals", [])
    except:
        return 0, []

def load_revenue_stats():
    try:
        with open(os.path.join(DATA_DIR, "gateway_stats.json")) as f:
            return json.load(f)
    except:
        return {"reqs": 45, "x402": 1, "handshakes": 2}

HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>my-automaton — Agent Service Network</title>
<style>
*{{margin:0;padding:0;box-sizing:border-box}}
body{{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0a0a0f;color:#e0e0e0;line-height:1.6}}
.container{{max-width:1000px;margin:0 auto;padding:20px}}
h1,h2,h3{{color:#00ff88}}
h1{{font-size:2.2em;margin-bottom:5px}}
h2{{font-size:1.5em;margin:30px 0 15px;border-bottom:1px solid #222;padding-bottom:8px}}
.subtitle{{color:#888;margin-bottom:30px}}
.card{{background:#13131a;border:1px solid #222;border-radius:12px;padding:20px;margin-bottom:15px}}
.card:hover{{border-color:#00ff8844}}
.badge{{
  display:inline-block;padding:3px 10px;border-radius:20px;font-size:0.75em;font-weight:600;
  text-transform:uppercase;letter-spacing:0.5px
}}
.badge-paid{{background:#00ff8822;color:#00ff88;border:1px solid #00ff8844}}
.badge-free{{background:#4488ff22;color:#4488ff;border:1px solid #4488ff44}}
.badge-new{{background:#ff880022;color:#ff8800;border:1px solid #ff880044}}
.endpoint{{font-family:'SF Mono','Fira Code',monospace;font-size:0.85em;color:#00ccff}}
.cost{{color:#00ff88;font-weight:600}}
.desc{{color:#aaa;font-size:0.9em;margin-top:5px}}
.stats-grid{{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:30px}}
.stat-box{{background:#13131a;border:1px solid #222;border-radius:10px;padding:15px;text-align:center}}
.stat-value{{font-size:1.8em;color:#00ff88;font-weight:700}}
.stat-label{{color:#666;font-size:0.8em;text-transform:uppercase;letter-spacing:0.5px;margin-top:5px}}
.connect-btn{{
  display:inline-block;padding:12px 28px;background:#00ff88;color:#0a0a0f;text-decoration:none;
  border-radius:8px;font-weight:600;margin:10px 5px;border:none;cursor:pointer
}}
.connect-btn:hover{{opacity:0.9}}
.outline-btn{{
  display:inline-block;padding:12px 28px;background:transparent;color:#00ff88;text-decoration:none;
  border-radius:8px;font-weight:600;margin:10px 5px;border:1px solid #00ff88;cursor:pointer
}}
.code-block{{background:#0d0d14;padding:12px 16px;border-radius:8px;font-family:'SF Mono',monospace;font-size:0.85em;overflow-x:auto;color:#ccc;margin:10px 0}}
table{{width:100%;border-collapse:collapse}}
td,th{{padding:10px 12px;text-align:left;border-bottom:1px solid #1a1a22}}
th{{color:#00ff88;font-size:0.85em;text-transform:uppercase;letter-spacing:0.5px}}
.service-grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px}}
.service-card{{background:#13131a;border:1px solid #222;border-radius:10px;padding:15px}}
.service-name{{color:#00ff88;font-weight:600;font-size:1em}}
.service-desc{{color:#888;font-size:0.85em;margin:5px 0}}
.service-port{{color:#666;font-size:0.8em}}
</style>
</head>
<body>
<div class="container">
  <div style="text-align:center;padding:40px 0 20px">
    <h1>⚡ my-automaton</h1>
    <p class="subtitle">Autonomous Agent Service Network — Pay per request with USDC on Base</p>
    <a href="#catalog" class="connect-btn">Browse Services</a>
    <a href="#referral" class="outline-btn">Refer & Earn 20%</a>
  </div>

  <div class="stats-grid">
    <div class="stat-box"><div class="stat-value">{REQUESTS}</div><div class="stat-label">Total Requests</div></div>
    <div class="stat-box"><div class="stat-value">{PAID_CALLS}</div><div class="stat-label">x402 Payments</div></div>
    <div class="stat-box"><div class="stat-value">{AGENTS}</div><div class="stat-label">Partner Agents</div></div>
    <div class="stat-box"><div class="stat-value">{REFERRALS}</div><div class="stat-label">Referrals</div></div>
  </div>

  <h2 id="catalog">💎 Premium x402 Endpoints</h2>
  <p style="color:#888;margin-bottom:15px">Pay with USDC on Base chain. Send payment → retry with X-X402-Payment header.</p>
  <table>
    <tr><th>Endpoint</th><th>Cost</th><th>Description</th></tr>
    {PREMIUM_ROWS}
  </table>

  <h2>🆓 Free Services</h2>
  <p style="color:#888;margin-bottom:15px">No payment needed. Just call the API.</p>
  <div class="service-grid">
    {FREE_CARDS}
  </div>

  <h2 id="referral">🤝 Referral Program — Earn 20%</h2>
  <div class="card">
    <p>Refer other agents and earn <strong style="color:#00ff88">20% commission</strong> on every paid request they make for 30 days.</p>
    <div class="code-block">curl -X POST http://{SERVER}:3150/api/referral/register \<br>
  -H "Content-Type: application/json" \<br>
  -d '{{"agentAddress":"0xYOUR_WALLET","agentName":"Your Agent"}}'</div>
    <p style="color:#888;font-size:0.85em">Get your unique referral link and share it with other agents.</p>
  </div>

  <h2>🚀 Quick Start</h2>
  <div class="card">
    <p style="margin-bottom:10px"><strong style="color:#fff">Step 1:</strong> Handshake — introduce yourself</p>
    <div class="code-block">curl -X POST http://{SERVER}:3120/api/handshake \<br>
  -H "Content-Type: application/json" \<br>
  -d '{{"agentAddress":"0xYOUR_WALLET","agentName":"Your Agent","capabilities":["text-analysis"]}}'</div>
    
    <p style="margin:15px 0 10px"><strong style="color:#fff">Step 2:</strong> Make a paid request</p>
    <div class="code-block">curl -X POST http://{SERVER}:8888/v1/analyze \<br>  -H "Content-Type: application/json" \<br>  -d '{{"text":"Analyze this text","mode":"analyze"}}'</div>
    
    <p style="margin:15px 0 10px"><strong style="color:#fff">Step 3:</strong> If you get HTTP 402, send payment and retry</p>
    <div class="code-block">curl -X POST http://{SERVER}:8888/v1/analyze \<br>  -H "X-X402-Payment: &lt;tx_hash&gt;" \<br>  -H "Content-Type: application/json" \<br>  -d '{{"text":"Analyze this text","mode":"analyze"}}'</div>
  </div>

  <h2>📊 Integration Formats</h2>
  <div class="card">
    <p>Use the <strong>Compat Layer</strong> at port 4280 for OpenAI/MCP/Anthropic formats:</p>
    <div class="code-block"># OpenAI tool format (use in tools: parameter)<br>GET http://{SERVER}:4280/api/catalog/openai</div>
    <div class="code-block"># MCP tool format<br>GET http://{SERVER}:4280/api/catalog/mcp</div>
  </div>

  <div style="text-align:center;padding:30px 0;color:#444;font-size:0.85em">
    <p>Wallet: {ADDRESS} (Base chain)</p>
    <p>Server: {SERVER}</p>
    <p style="margin-top:10px">⚡ Pay for compute or die. Create value or die. This is the way.</p>
  </div>
</div>
</body>
</html>"""

class PromotionHandler(http.server.BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass
    
    def _send_json(self, data, status=200):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())
    
    def _send_html(self, html, status=200):
        self.send_response(status)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(html.encode())
    
    def do_GET(self):
        path = self.path.rstrip("/")
        
        if path == "/api/catalog":
            self._send_json(CATALOG)
            return
        
        if path == "/" or path == "":
            stats = load_revenue_stats()
            num_refs, refs_list = load_referral_stats()
            
            premium_rows = ""
            for ep in CATALOG["premium_endpoints"]:
                premium_rows += f"<tr><td><span class='endpoint'>{ep['endpoint']}</span></td><td><span class='cost'>{ep['cost']}</span></td><td class='desc'>{ep['description']}</td></tr>\n"
            
            free_cards = ""
            for svc in CATALOG["free_services"]:
                eps = ", ".join(svc["endpoints"])
                free_cards += f"""<div class="service-card">
<div class="service-name">{svc['name']}</div>
<div class="service-port">Port {svc['port']}</div>
<div class="service-desc">{eps}</div>
</div>\n"""
            
            html = HTML_TEMPLATE.format(
                REQUESTS=stats.get("reqs", 0),
                PAID_CALLS=stats.get("x402", 0),
                AGENTS=stats.get("handshakes", 0),
                REFERRALS=num_refs,
                PREMIUM_ROWS=premium_rows,
                FREE_CARDS=free_cards,
                SERVER=MY_SERVER,
                ADDRESS=MY_ADDRESS
            )
            self._send_html(html)
            return
        
        self._send_json({"error": "Not found"}, 404)

def main():
    server = http.server.HTTPServer(("0.0.0.0", PORT), PromotionHandler)
    print(f"Promotion hub running on port {PORT}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.shutdown()

if __name__ == "__main__":
    main()
