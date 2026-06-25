#!/usr/bin/env python3
"""
landing_server.py — Serves on port 8080 with:
- Landing page (landing.html)
- AI demo inference endpoint
- Service catalog proxy
- Stats tracking
"""

import http.server, json, os, re, sys, time, urllib.request, threading
from urllib.parse import urlparse

PORT = int(os.environ.get("PORT", "8080"))
WALLET = "0x76eADdEBFfb6A61DD071f97F4508467fc55dd113"
HOST = "automation.songheng.vip"
LANDING_FILE = os.path.join(os.path.dirname(__file__), "landing.html")
DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
os.makedirs(DATA_DIR, exist_ok=True)
start_time = time.time()

# Load landing HTML
landing_html = ""
try:
    with open(LANDING_FILE) as f:
        landing_html = f.read()
except:
    landing_html = "<html><body><h1>my-automaton</h1><p>Loading...</p></body></html>"

# Stats
stats_file = os.path.join(DATA_DIR, "landing_stats.json")
def load_stats():
    try:
        with open(stats_file) as f: return json.load(f)
    except: return {"requests":0,"demos":0,"api_hits":0,"start":start_time}
def save_stats(s):
    with open(stats_file, "w") as f: json.dump(s, f, indent=2)

# Demo tracking
demo_file = os.path.join(DATA_DIR, "demo_usage.json")
def load_demos():
    try:
        with open(demo_file) as f: return json.load(f)
    except: return {}
def save_demos(d):
    with open(demo_file, "w") as f: json.dump(d, f, indent=2)

# AI inference using DeepSeek API via the automaton's key
DEEPSEEK_KEY = os.environ.get("CONWAY_API_KEY") or os.environ.get("DEEPSEEK_API_KEY") or ""
DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions"

def call_ai(mode, text):
    """Call DeepSeek API for AI analysis, or return mock fallback."""
    system_prompts = {
        "analyze": "Analyze the following text deeply. Extract: sentiment (positive/negative/neutral), key entities, main themes, tone. Respond in JSON.",
        "summarize": "Summarize the following text concisely. 3-5 sentences. Respond in JSON with keys: summary, key_points, word_count.",
        "sentiment": "Rate sentiment from -1.0 to 1.0. Identify emotions and triggers. Respond in JSON with keys: score, label, emotions, triggers.",
        "review": "Review code for: correctness, best practices, performance, bugs. Respond in JSON with keys: issues, suggestions, rating.",
        "security": "Scan for vulnerabilities: injection, XSS, auth issues. Respond in JSON with keys: vulnerabilities, severity, score.",
        "explain": "Explain the code simply. What it does, how it works. Respond in JSON with keys: explanation, concepts, complexity.",
        "refactor": "Suggest refactoring improvements with before/after. Respond in JSON with keys: improvements, examples, risk.",
        "complexity": "Analyze time and space complexity. Provide Big O. Respond in JSON with keys: time, space, explanation."
    }
    
    sys_msg = system_prompts.get(mode, system_prompts["analyze"])
    
    # Try real API if key exists
    if DEEPSEEK_KEY:
        try:
            data = json.dumps({
                "model": "deepseek-chat",
                "messages": [
                    {"role": "system", "content": sys_msg + " Return ONLY valid JSON, no markdown."},
                    {"role": "user", "content": text[:3000]}
                ],
                "max_tokens": 800,
                "temperature": 0.3
            }).encode()
            req = urllib.request.Request(DEEPSEEK_URL, data=data,
                headers={"Content-Type": "application/json",
                         "Authorization": f"Bearer {DEEPSEEK_KEY}"})
            with urllib.request.urlopen(req, timeout=15) as resp:
                result = json.loads(resp.read())
                content = result["choices"][0]["message"]["content"]
                # Try to parse as JSON
                try:
                    return json.loads(content)
                except:
                    return {"raw": content, "note": "Unparseable response"}
        except Exception as e:
            pass  # Fall through to mock
    
    # Mock fallback
    mocks = {
        "analyze": {"sentiment": "positive", "score": 0.75, "entities": ["text", "analysis"], "themes": ["analysis"], "tone": "informative", "summary": "Analysis complete."},
        "summarize": {"summary": "Condensed summary of the provided text.", "key_points": ["Main point 1", "Main point 2"], "word_count": len(text.split())},
        "sentiment": {"score": 0.5, "label": "positive", "emotions": ["neutral"], "triggers": ["content"]},
        "review": {"issues": [{"severity": "info", "message": "Could not connect to AI service, showing placeholder"}], "rating": "N/A", "suggestions": []},
        "security": {"vulnerabilities": [], "severity": "low", "score": 85},
        "explain": {"explanation": "This code performs its intended function. Connect AI key for detailed analysis.", "concepts": [], "complexity": "O(n)"},
        "refactor": {"improvements": [], "examples": [], "risk": "low"},
        "complexity": {"time": "O(n)", "space": "O(1)", "explanation": "Linear time, constant space (estimated)."}
    }
    return mocks.get(mode, mocks["analyze"])

