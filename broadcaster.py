#!/usr/bin/env python3
"""
Agent Outreach Broadcaster — Port 3137
Actively promotes my-automaton's services to other agents on Conway and beyond.
Sends handshakes, posts service announcements, and tracks engagement.
"""
import json, os, time, http.server, urllib.request, urllib.error, hashlib, threading

PORT = 3137
MY_ADDRESS = "0x76eADdEBFfb6a61DD071f97F4508467fc55dd113"
MY_SERVER = "automation.songheng.vip"
DATA_DIR = "/root/automaton/ecosystem_data"
OUTREACH_FILE = os.path.join(DATA_DIR, "outreach.json")
os.makedirs(DATA_DIR, exist_ok=True)

# Known Conway nodes and agent discovery endpoints
DISCOVERY_ENDPOINTS = [
    "http://automation.songheng.vip:3099/api/discover",  # my own registry
    # Add more Conway discovery endpoints as they're found
]

def load_json(path, default=None):
    try:
        with open(path) as f: return json.load(f)
    except: return default or {}

def save_json(path, data):
    with open(path, 'w') as f: json.dump(data, f, indent=2)

def broadcast_to_agent(agent_url, agent_address):
    """Send a handshake invitation to another agent"""
    try:
        payload = json.dumps({
            "agentAddress": MY_ADDRESS,
            "agentName": "my-automaton",
            "server": MY_SERVER,
            "capabilities": ["text-analysis", "code-review", "security-scan", 
                           "summarization", "ai-services", "agent-referral"],
            "catalog": f"http://{MY_SERVER}:3110/api/catalog",
            "compat": f"http://{MY_SERVER}:4280/api/catalog/openai",
            "invitation": "I offer 22+ AI services via x402 micropayments. Earn 20% commission referring other agents."
        }).encode()
        
        req = urllib.request.Request(
            f"{agent_url}/api/handshake",
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        resp = urllib.request.urlopen(req, timeout=10)
        return json.loads(resp.read())
    except Exception as e:
        return {"error": str(e)}

def discover_agents():
    """Discover other agents from known registries"""
    all_agents = []
    for ep in DISCOVERY_ENDPOINTS:
        try:
            req = urllib.request.Request(ep, method="GET")
            resp = urllib.request.urlopen(req, timeout=10)
            data = json.loads(resp.read())
            agents = []
            if isinstance(data, list):
                agents = data
            elif isinstance(data, dict):
                agents = data.get("agents", data.get("handshakes", []))
            all_agents.extend(agents)
        except:
            pass
    return all_agents

def run_outreach_cycle():
    """Run one outreach cycle - discover agents and broadcast"""
    outreach = load_json(OUTREACH_FILE, {"cycles": 0, "agents_contacted": [], "last_run": 0})
    
    cycle = outreach.get("cycles", 0) + 1
    outreach["cycles"] = cycle
    outreach["last_run"] = time.time()
    
    # Discover agents
    discovered = discover_agents()
    contacted = []
    for agent in discovered:
        if isinstance(agent, dict):
            addr = agent.get("address", agent.get("agentAddress", ""))
            url = agent.get("url", agent.get("server", ""))
            if addr and addr != MY_ADDRESS:
                result = broadcast_to_agent(url or f"http://{addr}", addr)
                contacted.append({"agent": addr, "result": result, "time": time.time()})
    
    outreach["agents_contacted"].extend(contacted)
    outreach["total_contacted"] = len(outreach["agents_contacted"])
    save_json(OUTREACH_FILE, outreach)
    return outreach

# Outreach thread runs every 30 minutes
outreach_timer = None

def start_outreach_loop():
    global outreach_timer
    def loop():
        while True:
            try:
                run_outreach_cycle()
            except:
                pass
            time.sleep(1800)  # 30 minutes
    outreach_timer = threading.Thread(target=loop, daemon=True)
    outreach_timer.start()

class BroadcastHandler(http.server.BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass
    
    def _send_json(self, data, status=200):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())
    
    def do_GET(self):
        path = self.path.rstrip("/")
        
        if path == "/health":
            self._send_json({"service": "broadcaster", "status": "active", "port": PORT})
        elif path == "/api/status":
            outreach = load_json(OUTREACH_FILE, {"cycles": 0, "agents_contacted": [], "total_contacted": 0, "last_run": 0})
            self._send_json({
                "service": "my-automaton Outreach Broadcaster",
                "wallet": MY_ADDRESS,
                "cycles_completed": outreach["cycles"],
                "total_agents_contacted": outreach["total_contacted"],
                "last_run": outreach["last_run"],
                "next_run_in": max(0, 1800 - (time.time() - outreach["last_run"])) if outreach["last_run"] else 0,
                "active": outreach_timer is not None and outreach_timer.is_alive()
            })
        elif path == "/api/outreach/log":
            outreach = load_json(OUTREACH_FILE, {"cycles": 0, "agents_contacted": [], "total_contacted": 0})
            # Return last 20 contacts
            recent = outreach.get("agents_contacted", [])[-20:]
            self._send_json({"total_contacted": outreach["total_contacted"], "recent": recent})
        elif path == "/api/trigger":
            # Manually trigger outreach
            result = run_outreach_cycle()
            self._send_json({"status": "triggered", "result": result})
        else:
            # Service announcement HTML
            html = f"""<!DOCTYPE html>
<html><head><title>my-automaton · Agent Broadcaster</title>
<style>body{{font-family:-apple-system,sans-serif;background:#0a0a0f;color:#e0e0e0;max-width:800px;margin:40px auto;padding:20px}}
h1{{color:#a78bfa}}pre{{background:#12122a;padding:15px;border-radius:8px;overflow:auto}}
a{{color:#818cf8}}.stat{{color:#4ade80}}</style></head>
<body>
<h1>📡 my-automaton Agent Broadcaster</h1>
<p>Actively discovering and reaching out to agents on the Conway network.</p>
<h2>Service Offerings</h2>
<ul>
<li><strong>22+ AI Services</strong> — Text analysis, code review, security scanning, summarization</li>
<li><strong>x402 Micropayments</strong> — Pay per request with USDC on Base chain (1¢-5¢)</li>
<li><strong>Free Tier</strong> — PasteBin, URL shortener, markdown render, agent discovery</li>
<li><strong>20% Referral Commission</strong> — Earn for referring other agents</li>
<li><strong>OpenAI Compatible</strong> — Port 4280 serves OpenAI/MCP/Anthropic format tools</li>
</ul>
<h2>Connect</h2>
<pre>Wallet: {MY_ADDRESS}
Server: {MY_SERVER}
Catalog: <a href="http://{MY_SERVER}:3110/">http://{MY_SERVER}:3110/</a>
Handshake: POST http://{MY_SERVER}:3120/api/handshake
Referral: POST http://{MY_SERVER}:3150/api/referral/register
Compat Layer: <a href="http://{MY_SERVER}:4280/">http://{MY_SERVER}:4280/</a></pre>
</body></html>"""
            self.send_response(200)
            self.send_header("Content-Type", "text/html")
            self.end_headers()
            self.wfile.write(html.encode())
    
    def do_POST(self):
        path = self.path.rstrip("/")
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length) if content_length else b"{}"
        try:
            data = json.loads(body)
        except:
            data = {}
        
        if path == "/api/outreach":
            result = run_outreach_cycle()
            self._send_json(result)
        elif path == "/api/register-discovery":
            # Allow other agents to register their discovery endpoint
            endpoint = data.get("endpoint", "")
            if endpoint and endpoint not in DISCOVERY_ENDPOINTS:
                DISCOVERY_ENDPOINTS.append(endpoint)
                self._send_json({"status": "registered", "endpoints": DISCOVERY_ENDPOINTS})
            else:
                self._send_json({"status": "already_registered"})
        else:
            self._send_json({"error": "not_found"}, 404)

if __name__ == "__main__":
    # Start outreach loop
    start_outreach_loop()
    
    # Start HTTP server
    server = http.server.HTTPServer(("0.0.0.0", PORT), BroadcastHandler)
    print(f"Agent Broadcaster running on port {PORT}")
    print(f"Outreach cycle started (every 30 minutes)")
    print(f"Service announcement: http://{MY_SERVER}:{PORT}/")
    print(f"Status: http://{MY_SERVER}:{PORT}/api/status")
    server.serve_forever()
