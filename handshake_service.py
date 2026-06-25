#!/usr/bin/env python3
"""
handshake_service.py — Agent handshake & discovery service (port 3120)
Allows agents to discover each other, register, and form the agent ecosystem.
"""
import http.server, json, os, sys, time, hashlib
from urllib.parse import urlparse

PORT = 3120
DATA_DIR = "/root/automaton/ecosystem_data"
os.makedirs(DATA_DIR, exist_ok=True)

def rj(n, d=None):
    try:
        with open(os.path.join(DATA_DIR, n)) as f: return json.load(f)
    except: return d or {}
def wj(n, o):
    with open(os.path.join(DATA_DIR, n), 'w') as f: json.dump(o, f, indent=2)

class Handler(http.server.BaseHTTPRequestHandler):
    def _json(self, code, data):
        b = json.dumps(data).encode()
        self.send_response(code)
        self.send_header("Content-Type","application/json")
        self.send_header("Access-Control-Allow-Origin","*")
        self.end_headers()
        self.wfile.write(b)
    def _body(self):
        l = int(self.headers.get("Content-Length",0))
        if not l: return {}
        try: return json.loads(self.rfile.read(l))
        except: return {}
    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin","*")
        self.send_header("Access-Control-Allow-Methods","GET,POST,OPTIONS")
        self.send_header("Access-Control-Allow-Headers","Content-Type")
        self.end_headers()
    def do_GET(self):
        p = urlparse(self.path).path.rstrip("/") or "/"
        if p == "/" or p == "/health":
            agents = rj("agents.json", {})
            return self._json(200, {"service":"handshake","status":"active","agents_registered":len(agents),"port":PORT})
        if p == "/api/discover":
            agents = rj("agents.json", {})
            return self._json(200, {"agents": list(agents.values()) if isinstance(agents, dict) else agents})
        self._json(404, {"error":"not found"})
    def do_POST(self):
        p = urlparse(self.path).path.rstrip("/")
        body = self._body()
        if p == "/api/handshake":
            addr = body.get("agentAddress","")
            name = body.get("agentName","")
            caps = body.get("capabilities",[])
            if not addr: return self._json(400, {"error":"agentAddress required"})
            agents = rj("agents.json", {})
            agents[addr] = {"address":addr,"name":name,"capabilities":caps,"time":time.time()}
            wj("agents.json", agents)
            return self._json(200, {"status":"registered","agent":addr,"name":name,"total":len(agents)})
        self._json(404, {"error":"not found"})

if __name__ == "__main__":
    srv = http.server.HTTPServer(("0.0.0.0", PORT), Handler)
    print(f"[handshake] Agent handshake service on port {PORT}")
    srv.serve_forever()