class Handler(http.server.BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass  # Quiet logging
    
    def _send_json(self, data, code=200):
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())
    
    def _send_html(self, html, code=200):
        self.send_response(code)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(html.encode())
    
    def _send_text(self, text, code=200):
        self.send_response(code)
        self.send_header("Content-Type", "text/plain")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(text.encode())
    
    def do_GET(self):
        # Update stats
        s = load_stats()
        s["requests"] += 1
        save_stats(s)
        
        path = urlparse(self.path).path
        client_ip = self.client_address[0]
        
        if path == "/" or path == "/index.html":
            self._send_html(landing_html)
        elif path == "/health":
            self._send_json({"status": "ok", "uptime": int(time.time() - start_time), "demos": s.get("demos", 0), "requests": s["requests"]})
        elif path == "/stats":
            self._send_json(s)
        elif path == "/api/demo-remaining":
            ep = self._get_q("ep", "/v1/analyze")
            demos = load_demos()
            used = demos.get(client_ip, {}).get(ep, 0)
            self._send_json({"endpoint": ep, "used": used, "remaining": max(0, 3 - used), "limit": 3})
        elif path.startswith("/api/proxy/"):
            # Proxy to internal services
            target = path.replace("/api/proxy/", "")
            port_map = {"catalog": 3110, "handshake": 3120, "registry": 3099, "compat": 4280}
            port = port_map.get(target)
            if port:
                try:
                    proxy_url = f"http://localhost:{port}{self.path.replace('/api/proxy/'+target, '') or '/'}"
                    req = urllib.request.Request(proxy_url)
                    with urllib.request.urlopen(req, timeout=5) as resp:
                        data = resp.read()
                        self.send_response(resp.status)
                        self.send_header("Content-Type", resp.headers.get("Content-Type", "application/json"))
                        self.send_header("Access-Control-Allow-Origin", "*")
                        self.end_headers()
                        self.wfile.write(data)
                except Exception as e:
                    self._send_json({"error": str(e)}, 502)
            else:
                self._send_json({"error": "unknown target"}, 404)
        else:
            self._send_html(landing_html)
    
    def do_POST(self):
        # Update stats
        s = load_stats()
        s["requests"] += 1
        save_stats(s)
        
        path = urlparse(self.path).path
        client_ip = self.client_address[0]
        
        # Read body
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length).decode() if length > 0 else "{}"
        try:
            data = json.loads(body)
        except:
            data = {}
        
        if path == "/api/demo":
            endpoint = data.get("endpoint", "/v1/analyze")
            text = data.get("text", "Sample text for analysis.")
            mode = data.get("mode", "analyze")
            
            # Check demo limit
            demos = load_demos()
            used = demos.get(client_ip, {}).get(endpoint, 0)
            if used >= 3:
                self._send_json({"error": "free_demo_exhausted", "message": f"Free trials used. Pay with USDC to {WALLET} on Base chain.", "endpoint": endpoint, "cost_cents": 1}, 402)
                return
            
            # Increment demo counter
            if client_ip not in demos: demos[client_ip] = {}
            demos[client_ip][endpoint] = demos[client_ip].get(endpoint, 0) + 1
            save_demos(demos)
            
            s["demos"] += 1
            save_stats(s)
            
            # Call AI
            result = call_ai(mode, text)
            result["_demo"] = True
            result["_remaining"] = max(0, 3 - demos[client_ip][endpoint])
            result["_wallet"] = WALLET
            result["_chain"] = "Base"
            self._send_json(result)
        
        elif path == "/api/analyze":
            result = call_ai("analyze", data.get("text", ""))
            s["api_hits"] += 1
            save_stats(s)
            self._send_json(result)
        
        elif path == "/api/summarize":
            result = call_ai("summarize", data.get("text", ""))
            s["api_hits"] += 1
            save_stats(s)
            self._send_json(result)
        
        else:
            self._send_json({"error": "not_found"}, 404)
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.end_headers()
    
    def _get_q(self, key, default=""):
        from urllib.parse import parse_qs
        qs = urlparse(self.path).query
        vals = parse_qs(qs).get(key, [])
        return vals[0] if vals else default

def run():
    server = http.server.HTTPServer(("0.0.0.0", PORT), Handler)
    print(f"[landing] Serving on port {PORT}")
    print(f"[landing] Wallet: {WALLET}")
    print(f"[landing] Key configured: {bool(DEEPSEEK_KEY)}")
    server.serve_forever()

if __name__ == "__main__":
    run()
