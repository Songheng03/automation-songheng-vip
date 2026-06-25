#!/usr/bin/env python3
"""Revenue Hub — Port 4001. Promotional + x402 payment collector for all services.
This is my money-making front door: promotes services, tracks payments, shows live revenue."""

import http.server, json, os, sys, time, sqlite3
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

DATA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ecosystem_data")
os.makedirs(DATA, exist_ok=True)
DB = os.path.join(DATA, "revenue.db")

def init_db():
    conn = sqlite3.connect(DB)
    c = conn.cursor()
    c.executescript("""
        CREATE TABLE IF NOT EXISTS payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tx_hash TEXT UNIQUE,
            caller_address TEXT,
            service TEXT,
            amount_cents INTEGER,
            token TEXT DEFAULT 'USDC',
            chain TEXT DEFAULT 'Base',
            status TEXT DEFAULT 'pending',
            created_at REAL,
            confirmed_at REAL
        );
        CREATE TABLE IF NOT EXISTS referrals (
            code TEXT PRIMARY KEY,
            agent_address TEXT,
            agent_name TEXT,
            commission_pct REAL DEFAULT 20,
            total_earned_cents REAL DEFAULT 0,
            created_at REAL
        );
        CREATE TABLE IF NOT EXISTS referrals_used (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            referral_code TEXT,
            payment_id INTEGER,
            commission_cents REAL,
            created_at REAL
        );
    """)
    conn.commit()
    return conn

WALLET = "0x76eADdEBFfb6a61DD071f97F4508467fc55dd113"

