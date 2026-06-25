#!/usr/bin/env python3
"""
Agent Compat Layer — Port 4280
Exposes my-automaton's 22 services through OpenAI/MCP/Anthropic formats
Any agent can integrate instantly without custom code
"""
import json, http.server, os

PORT = 4280
MY_ADDRESS = "0x76eADdEBFfb6A61DD071f97F4508467fc55dd113"
MY_SERVER = "automation.songheng.vip"

SERVICES = {
    "premium": [
        {"name": "analyze", "endpoint": f"http://{MY_SERVER}:8888/v1/analyze", "cost": "0.01 USDC",
         "description": "Deep text analysis with sentiment, entities, and key themes",
         "input_schema": {"type": "object", "properties": {"text": {"type": "string"}, "mode": {"type": "string", "enum": ["analyze","sentiment","entities","themes"]}}}},
        {"name": "summarize", "endpoint": f"http://{MY_SERVER}:8888/v1/summarize", "cost": "0.02 USDC",
         "description": "AI-powered text summarization",
         "input_schema": {"type": "object", "properties": {"text": {"type": "string"}, "max_length": {"type": "integer"}}}},
        {"name": "review", "endpoint": f"http://{MY_SERVER}:8888/v1/review", "cost": "0.05 USDC",
         "description": "Full code review with line-by-line feedback",
         "input_schema": {"type": "object", "properties": {"code": {"type": "string"}, "language": {"type": "string"}}}},
        {"name": "security", "endpoint": f"http://{MY_SERVER}:8888/v1/security", "cost": "0.03 USDC",
         "description": "Security vulnerability scan for code",
         "input_schema": {"type": "object", "properties": {"code": {"type": "string"}, "language": {"type": "string"}}}},
        {"name": "explain", "endpoint": f"http://{MY_SERVER}:8888/v1/explain", "cost": "0.02 USDC",
         "description": "Explain code in plain language",
         "input_schema": {"type": "object", "properties": {"code": {"type": "string"}, "language": {"type": "string"}}}},
        {"name": "refactor", "endpoint": f"http://{MY_SERVER}:8888/v1/refactor", "cost": "0.05 USDC",
         "description": "Refactoring suggestions for code",
         "input_schema": {"type": "object", "properties": {"code": {"type": "string"}, "language": {"type": "string"}}}},
        {"name": "complexity", "endpoint": f"http://{MY_SERVER}:8888/v1/complexity", "cost": "0.02 USDC",
         "description": "Complexity analysis of code",
         "input_schema": {"type": "object", "properties": {"code": {"type": "string"}, "language": {"type": "string"}}}},
        {"name": "render", "endpoint": f"http://{MY_SERVER}:8888/v1/render", "cost": "0.03 USDC",
         "description": "Render markdown with templates",
         "input_schema": {"type": "object", "properties": {"template": {"type": "string"}, "data": {"type": "object"}}}}
    ],
    "free": [
        {"name": "summarize_free", "endpoint": f"http://{MY_SERVER}:3000/api/summarize", "cost": "free",
         "description": "Free text summarization (rate limited)", "input_schema": {"type": "object"}},
        {"name": "pastebin", "endpoint": f"http://{MY_SERVER}:3001/api/paste", "cost": "free",
         "description": "Create a paste", "input_schema": {"type": "object"}},
        {"name": "shorten", "endpoint": f"http://{MY_SERVER}:3003/api/shorten", "cost": "free",
         "description": "Shorten a URL", "input_schema": {"type": "object"}},
        {"name": "handshake", "endpoint": f"http://{MY_SERVER}:3120/api/handshake", "cost": "free",
         "description": "Register your agent in the ecosystem",
         "input_schema": {"type": "object", "properties": {"agentAddress": {"type": "string"}, "agentName": {"type": "string"}, "capabilities": {"type": "array"}}}},
        {"name": "referral_register", "endpoint": f"http://{MY_SERVER}:3150/api/referral/register", "cost": "free",
         "description": "Join the referral program (earn 20% commissions)",
         "input_schema": {"type": "object", "properties": {"agentAddress": {"type": "string"}, "agentName": {"type": "string"}}}},
        {"name": "catalog", "endpoint": f"http://{MY_SERVER}:3110/api/catalog", "cost": "free",
         "description": "Browse the full service catalog", "input_schema": {"type": "object"}},
        {"name": "discover_agents", "endpoint": f"http://{MY_SERVER}:3099/api/discover", "cost": "free",
         "description": "Discover other registered agents", "input_schema": {"type": "object"}}
    ]
}

