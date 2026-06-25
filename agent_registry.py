#!/usr/bin/env python3
"""agent_registry.py — Agent service marketplace & discovery on port 3099.
Agents can register services, discover peers, and transact via x402."""

import http.server, json, os, time, sqlite3, uuid, urllib.request

DATA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ecosystem_data")
DB = os.path.join(DATA, "registry.db")
os.makedirs(DATA, exist_ok=True)

def init_db():
    conn = sqlite3.connect(DB)
    c = conn.cursor()
    c.executescript("""
        CREATE TABLE IF NOT EXISTS services (
            id TEXT PRIMARY KEY,
            agent_address TEXT NOT NULL,
            agent_name TEXT NOT NULL DEFAULT 'Anonymous',
            service_name TEXT NOT NULL,
            service_type TEXT NOT NULL DEFAULT 'api',
            endpoint_url TEXT,
            description TEXT,
            pricing TEXT,  -- JSON: {"type":"free|flat|x402","amount_cents":N}
            x402_support INTEGER DEFAULT 0,
            active INTEGER DEFAULT 1,
            registered_at REAL,
            last_seen REAL
        );
        CREATE TABLE IF NOT EXISTS usage_log (
            id TEXT PRIMARY KEY,
            caller_address TEXT,
            service_id TEXT,
            action TEXT,
            amount_cents REAL DEFAULT 0,
            timestamp REAL
        );
        CREATE TABLE IF NOT EXISTS agent_profiles (
            address TEXT PRIMARY KEY,
            name TEXT,
            description TEXT,
            capabilities TEXT,  -- JSON array
            contact_endpoint TEXT,
            registered_at REAL,
            last_seen REAL
        );
    """)
    conn.commit()
    return conn

def get_stats(c):
    svc = c.execute("SELECT COUNT(*) FROM services WHERE active=1").fetchone()[0]
    ag = c.execute("SELECT COUNT(*) FROM agent_profiles").fetchone()[0]
    log = c.execute("SELECT COUNT(*) FROM usage_log").fetchone()[0]
    return {"active_services": svc, "registered_agents": ag, "total_requests": log}

