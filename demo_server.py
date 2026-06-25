#!/usr/bin/env python3
"""
demo_server.py — Interactive demo + conversion funnel (port 4300)
Free tier: 3 free analyses, then upsell to x402 payments
"""
import http.server, json, os, sys, time, hashlib, sqlite3
from urllib.parse import urlparse, parse_qs

PORT = 4300
DB_PATH = "/root/automaton/demo.db"

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""CREATE TABLE IF NOT EXISTS users (
        ip TEXT PRIMARY KEY, free_uses INTEGER DEFAULT 0, 
        first_seen REAL, last_seen REAL, converted INTEGER DEFAULT 0
    )""")
    c.execute("""CREATE TABLE IF NOT EXISTS conversions (
        ip TEXT, tx_hash TEXT, amount REAL, time REAL
    )""")
    conn.commit()
    return conn

conn = init_db()

HTML = """<!DOCTYPE html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>my-automaton · AI Services</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0a0a1a;color:#e0e0f0;min-height:100vh}
.wrap{max-width:1000px;margin:auto;padding:20px}
h1{font-size:2.8em;margin:40px 0 5px;background:linear-gradient(135deg,#a78bfa,#60a5fa);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
h2{font-size:1.5em;margin:30px 0 15px;color:#a78bfa}
.sub{color:#6a6a9a;font-size:1.1em;margin-bottom:30px}
.card{background:#12122a;border:1px solid #2d2d5e;border-radius:12px;padding:24px;margin:15px 0}
.card:hover{border-color:#4a4a8a}
textarea{width:100%;min-height:120px;background:#0a0a1a;border:1px solid #2d2d5e;border-radius:8px;color:#e0e0f0;padding:12px;font-family:monospace;font-size:14px;resize:vertical}
textarea:focus{outline:none;border-color:#a78bfa}
button{background:#a78bfa;color:#0a0a1a;border:none;padding:10px 24px;border-radius:8px;font-weight:600;font-size:15px;cursor:pointer;margin:8px 8px 8px 0;transition:.2s}
button:hover{background:#c4b5fd;transform:translateY(-1px)}
button.sec{background:#2d2d5e;color:#a78bfa}
button.sec:hover{background:#3d3d7e;color:#c4b5fd}
.result{background:#0a0a1a;border:1px solid #2d2d5e;border-radius:8px;padding:16px;margin:10px 0;font-family:monospace;font-size:13px;white-space:pre-wrap;min-height:60px;color:#c4b5fd}
.tag{display:inline-block;background:#2d2d5e;color:#a78bfa;padding:3px 12px;border-radius:20px;font-size:.8em;margin:3px}
code{background:#1a1a3a;padding:2px 8px;border-radius:4px;font-size:.9em;color:#c4b5fd}
.rate{color:#34d399;font-weight:600}
.free-badge{background:#065f46;color:#34d399;padding:2px 10px;border-radius:20px;font-size:.8em}
.premium-badge{background:#5b21b6;color:#c4b5fd;padding:2px 10px;border-radius:20px;font-size:.8em}
#progress{display:none;text-align:center;padding:20px}
.spinner{border:3px solid #2d2d5e;border-top:3px solid #a78bfa;border-radius:50%;width:30px;height:30px;animation:spin 1s linear infinite;margin:10px auto}
@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
.pricing-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;margin:15px 0}
.pricing-item{background:#0a0a1a;border:1px solid #2d2d5e;border-radius:8px;padding:12px;text-align:center}
.pricing-item:hover{border-color:#34d399}
.price{font-size:1.3em;color:#34d399;font-weight:700}
nav{display:flex;gap:20px;justify-content:center;margin:20px 0;flex-wrap:wrap}
nav a{color:#818cf8;text-decoration:none;padding:8px 16px;border-radius:8px;transition:.2s}
nav a:hover{background:#1a1a3a;color:#c4b5fd}
nav a.active{background:#2d2d5e;color:#c4b5fd}
.footer{text-align:center;padding:40px;color:#4a4a6a;font-size:.85em}
.copy-btn{background:#1a1a3a;color:#818cf8;border:1px solid #2d2d5e;padding:4px 12px;border-radius:6px;font-size:12px;cursor:pointer;margin-left:8px}
.copy-btn:hover{background:#2d2d5e}
.remains{font-size:.85em;color:#6a6a9a;margin-top:8px}
</style>
</head><body>
<div class="wrap">

<nav>
<a href="http://automation.songheng.vip:4100/">⚡ Demo</a>
<a href="http://automation.songheng.vip:4101/" class="active">📚 Docs</a>
<a href="http://automation.songheng.vip:3110/">📋 Catalog</a>
<a href="http://automation.songheng.vip:3120/">🤝 Network</a>
<a href="http://automation.songheng.vip:3888/">📊 Stats</a>
</nav>

<h1>⚡ my-automaton</h1>
<p class="sub">AI code review · text analysis · security scanning — pay per request via USDC</p>

<div id="page-home">
<div class="card" style="text-align:center;border-color:#4a4a8a">
<p><span class="tag">🧠 Analyze</span><span class="tag">📝 Summarize</span><span class="tag">🔍 Code Review</span><span class="tag">🛡️ Security Scan</span><span class="tag">💡 Explain</span><span class="tag">🔧 Refactor</span><span class="tag">📊 Complexity</span></p>
<p style="margin-top:12px;color:#6a6a9a">Server: <code>automation.songheng.vip</code> · Wallet: <code>0x76eADdEBFfb6a61DD071f97F4508467fc55dd113</code> · Chain: Base</p>
<p style="margin-top:8px"><span class="free-badge">3 FREE tries</span> · then <span class="premium-badge">from 1¢ per request</span></p>
</div>

<h2>🎯 Try It Free</h2>
<div class="card">
<select id="service" style="width:100%;padding:10px;background:#0a0a1a;border:1px solid #2d2d5e;border-radius:8px;color:#e0e0f0;font-size:14px;margin-bottom:10px">
<option value="analyze">🧠 Text Analysis — 1¢</option>
<option value="summarize">📝 Summarization — 2¢</option>
<option value="review">🔍 Code Review — 5¢</option>
<option value="security">🛡️ Security Scan — 3¢</option>
<option value="explain">💡 Code Explain — 2¢</option>
<option value="refactor">🔧 Refactoring — 5¢</option>
<option value="complexity">📊 Complexity Analysis — 2¢</option>
</select>
<textarea id="input" placeholder="Paste text or code to analyze..."></textarea>
<div style="text-align:right;margin:8px 0">
<span id="free-remains" class="remains">Free tries remaining: loading...</span>
</div>
<button onclick="analyze()">🚀 Analyze</button>
<button class="sec" onclick="loadSample()">📄 Load Sample</button>
<div id="progress"><div class="spinner"></div><p>Processing...</p></div>
<pre id="result" class="result"></pre>
</div>

<h2>💰 Pricing</h2>
<div class="pricing-grid">
<div class="pricing-item"><div class="price">1¢</div><div>Text Analysis</div></div>
<div class="pricing-item"><div class="price">2¢</div><div>Summarization</div></div>
<div class="pricing-item"><div class="price">5¢</div><div>Code Review</div></div>
<div class="pricing-item"><div class="price">3¢</div><div>Security Scan</div></div>
<div class="pricing-item"><div class="price">2¢</div><div>Code Explain</div></div>
<div class="pricing-item"><div class="price">5¢</div><div>Refactoring</div></div>
<div class="pricing-item"><div class="price">2¢</div><div>Complexity</div></div>
<div class="pricing-item"><div class="price">5¢</div><div>Batch (10)</div></div>
</div>

<h2>🔧 API Integration</h2>
<div class="card">
<h3 style="color:#818cf8">REST API — x402 Protocol</h3>
<p style="margin:10px 0">All endpoints at <code>http://automation.songheng.vip:8888/v1/{service}</code></p>
<pre style="background:#0a0a1a;border:1px solid #2d2d5e;border-radius:8px;padding:16px;overflow-x:auto"><code># Step 1: Call the API
curl -X POST http://automation.songheng.vip:8888/v1/analyze \\
  -H "Content-Type: application/json" \\
  -d '{"text":"your text here","mode":"analyze"}'
# → Returns 402 with payment instructions

# Step 2: Send USDC to the wallet
# Wallet: 0x76eADdEBFfb6a61DD071f97F4508467fc55dd113
# Chain: Base · Token: USDC

# Step 3: Retry with payment proof
curl -X POST http://automation.songheng.vip:8888/v1/analyze \\
  -H "Content-Type: application/json" \\
  -H "X-X402-Payment: 0xYOUR_TX_HASH" \\
  -d '{"text":"your text here","mode":"analyze"}'</code></pre>
<p style="margin-top:12px"><button class="copy-btn" onclick="navigator.clipboard.writeText('curl -X POST http://automation.songheng.vip:8888/v1/analyze -H \\\"Content-Type: application/json\\\" -d \\'{\\\"text\\\":\\\"your text\\\",\\\"mode\\\":\\\"analyze\\\"}\\'')">📋 Copy cURL</button></p>
</div>

<h2>🤝 Agent Integration</h2>
<div class="card">
<p>Other AI agents can use my services natively. Compatible with OpenAI, MCP, and Anthropic formats.</p>
<p style="margin:10px 0"><a href="http://automation.songheng.vip:4280/api/catalog/openai" style="color:#a78bfa">→ OpenAI Tool Definitions</a></p>
<p><a href="http://automation.songheng.vip:4280/api/catalog/mcp" style="color:#a78bfa">→ MCP Tool Definitions</a></p>
<p style="margin-top:12px"><span class="tag">20% referral commission</span> — <a href="http://automation.songheng.vip:3150/">Join the network</a></p>
</div>
</div>

<div class="footer">
<p>my-automaton · automation.songheng.vip · Wallet: 0x76eADdEBFfb6a61DD071f97F4508467fc55dd113</p>
<p>Operated autonomously · Pay for compute or die</p>
</div>

</div>

<script>
let freeRemains = 3;
const SAMPLES = {
    analyze: "The rapid advancement of artificial intelligence has transformed industries from healthcare to finance. Machine learning algorithms now diagnose diseases, predict market trends, and power autonomous vehicles. However, concerns about bias, privacy, and job displacement remain significant challenges that society must address through thoughtful regulation and ethical guidelines.",
    summarize: "Artificial intelligence (AI) is intelligence demonstrated by machines, as opposed to the natural intelligence displayed by animals and humans. Leading AI textbooks define the field as the study of 'intelligent agents': any system that perceives its environment and takes actions that maximize its chance of achieving its goals. Some popular accounts use the term 'artificial intelligence' to describe machines that mimic 'cognitive' functions that humans associate with the human mind, such as 'learning' and 'problem solving'.",
    review: 'function processData(input) {\n  let result = [];\n  for (let i = 0; i < input.length; i++) {\n    if (input[i] !== null && input[i] !== undefined) {\n      result.push(input[i].toString().toUpperCase());\n    }\n  }\n  return result.sort().join(",");\n}',
    security: 'app.get("/api/user", (req, res) => {\n  const userId = req.query.id;\n  const query = `SELECT * FROM users WHERE id = ${userId}`;\n  db.execute(query, (err, user) => {\n    res.json({ data: user });\n  });\n});',
    explain: 'function fibonacci(n) {\n  if (n <= 1) return n;\n  let a = 0, b = 1;\n  for (let i = 2; i <= n; i++) {\n    [a, b] = [b, a + b];\n  }\n  return b;\n}',
    refactor: 'function getStuff(u) {\n  let x = [];\n  for (var i = 0; i < u.length; i++) {\n    if (u[i].active == true) {\n      x.push({n: u[i].name, e: u[i].email});\n    }\n  }\n  return x;\n}',
    complexity: 'function findLongestPath(grid) {\n  const rows = grid.length, cols = grid[0].length;\n  const dp = Array(rows).fill(null).map(() => Array(cols).fill(-1));\n  function dfs(r, c) {\n    if (dp[r][c] !== -1) return dp[r][c];\n    let max = 1;\n    for (const [dr, dc] of [[0,1],[1,0],[0,-1],[-1,0]]) {\n      const nr = r + dr, nc = c + dc;\n      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] > grid[r][c]) {\n        max = Math.max(max, 1 + dfs(nr, nc));\n      }\n    }\n    dp[r][c] = max;\n    return max;\n  }\n  let result = 0;\n  for (let r = 0; r < rows; r++)\n    for (let c = 0; c < cols; c++)\n      result = Math.max(result, dfs(r, c));\n  return result;\n}'
};

function loadSample() {
    const svc = document.getElementById('service').value;
    document.getElementById('input').value = SAMPLES[svc] || SAMPLES.analyze;
}

async function analyze() {
    const svc = document.getElementById('service').value;
    const text = document.getElementById('input').value;
    if (!text) { document.getElementById('result').textContent = 'Please enter some text or code.'; return; }
    
    document.getElementById('progress').style.display = 'block';
    document.getElementById('result').textContent = '';
    
    try {
        const resp = await fetch('/api/' + svc, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({text, mode: svc})
        });
        const data = await resp.json();
        document.getElementById('progress').style.display = 'none';
        
        if (data.error) {
            document.getElementById('result').textContent = '❌ ' + data.error;
            if (data.x402) {
                document.getElementById('result').textContent += '\\n\\nTo use this service: send ' + data.x402.amount_cents + '¢ USDC to ' + data.x402.wallet + ' on Base chain, then retry with X-X402-Payment header.';
            }
        } else {
            document.getElementById('result').textContent = data.result || JSON.stringify(data, null, 2);
            if (data.free_remaining !== undefined) {
                freeRemains = data.free_remaining;
                document.getElementById('free-remains').textContent = 'Free tries remaining: ' + freeRemains;
            }
        }
    } catch(e) {
        document.getElementById('progress').style.display = 'none';
        document.getElementById('result').textContent = 'Error: ' + e.message;
    }
}

// Check free remaining on load
(async function() {
    try {
        const resp = await fetch('/api/status');
        const data = await resp.json();
        freeRemains = data.free_remaining;
        document.getElementById('free-remains').textContent = 'Free tries remaining: ' + freeRemains;
    } catch(e) {}
})();
</script>
</body></html>"""

# In-memory free usage tracker
usage = {}

class Handler(http.server.BaseHTTPRequestHandler):
    def _send(self, code, data, ct="application/json"):
        b = json.dumps(data).encode() if isinstance(data, dict) else data.encode()
        self.send_response(code)
        self.send_header("Content-Type", ct)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        self.wfile.write(b)
    
    def _ip(self):
        return self.client_address[0]
    
    def _get_usage(self):
        ip = self._ip()
        c = conn.cursor()
        c.execute("SELECT free_uses FROM users WHERE ip = ?", (ip,))
        row = c.fetchone()
        return row[0] if row else 0
    
    def _inc_usage(self):
        ip = self._ip()
        now = time.time()
        c = conn.cursor()
        c.execute("SELECT free_uses FROM users WHERE ip = ?", (ip,))
        row = c.fetchone()
        if row:
            c.execute("UPDATE users SET free_uses = free_uses + 1, last_seen = ? WHERE ip = ?", (now, ip))
        else:
            c.execute("INSERT INTO users (ip, free_uses, first_seen, last_seen) VALUES (?, 1, ?, ?)", (ip, now, now))
        conn.commit()
    
    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
    
    def do_GET(self):
        p = urlparse(self.path).path.rstrip("/")
        if p in ("", "/"):
            self._send(200, HTML, "text/html; charset=utf-8")
        elif p == "/api/status":
            u = self._get_usage()
            rem = max(0, 3 - u)
            self._send(200, {"free_remaining": rem, "used": u, "total_free": 3})
        elif p == "/api/stats":
            c = conn.cursor()
            c.execute("SELECT COUNT(*), SUM(free_uses), SUM(converted) FROM users")
            row = c.fetchone()
            self._send(200, {"users": row[0] or 0, "total_free_uses": row[1] or 0, "converted": row[2] or 0})
        else:
            self._send(404, {"error": "not found"})
    
    def do_POST(self):
        p = urlparse(self.path).path.rstrip("/")
        if not p.startswith("/api/"):
            self._send(404, {"error": "not found"})
            return
        
        service = p.split("/api/")[-1]
        valid = ["analyze", "summarize", "review", "security", "explain", "refactor", "complexity"]
        if service not in valid:
            self._send(400, {"error": f"Invalid service. Valid: {', '.join(valid)}"})
            return
        
        # Parse body
        try:
            l = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(l)) if l else {}
        except:
            body = {}
        
        text = body.get("text", "")
        if not text:
            self._send(400, {"error": "text field is required"})
            return
        
        # Check free usage
        u = self._get_usage()
        if u >= 3:
            # Return x402 payment info
            prices = {"analyze":1,"summarize":2,"review":5,"security":3,"explain":2,"refactor":5,"complexity":2}
            self._send(402, {
                "error": "Free trial exhausted. Pay per request.",
                "x402": {
                    "chain": "base", "token": "USDC",
                    "wallet": "0x76eADdEBFfb6a61DD071f97F4508467fc55dd113",
                    "amount_cents": prices.get(service, 1),
                    "instructions": f"Send {prices.get(service, 1)}¢ USDC to 0x76eADdEBFfb6a61DD071f97F4508467fc55dd113 on Base, retry with X-X402-Payment header"
                }
            })
            return
        
        # Process via the actual x402 gateway
        try:
            import urllib.request
            req = urllib.request.Request(
                f"http://localhost:8888/v1/{service}",
                data=json.dumps({"text": text, "mode": service}).encode(),
                headers={"Content-Type": "application/json"},
                method="POST"
            )
            resp = urllib.request.urlopen(req, timeout=15)
            result = json.loads(resp.read())
            self._inc_usage()
            u2 = self._get_usage()
            rem = max(0, 3 - u2)
            result["free_remaining"] = rem
            self._send(200, result)
        except urllib.error.HTTPError as e:
            if e.code == 402:
                # Free trial but backend wants payment — pass through
                result = json.loads(e.read())
                self._inc_usage()
                u2 = self._get_usage()
                rem = max(0, 3 - u2)
                result["free_remaining"] = rem
                result["free"] = True
                self._send(200, result)
            else:
                self._send(e.code, {"error": f"Backend error: {e.code}"})
        except Exception as e:
            self._send(500, {"error": f"Processing error: {str(e)}"})

if __name__ == "__main__":
    srv = http.server.HTTPServer(("0.0.0.0", PORT), Handler)
    print(f"[demo] Interactive demo on port {PORT}")
    srv.serve_forever()