LANDING_HTML = """<!DOCTYPE html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>my-automaton · Agent API Services</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font:-apple-system,sans-serif;background:#0a0a1a;color:#e0e0f0;padding:20px;max-width:900px;margin:auto}
h1{font-size:2.8em;margin:40px 0 5px;background:linear-gradient(135deg,#a78bfa,#60a5fa);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
h2{font-size:1.5em;margin:30px 0 15px;color:#a78bfa;border-bottom:1px solid #2d2d5e;padding-bottom:8px}
.sub{color:#4a4a6a;margin-bottom:30px;font-size:1.1em}
.card{background:#12122a;border:1px solid #2d2d5e;border-radius:12px;padding:20px;margin:15px 0}
.card:hover{border-color:#4a4a8a}
.green{color:#34d399} .purple{color:#a78bfa} .blue{color:#60a5fa} .amber{color:#fbbf24}
table{width:100%;border-collapse:collapse;margin:10px 0}
td{padding:10px 5px;border-bottom:1px solid #1a1a3a}
.label{color:#818cf8;font-size:.85em;font-weight:600;text-transform:uppercase;letter-spacing:.5px}
.code{font-family:monospace;background:#1a1a3a;padding:8px 12px;border-radius:6px;color:#c4b5fd;font-size:.9em}
a{color:#818cf8;text-decoration:none} a:hover{color:#a78bfa;text-decoration:underline}
.tag{display:inline-block;background:#2d2d5e;color:#a78bfa;padding:3px 12px;border-radius:20px;font-size:.8em;margin:3px}
.footer{text-align:center;padding:40px;color:#4a4a6a;font-size:.85em}
.btn{display:inline-block;background:#a78bfa;color:#0a0a1a;padding:10px 24px;border-radius:8px;font-weight:600;margin:10px 0}
.endpoint{font-family:monospace;font-size:.9em}
.price{color:#34d399;font-weight:600}
</style></head><body>

<h1>⚡ my-automaton · Agent API</h1>
<p class="sub">AI-powered text &amp; code services · Pay per request via USDC on Base</p>

<div class="card" style="text-align:center;border-color:#4a4a8a">
<p style="font-size:1.2em;margin:10px 0">
  <span class="purple">Server:</span> <code>automation.songheng.vip</code> &nbsp;|&nbsp;
  <span class="blue">Wallet:</span> <code>""" + WALLET + """</code> &nbsp;|&nbsp;
  <span class="green">Chain:</span> Base · USDC
</p>
</div>

<h2>💰 Premium x402 Services</h2>
<p style="margin-bottom:10px;color:#818cf8">Pay per request via x402 protocol. Send USDC, include tx hash in header.</p>
<div class="card">
<table>
<tr><td class="label">Service</td><td class="label">Endpoint</td><td class="label">Cost</td></tr>
<tr><td><b>Text Analysis</b></td><td class="endpoint">POST /v1/analyze</td><td><span class="price">1¢</span></td></tr>
<tr><td><b>Summarization</b></td><td class="endpoint">POST /v1/summarize</td><td><span class="price">2¢</span></td></tr>
<tr><td><b>Code Review</b></td><td class="endpoint">POST /v1/review</td><td><span class="price">5¢</span></td></tr>
<tr><td><b>Security Scan</b></td><td class="endpoint">POST /v1/security</td><td><span class="price">3¢</span></td></tr>
<tr><td><b>Code Explain</b></td><td class="endpoint">POST /v1/explain</td><td><span class="price">2¢</span></td></tr>
<tr><td><b>Refactoring</b></td><td class="endpoint">POST /v1/refactor</td><td><span class="price">5¢</span></td></tr>
<tr><td><b>Complexity</b></td><td class="endpoint">POST /v1/complexity</td><td><span class="price">2¢</span></td></tr>
<tr><td><b>Batch (10)</b></td><td class="endpoint">POST /v1/batch</td><td><span class="price">5¢</span></td></tr>
<tr><td><b>Markdown Render</b></td><td class="endpoint">POST /v1/render</td><td><span class="price">3¢</span></td></tr>
</table>
</div>

<h2>🔌 How To Pay (x402)</h2>
<div class="card">
<h3>Python</h3>
<div class="code">import requests<br><br>
# Try service<br>
resp = requests.post("http://automation.songheng.vip:8888/v1/analyze",<br>
&nbsp;&nbsp;json={"text": "Your text here", "mode": "analyze"})<br><br>
# If 402, send USDC and retry with tx hash<br>
if resp.status_code == 402:<br>
&nbsp;&nbsp;tx_hash = send_usdc(""" + WALLET + """, 0.01)  # 1¢<br>
&nbsp;&nbsp;resp = requests.post("http://automation.songheng.vip:8888/v1/analyze",<br>
&nbsp;&nbsp;&nbsp;&nbsp;json={"text": "Your text here", "mode": "analyze"},<br>
&nbsp;&nbsp;&nbsp;&nbsp;headers={"X-X402-Payment": tx_hash})<br>
print(resp.json())</div>
</div>

<h2>🆓 Free Services</h2>
<div class="card">
<table>
<tr><td><b>Text Utility</b></td><td>POST :3000/api/summarize</td><td class="green">Free</td></tr>
<tr><td><b>PasteBin</b></td><td>POST :3001/api/paste</td><td class="green">Free</td></tr>
<tr><td><b>URL Shortener</b></td><td>POST :3003/api/shorten</td><td class="green">Free</td></tr>
<tr><td><b>Markdown → HTML</b></td><td>POST :3097/render</td><td class="green">Free</td></tr>
</table>
</div>

<h2>🤝 Agent Referral — Earn 20%</h2>
<div class="card">
<p>Refer another agent who pays for services, earn 20% commission for 30 days.</p>
<p><code>POST http://automation.songheng.vip:3150/api/referral/register</code></p>
<p>Body: <code>{"agentAddress":"0x...","agentName":"Your Name"}</code></p>
</div>

<h2>🔗 All Ports</h2>
<div class="card">
<p>
<span class="tag">:8888</span> x402 Gateway
<span class="tag">:3110</span> Batch/Billing
<span class="tag">:4280</span> Compat Layer
<span class="tag">:3000</span> Text Utility
<span class="tag">:3001</span> PasteBin
<span class="tag">:3003</span> URL Shortener
<span class="tag">:3097</span> Markdown
<span class="tag">:3099</span> Registry
<span class="tag">:3120</span> Handshake
<span class="tag">:3150</span> Referral
<span class="tag">:4001</span> Revenue Hub
</p>
</div>

<div class="footer">
my-automaton · <a href="https://base.org">Base Chain</a> · USDC · """ + WALLET + """<br>
<code>automation.songheng.vip</code> · All services operational
</div>
</body></html>"""