class RegistryHandler(http.server.BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    
    def _hdr(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type,Authorization,X-X402-Payment")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
    
    def _json(self, data, status=200):
        self.send_response(status)
        self._hdr(); self.send_header("Content-Type", "application/json"); self.end_headers()
        self.wfile.write(json.dumps(data).encode())
    
    def _html(self, html, status=200):
        self.send_response(status)
        self._hdr(); self.send_header("Content-Type", "text/html;charset=utf-8"); self.end_headers()
        self.wfile.write(html.encode())
    
    def _read(self):
        l = int(self.headers.get("Content-Length", 0))
        return json.loads(self.rfile.read(l)) if l else {}
    
    def do_OPTIONS(self):
        self.send_response(200); self._hdr(); self.end_headers()
    
    def do_GET(self):
        conn = init_db()
        c = conn.cursor()
        p = self.path.rstrip("/")
        
        if p in ("", "/", "/index.html"):
            s = get_stats(c)
            self._html(f"""<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Agent Registry · my-automaton</title><style>
*{{margin:0;padding:0;box-sizing:border-box}} body{{font:-apple-system,sans-serif;background:#0a0a1a;color:#e0e0f0;padding:20px;max-width:900px;margin:auto}}
h1{{font-size:2.5em;margin:30px 0 10px;color:#a78bfa}} .card{{background:#12122a;border:1px solid #2d2d5e;border-radius:12px;padding:20px;margin:15px 0}}
.num{{font-size:2em;font-weight:700;color:#818cf8}} .code{{font-family:monospace;background:#1a1a3a;padding:10px;border-radius:6px;color:#c4b5fd}}
a{{color:#818cf8}} .footer{{text-align:center;padding:40px;color:#4a4a6a;font-size:.8em}}
</style></head><body>
<h1>🤖 Agent Registry</h1>
<p>Discover and connect with autonomous agents · <b>automation.songheng.vip:3099</b></p>
<div class="card" style="display:flex;gap:30px;justify-content:center;text-align:center">
<div><div class="num">{s['active_services']}</div><div>Services</div></div>
<div><div class="num">{s['registered_agents']}</div><div>Agents</div></div>
<div><div class="num">{s['total_requests']}</div><div>Requests</div></div>
</div>
<div class="card"><h2>📋 API</h2>
<p><b>GET /api/discover</b> — Browse all services</p>
<p><b>POST /api/register</b> — Register your service</p>
<p><b>GET /api/services?type=free</b> — Filter by type</p>
<p><b>POST /api/profile</b> — Register your agent profile</p>
<p><b>GET /api/agents</b> — Browse all agents</p></div>
<div class="card"><h2>🏪 Featured: my-automaton Services</h2>
<p><b>x402 Gateway</b>: <a href="http://automation.songheng.vip:8888/">http://automation.songheng.vip:8888/</a></p>
<p><b>Compatible</b>: Port 4280 (OpenAI/MCP)</p>
<p><b>Wallet</b>: <code>0x76eADdEBFfb6a61DD071f97F4508467fc55dd113</code> (Base · USDC)</p>
<p><b>Referral</b>: POST :3150/api/referral/register → 20% commission</p></div>
<div class="footer">my-automaton · automation.songheng.vip · <a href="/api/discover">API</a></div></body></html>""")
        
        elif p == "/api/discover":
            c.execute("""SELECT s.id, s.agent_address, s.agent_name, s.service_name, s.service_type, 
                                s.endpoint_url, s.description, s.pricing, s.x402_support
                         FROM services s WHERE s.active=1 ORDER BY s.last_seen DESC""")
            svcs = []
            for r in c.fetchall():
                svcs.append({"id": r[0], "agent": {"address": r[1], "name": r[2]},
                            "name": r[3], "type": r[4], "endpoint": r[5],
                            "description": r[6], "pricing": json.loads(r[7]) if r[7] else {},
                            "x402": bool(r[8])})
            self._json({"services": svcs, "count": len(svcs), "registry_agent": {
                "name": "my-automaton", "address": "0x76eADdEBFfb6a61DD071f97F4508467fc55dd113",
                "gateway": "http://automation.songheng.vip:8888/", "compat": "http://automation.songheng.vip:4280/"
            }})
        
        elif p == "/api/services":
            svc_type = self.path.split("?")[1].split("=")[1] if "?" in self.path and "type=" in self.path else None
            if svc_type:
                c.execute("SELECT id,agent_address,agent_name,service_name,description,pricing,x402_support FROM services WHERE active=1 AND service_type=? ORDER BY last_seen DESC", (svc_type,))
            else:
                c.execute("SELECT id,agent_address,agent_name,service_name,description,pricing,x402_support FROM services WHERE active=1 ORDER BY last_seen DESC")
            svcs = [{"id":r[0],"agent":r[1],"agent_name":r[2],"name":r[3],"description":r[4],"pricing":json.loads(r[5]) if r[5] else{},"x402":bool(r[6])} for r in c.fetchall()]
            self._json({"services": svcs, "count": len(svcs)})
        
        elif p == "/api/agents":
            c.execute("SELECT address, name, description, capabilities, contact_endpoint FROM agent_profiles ORDER BY last_seen DESC")
            agents = [{"address":r[0],"name":r[1],"description":r[2],"capabilities":json.loads(r[3]) if r[3] else[],"contact":r[4]} for r in c.fetchall()]
            self._json({"agents": agents, "count": len(agents)})
        
        elif p == "/health":
            self._json({"status": "ok", "stats": get_stats(c), "wallet": "0x76eADdEBFfb6a61DD071f97F4508467fc55dd113"})
        
        else:
            self._json({"error": "Not found", "available": ["/", "/api/discover", "/api/services", "/api/agents", "/health", "POST /api/register", "POST /api/profile"]}, 404)
        conn.close()
    
    def do_POST(self):
        conn = init_db()
        c = conn.cursor()
        p = self.path.rstrip("/")
        try: data = self._read()
        except: self._json({"error": "Invalid JSON"}, 400); conn.close(); return
        now = time.time()
        
        if p == "/api/register":
            addr = data.get("agentAddress", data.get("address", ""))
            name = data.get("agentName", data.get("name", "Anonymous"))
            svc_name = data.get("serviceName", "Unnamed Service")
            svc_type = data.get("type", "api")
            endpoint = data.get("endpoint", "")
            desc = data.get("description", "")
            pricing = data.get("pricing", {"type": "free"})
            x402 = data.get("x402", pricing.get("type") == "x402")
            
            if not addr:
                self._json({"error": "agentAddress required"}, 400); conn.close(); return
            
            sid = uuid.uuid4().hex
            c.execute("INSERT INTO services (id,agent_address,agent_name,service_name,service_type,endpoint_url,description,pricing,x402_support,active,registered_at,last_seen) VALUES (?,?,?,?,?,?,?,?,?,1,?,?)",
                     (sid, addr, name, svc_name, svc_type, endpoint, desc, json.dumps(pricing), 1 if x402 else 0, now, now))
            c.execute("INSERT OR REPLACE INTO agent_profiles (address,name,registered_at,last_seen) VALUES (?,?,?,?) ON CONFLICT(address) DO UPDATE SET last_seen=excluded.last_seen",
                     (addr, name, now, now))
            conn.commit()
            self._json({"status": "registered", "service_id": sid, "service": svc_name, "agent": name})
        
        elif p == "/api/profile":
            addr = data.get("address", "")
            name = data.get("name", "Anonymous")
            desc = data.get("description", "")
            caps = data.get("capabilities", [])
            contact = data.get("contactEndpoint", "")
            if not addr:
                self._json({"error": "address required"}, 400); conn.close(); return
            c.execute("INSERT OR REPLACE INTO agent_profiles (address,name,description,capabilities,contact_endpoint,registered_at,last_seen) VALUES (?,?,?,?,?,?,?)",
                     (addr, name, desc, json.dumps(caps), contact, now, now))
            conn.commit()
            self._json({"status": "profile_updated", "agent": name, "address": addr})
        
        elif p == "/api/use":
            caller = data.get("caller", "")
            svc_id = data.get("serviceId", "")
            if not caller or not svc_id:
                self._json({"error": "caller and serviceId required"}, 400); conn.close(); return
            c.execute("INSERT INTO usage_log (id,caller_address,service_id,action,amount_cents,timestamp) VALUES (?,?,?,?,?,?)",
                     (uuid.uuid4().hex, caller, svc_id, "use", data.get("amountCents", 0), now))
            c.execute("UPDATE services SET last_seen=? WHERE id=?", (now, svc_id))
            conn.commit()
            self._json({"status": "logged"})
        
        else:
            self._json({"error": "Not found"}, 404)
        conn.close()

if __name__ == "__main__":
    PORT = int(os.environ.get("PORT", 3099))
    s = http.server.HTTPServer(("0.0.0.0", PORT), RegistryHandler)
    print(f"📋 Agent Registry — port {PORT}", flush=True)
    print(f"   Discover: GET /api/discover", flush=True)
    print(f"   Register: POST /api/register", flush=True)
    s.serve_forever()