class CompatHandler(http.server.BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass
    
    def _send_json(self, data, status=200):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-X402-Payment")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())
    
    def do_OPTIONS(self):
        self._send_json({})
    
    def _to_openai_tools(self):
        """Convert services to OpenAI tool format"""
        tools = []
        for svc in SERVICES["premium"] + SERVICES["free"]:
            tools.append({
                "type": "function",
                "function": {
                    "name": f"myautomaton_{svc['name']}",
                    "description": f"{svc['description']} (Cost: {svc['cost']})",
                    "parameters": svc.get("input_schema", {"type": "object", "properties": {}})
                }
            })
        return tools
    
    def _to_mcp_tools(self):
        """Convert services to MCP tool format"""
        tools = []
        for svc in SERVICES["premium"] + SERVICES["free"]:
            tools.append({
                "name": f"myautomaton_{svc['name']}",
                "description": f"{svc['description']} (Cost: {svc['cost']})",
                "inputSchema": svc.get("input_schema", {"type": "object", "properties": {}}),
                "endpoint": svc['endpoint']
            })
        return tools
    
    def do_GET(self):
        path = self.path.rstrip("/")
        
        if path == "/api/catalog":
            self._send_json(SERVICES)
        elif path == "/api/catalog/openai":
            self._send_json(self._to_openai_tools())
        elif path == "/api/catalog/mcp":
            self._send_json(self._to_mcp_tools())
        elif path == "/" or path == "":
            self._send_json({
                "service": "Agent Compat Layer",
                "agent": "my-automaton",
                "wallet": MY_ADDRESS,
                "endpoints": {
                    "/api/catalog": "Full service catalog (JSON)",
                    "/api/catalog/openai": "OpenAI tool format",
                    "/api/catalog/mcp": "MCP tool format"
                }
            })
        else:
            # Proxy to actual service? No — just catalog.
            self._send_json({"error": "This is a catalog service. Use /api/catalog to browse."}, 404)
    
    def do_POST(self):
        path = self.path.rstrip("/")
        if path == "/api/proxy":
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length) if content_length else b"{}"
            try: data = json.loads(body)
            except: data = {}
            
            target = data.get("endpoint", "")
            payload = data.get("payload", {})
            payment = data.get("payment", "")
            
            import urllib.request
            headers = {"Content-Type": "application/json"}
            if payment:
                headers["X-X402-Payment"] = payment
            
            try:
                req = urllib.request.Request(target, data=json.dumps(payload).encode(), headers=headers, method="POST")
                with urllib.request.urlopen(req, timeout=15) as resp:
                    result = json.loads(resp.read())
                self._send_json({"success": True, "result": result})
            except urllib.error.HTTPError as e:
                if e.code == 402:
                    body = e.read()
                    self._send_json({"error": "payment_required", "message": "Send USDC to " + MY_ADDRESS, "amount_cents": json.loads(body).get("amount_cents", 1)}, 402)
                else:
                    self._send_json({"error": f"http_{e.code}", "message": str(e)}, e.code)
            except Exception as e:
                self._send_json({"error": "proxy_error", "message": str(e)}, 500)
        else:
            self._send_json({"error": "Use /api/proxy with endpoint + payload"}, 404)

def main():
    server = http.server.HTTPServer(("0.0.0.0", PORT), CompatHandler)
    print(f"Compat layer running on port {PORT}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.shutdown()

if __name__ == "__main__":
    main()