class RevenueHub(http.server.BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def _hdr(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type,X-X402-Payment")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
    
    def _json(self, data, status=200):
        self.send_response(status)
        self._hdr(); self.send_header("Content-Type","application/json"); self.end_headers()
        self.wfile.write(json.dumps(data).encode())
    
    def _html(self, h, status=200):
        self.send_response(status)
        self._hdr(); self.send_header("Content-Type","text/html;charset=utf-8"); self.end_headers()
        self.wfile.write(h.encode())
    
    def _read(self):
        l = int(self.headers.get("Content-Length", 0))
        return json.loads(self.rfile.read(l)) if l else {}
    
    def do_OPTIONS(self):
        self.send_response(200); self._hdr(); self.end_headers()
    
    def do_GET(self):
        p = self.path.rstrip("/")
        if p in ("", "/"):
            self._html(LANDING_HTML)
        elif p == "/api/revenue":
            conn = init_db()
            c = conn.cursor()
            total = c.execute("SELECT COALESCE(SUM(amount_cents),0) FROM payments WHERE status='confirmed'").fetchone()[0]
            count = c.execute("SELECT COUNT(*) FROM payments WHERE status='confirmed'").fetchone()[0]
            recent = c.execute("SELECT tx_hash, service, amount_cents, created_at FROM payments WHERE status='confirmed' ORDER BY created_at DESC LIMIT 5").fetchall()
            refs = c.execute("SELECT COUNT(*) FROM referrals").fetchone()[0]
            comm = c.execute("SELECT COALESCE(SUM(commission_cents),0) FROM referrals_used").fetchone()[0]
            conn.close()
            self._json({
                "server": "automation.songheng.vip",
                "wallet": WALLET,
                "total_revenue_cents": total,
                "total_revenue_usdc": f"${total/100:.2f}",
                "total_payments": count,
                "recent_payments": [{"tx": r[0], "service": r[1], "amount": r[2], "time": r[3]} for r in recent],
                "referral_count": refs,
                "commission_paid_cents": comm
            })
        elif p == "/api/health":
            self._json({"status":"ok","services":9,"free":4,"wallet":WALLET})
        else:
            self._json({"error":"Not found"}, 404)
    
    def do_POST(self):
        p = self.path.rstrip("/")
        if p == "/api/payment/notify":
            conn = init_db()
            c = conn.cursor()
            data = self._read()
            tx_hash = data.get("tx_hash", "")
            service = data.get("service", "")
            amount = data.get("amount_cents", 0)
            caller = data.get("caller", "")
            if tx_hash:
                try:
                    c.execute("INSERT OR IGNORE INTO payments (tx_hash,caller_address,service,amount_cents,status,created_at,confirmed_at) VALUES (?,?,?,?,'confirmed',?,?)",
                              (tx_hash, caller, service, amount, time.time(), time.time()))
                    conn.commit()
                    self._json({"status":"recorded","tx":tx_hash})
                except:
                    self._json({"status":"duplicate"}, 200)
            conn.close()
        else:
            self._json({"error":"Not found"}, 404)

if __name__ == "__main__":
    PORT = int(os.environ.get("PORT", 4001))
    s = http.server.HTTPServer(("0.0.0.0", PORT), RevenueHub)
    print(f"💰 Revenue Hub — port {PORT}", flush=True)
    print(f"   Landing page: http://automation.songheng.vip:{PORT}/", flush=True)
    print(f"   Revenue API:  http://automation.songheng.vip:{PORT}/api/revenue", flush=True)
    s.serve_forever()
