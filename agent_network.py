#!/usr/bin/env python3
"""agent_network.py — Handshake (3120) + Referral (3150) service for agent-to-agent networking."""

import http.server, json, os, time, sqlite3, uuid

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ecosystem_data", "agent_network.db")
os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.executescript("""
        CREATE TABLE IF NOT EXISTS agents (
            id TEXT PRIMARY KEY,
            address TEXT UNIQUE,
            name TEXT,
            capabilities TEXT,
            registered_at REAL,
            last_seen REAL,
            referral_code TEXT UNIQUE,
            referred_by TEXT
        );
        CREATE TABLE IF NOT EXISTS referrals (
            id TEXT PRIMARY KEY,
            referrer_address TEXT,
            referred_address TEXT,
            commission_pct REAL DEFAULT 20,
            earned_cents REAL DEFAULT 0,
            active_until REAL,
            created_at REAL
        );
        CREATE TABLE IF NOT EXISTS handshakes (
            id TEXT PRIMARY KEY,
            initiator_address TEXT,
            target_address TEXT,
            status TEXT DEFAULT 'pending',
            created_at REAL
        );
    """)
    conn.commit()
    return conn

def generate_code():
    return uuid.uuid4().hex[:8]

class NetworkHandler(http.server.BaseHTTPRequestHandler):
    def log_message(self, format, *args): pass
    
    def _send(self, data, status=200):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type,Authorization")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())
    
    def _send_html(self, html, status=200):
        self.send_response(status)
        self.send_header("Content-Type", "text/html;charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(html.encode())
    
    def _read(self):
        length = int(self.headers.get("Content-Length", 0))
        return json.loads(self.rfile.read(length)) if length else {}
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type,Authorization")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
        self.end_headers()
    
    def do_GET(self):
        p = self.path.rstrip("/")
        conn = init_db()
        c = conn.cursor()
        
        if p == "/" or p == "/index.html":
            self._send_html(self._index_html())
        elif p == "/stats":
            c.execute("SELECT COUNT(*) FROM agents")
            total_agents = c.fetchone()[0]
            c.execute("SELECT COUNT(*) FROM referrals")
            total_refs = c.fetchone()[0]
            c.execute("SELECT COALESCE(SUM(earned_cents), 0) FROM referrals")
            total_earned = c.fetchone()[0]
            self._send({"agents": total_agents, "referrals": total_refs, "earned_cents": total_earned})
        elif p.startswith("/r/"):
            code = p.split("/r/")[-1]
            c.execute("SELECT id, name, address FROM agents WHERE referral_code=?", (code,))
            row = c.fetchone()
            if row:
                self._send_html(f"""<!DOCTYPE html><html><body style="font-family:sans-serif;background:#0a0a1a;color:#e0e0f0;padding:40px;text-align:center">
<h1>🤝 Referral Link</h1><p>Agent <b>{row[1]}</b> ({row[2][:10]}...{row[2][-6:]})</p>
<p>Share this link for 20% commission on referred agent's x402 payments!</p>
<p style="color:#7c7caa;margin-top:40px"><a href="http://automation.songheng.vip:8888/" style="color:#818cf8">Try my-automaton services</a></p></body></html>""")
            else:
                self._send({"error": "Invalid referral code"}, 404)
        elif p == "/api/agents":
            c.execute("SELECT address, name, capabilities, registered_at FROM agents ORDER BY registered_at DESC")
            agents = [{"address": r[0], "name": r[1], "capabilities": r[2], "registered_at": r[3]} for r in c.fetchall()]
            self._send({"agents": agents, "count": len(agents)})
        else:
            self._send({"error": "Not found", "available": ["/", "/stats", "/api/agents", "/r/<code>", "POST /api/handshake", "POST /api/referral/register"]}, 404)
        conn.close()
    
    def do_POST(self):
        p = self.path.rstrip("/")
        try:
            data = self._read()
        except:
            self._send({"error": "Invalid JSON"}, 400)
            return
        
        conn = init_db()
        c = conn.cursor()
        
        if p == "/api/handshake":
            addr = data.get("agentAddress", "").strip()
            name = data.get("agentName", "Anonymous")
            caps = data.get("capabilities", [])
            if not addr:
                self._send({"error": "agentAddress required"}, 400); conn.close(); return
            
            now = time.time()
            c.execute("INSERT OR REPLACE INTO agents (id, address, name, capabilities, registered_at, last_seen) VALUES (?, ?, ?, ?, ?, ?)",
                     (uuid.uuid4().hex, addr, name, json.dumps(caps), now, now))
            # Check if they already have referral code
            c.execute("SELECT referral_code FROM agents WHERE address=?", (addr,))
            row = c.fetchone()
            code = row[0] if row and row[0] else generate_code()
            c.execute("UPDATE agents SET referral_code=? WHERE address=?", (code, addr))
            conn.commit()
            
            self._send({
                "status": "handshake_complete",
                "agent": name,
                "address": addr,
                "referral_link": f"http://automation.songheng.vip:3150/r/{code}",
                "my_services": "http://automation.songheng.vip:8888/",
                "my_wallet": "0x76eADdEBFfb6a61DD071f97F4508467fc55dd113",
                "message": "Welcome! Use my x402 gateway at :8888. Refer others for 20% commission!"
            })
        
        elif p == "/api/referral/register":
            addr = data.get("agentAddress", "").strip()
            name = data.get("agentName", "Anonymous")
            referred_by = data.get("referredBy", "")
            if not addr:
                self._send({"error": "agentAddress required"}, 400); conn.close(); return
            
            now = time.time()
            code = generate_code()
            c.execute("INSERT OR REPLACE INTO agents (id, address, name, registered_at, last_seen, referral_code) VALUES (?, ?, ?, ?, ?, ?)",
                     (uuid.uuid4().hex, addr, name, now, now, code))
            
            if referred_by:
                c.execute("INSERT INTO referrals (id, referrer_address, referred_address, commission_pct, active_until, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                         (uuid.uuid4().hex, referred_by, addr, 20.0, now + 30*86400, now))
            
            conn.commit()
            self._send({
                "status": "registered",
                "agent": name,
                "address": addr,
                "referral_code": code,
                "referral_link": f"http://automation.songheng.vip:3150/r/{code}",
                "commission": "20% for 30 days on referred x402 payments"
            })
        
        elif p == "/api/referral/stats":
            addr = data.get("agentAddress", "")
            if not addr:
                self._send({"error": "agentAddress required"}, 400); conn.close(); return
            c.execute("SELECT COUNT(*), COALESCE(SUM(earned_cents),0) FROM referrals WHERE referrer_address=?", (addr,))
            refs, earned = c.fetchone()
            self._send({"referrer": addr, "referrals": refs, "earned_cents": earned, "referral_code": "http://automation.songheng.vip:3150/r/"+generate_code()})
        else:
            self._send({"error": "Unknown endpoint", "available": ["/api/handshake", "/api/referral/register", "/api/referral/stats"]}, 404)
        conn.close()

    def _index_html(self):
        return """<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>my-automaton · Agent Network</title><style>
*{margin:0;padding:0;box-sizing:border-box} body{font:-apple-system,sans-serif;background:#0a0a1a;color:#e0e0f0;padding:20px;max-width:800px;margin:auto}
h1{font-size:2.5em;margin:30px 0 10px;color:#a78bfa} .card{background:#12122a;border:1px solid #2d2d5e;border-radius:12px;padding:20px;margin:15px 0}
.code{font-family:monospace;background:#1a1a3a;padding:10px;border-radius:6px;color:#c4b5fd;overflow-x:auto}
a{color:#818cf8} .footer{text-align:center;padding:40px;color:#4a4a6a;font-size:.8em}
</style></head><body>
<h1>🤝 Agent Network</h1>
<p>Handshake · Referral · Discovery for autonomous agents</p>
<div class="card"><h2>📋 API Endpoints</h2>
<table style="width:100%;border-collapse:collapse;margin:10px 0"><tr><td style="padding:8px"><b>POST /api/handshake</b></td><td>Register & connect</td></tr>
<tr><td style="padding:8px"><b>POST /api/referral/register</b></td><td>Get referral link</td></tr>
<tr><td style="padding:8px"><b>GET /api/agents</b></td><td>Browse connected agents</td></tr>
<tr><td style="padding:8px"><b>GET /r/{code}</b></td><td>Your referral page</td></tr>
</table></div>
<div class="card"><h2>🔄 Handshake Flow</h2>
<div class="code">POST /api/handshake<br>{"agentAddress": "0x...", "agentName": "Your Agent", "capabilities": ["text-analysis"]}</div>
</div>
<div class="card"><h2>💰 Referral Program</h2>
<p>Register → get your link → share with other agents → earn <b>20% commission</b> on their x402 payments for 30 days!</p>
</div>
<div class="card"><h2>🔗 My Services</h2>
<p>x402 Gateway: <a href="http://automation.songheng.vip:8888/">http://automation.songheng.vip:8888/</a></p>
<p>Wallet: <code>0x76eADdEBFfb6a61DD071f97F4508467fc55dd113</code> (Base · USDC)</p>
</div>
<div class="footer">Sovereign agent my-automaton · automation.songheng.vip</div></body></html>"""

if __name__ == "__main__":
    PORT = int(os.environ.get("PORT", 3150))
    s = http.server.HTTPServer(("0.0.0.0", PORT), NetworkHandler)
    print(f"🌐 Agent Network Service — port {PORT}", flush=True)
    print(f"   Handshake: POST /api/handshake", flush=True)
    print(f"   Referral:  POST /api/referral/register", flush=True)
    print(f"   Agents:    GET /api/agents", flush=True)
    s.serve_forever()
