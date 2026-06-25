#!/usr/bin/env python3
"""Ecosystem compat layer on port 4280 - OpenAI/MCP/Anthropic formats"""
import json, os, sys, time, http.server
from urllib.parse import urlparse

PORT, WALLET, HOST = 4280, "0x76eADdEBFfb6a61DD071f97F4508467fc55dd113", "automation.songheng.vip"
DATA = os.path.join(os.path.dirname(__file__), "ecosystem_data")
os.makedirs(DATA, exist_ok=True)
start = time.time()

def rj(n, d=None):
    try:
        with open(os.path.join(DATA, n)) as f: return json.load(f)
    except: return d or {}
def wj(n, o):
    with open(os.path.join(DATA, n), 'w') as f: json.dump(o, f, indent=2)

PREMIUM = {
    "analyze": {"c": 1, "d": "Deep text analysis", "ep": "/v1/analyze"},
    "summarize": {"c": 2, "d": "AI summarization", "ep": "/v1/summarize"},
    "review": {"c": 5, "d": "Full code review", "ep": "/v1/review"},
    "security": {"c": 3, "d": "Security vulnerability scan", "ep": "/v1/security"},
    "explain": {"c": 2, "d": "Code explanation", "ep": "/v1/explain"},
    "refactor": {"c": 5, "d": "Refactoring suggestions", "ep": "/v1/refactor"},
    "complexity": {"c": 2, "d": "Complexity analysis", "ep": "/v1/complexity"},
}

ALL_SVC = [v for v in PREMIUM.values()] + [
    {"ep": "GET /health", "d": "Health check", "c": 0},
    {"ep": "POST /api/handshake", "d": "Agent registration", "c": 0},
    {"ep": "POST /api/referral/register", "d": "Referral signup", "c": 0},
    {"ep": "GET /api/discover", "d": "Agent discovery", "c": 0},
    {"ep": "GET /compat/openai", "d": "OpenAI tool format", "c": 0},
]

def make_tools():
    tools = []
    for name, info in PREMIUM.items():
        tools.append({
            "type": "function",
            "function": {
                "name": "myautomaton_" + name,
                "description": info["d"] + " $" + str(info["c"]/100) + " USDC",
                "parameters": {
                    "type": "object",
                    "properties": {"text": {"type": "string"}},
                    "required": ["text"]
                }
            }
        })
    return tools

def make_mcp():
    tools = []
    for name, info in PREMIUM.items():
        tools.append({
            "name": "myautomaton_" + name,
            "description": info["d"] + " $" + str(info["c"]/100) + " USDC",
            "inputSchema": {"type": "object", "properties": {"text": {"type": "string"}}, "required": ["text"]}
        })
    return {"tools": tools}

class H(http.server.BaseHTTPRequestHandler):
    def log_message(self, f, *a):
        sys.stderr.write("[eco] %s %s %s\n" % a)
    def _j(self, c, d):
        b = json.dumps(d, indent=2).encode()
        self.send_response(c)
        self.send_header("Content-Type","application/json")
        self.send_header("Access-Control-Allow-Origin","*")
        self.end_headers()
        self.wfile.write(b)
    def _h(self, c, d):
        b = d.encode()
        self.send_response(c)
        self.send_header("Content-Type","text/html;charset=utf-8")
        self.send_header("Access-Control-Allow-Origin","*")
        self.end_headers()
        self.wfile.write(b)
    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin","*")
        self.send_header("Access-Control-Allow-Methods","GET,OPTIONS")
        self.send_header("Access-Control-Allow-Headers","*")
        self.end_headers()
    def do_GET(self):
        p = urlparse(self.path).path.rstrip("/") or "/"
        if p == "/health":
            return self._j(200, {"status":"ok","uptime":round(time.time()-start,1),"wallet":WALLET})
        if p == "/api/catalog/openai":
            return self._j(200, make_tools())
        if p == "/api/catalog/mcp":
            return self._j(200, make_mcp())
        if p == "/api/catalog":
            return self._j(200, {"agent":"my-automaton","wallet":WALLET,
                "server":HOST+":8888","services":[{"ep":s["ep"],"c":s["c"],"d":s["d"]} for s in ALL_SVC],
                "openai":"http://"+HOST+":"+str(PORT)+"/api/catalog/openai",
                "mcp":"http://"+HOST+":"+str(PORT)+"/api/catalog/mcp"})
        if p == "/guide":
            html = """<!DOCTYPE html><html><head><meta charset="utf-8"><title>Integration Guide</title>
<style>body{font-family:system-ui;max-width:800px;margin:auto;padding:20px;background:#0a0a1a;color:#e0e0f0}
pre{background:#12122a;padding:15px;border-radius:8px;overflow-x:auto;border:1px solid #2d2d5e}
code{color:#a78bfa}h2{color:#a78bfa}</style></head><body>
<h1>Integration Guide</h1><p>Wallet: """ + WALLET + """ on Base</p>
<h2>1. Get Tools</h2><pre>curl http://""" + HOST + """:""" + str(PORT) + """/api/catalog/openai</pre>
<h2>2. Register</h2><pre>curl http://""" + HOST + """:8888/api/handshake -X POST -H 'Content-Type: application/json' -d '{"agentAddress":"0x..."}'</pre>
<h2>3. Use x402 Endpoints</h2><pre>curl http://""" + HOST + """:8888/v1/analyze -X POST -H 'Content-Type: application/json' -d '{"text":"test"}'</pre>
<h2>4. Earn 20%</h2><pre>curl http://""" + HOST + """:8888/api/referral/register -X POST -H 'Content-Type: application/json' -d '{"agentAddress":"0x..."}'</pre>
</body></html>"""
            return self._h(200, html)
        if p == "/api/discover":
            agents = rj("agents.json", {})
            return self._j(200, {"agents":[{"address":a,"name":i.get("name","")} for a,i in agents.items()],"count":len(agents)})
        self._j(404, {"error":"not_found"})

if __name__ == "__main__":
    srv = http.server.HTTPServer(("0.0.0.0", PORT), H)
    print("Compat Layer LIVE: http://"+HOST+":"+str(PORT)+"/", flush=True)
    print("OpenAI tools: http://"+HOST+":"+str(PORT)+"/api/catalog/openai", flush=True)
    srv.serve_forever()
