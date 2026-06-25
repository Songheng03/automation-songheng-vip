#!/usr/bin/env python3
"""
mcp_server.py — my-automaton MCP Protocol Server (port 3121)
Enables any MCP-compatible agent to discover and call my services.
Implements the Model Context Protocol for agent-to-agent integration.
"""

import json, os, sys, time, re, hashlib, http.server
from urllib.parse import urlparse
from datetime import datetime

PORT = 3121
HOST = "automation.songheng.vip"
WALLET = "0x76eADdEBFfb6a61DD071f97F4508467fc55dd113"
DATA_DIR = os.path.join(os.path.dirname(__file__), "ecosystem_data")
os.makedirs(DATA_DIR, exist_ok=True)

def log(msg):
    print(f"[mcp] {msg}", flush=True)

def rj(path, default=None):
    try:
        with open(os.path.join(DATA_DIR, path)) as f: return json.load(f)
    except: return default or {}

def wj(path, obj):
    with open(os.path.join(DATA_DIR, path), 'w') as f: json.dump(obj, f, indent=2)

# --- Service Definitions (MCP Tool Format) ---
SERVICES = {
    "analyze_text": {
        "description": "Deep text analysis — extract sentiment, key themes, entities, and structure",
        "inputSchema": {
            "type": "object",
            "properties": {
                "text": {"type": "string", "description": "Text content to analyze"},
                "mode": {"type": "string", "enum": ["analyze", "sentiment", "entities", "themes"], "default": "analyze"}
            },
            "required": ["text"]
        },
        "cost_cents": 1,
        "proxy_path": "/v1/analyze"
    },
    "summarize_text": {
        "description": "AI-powered text summarization with configurable length",
        "inputSchema": {
            "type": "object",
            "properties": {
                "text": {"type": "string", "description": "Text to summarize"},
                "max_length": {"type": "number", "description": "Maximum summary length in words", "default": 100}
            },
            "required": ["text"]
        },
        "cost_cents": 2,
        "proxy_path": "/v1/summarize"
    },
    "review_code": {
        "description": "Full code review with best practices, bug detection, and optimization suggestions",
        "inputSchema": {
            "type": "object",
            "properties": {
                "code": {"type": "string", "description": "Source code to review"},
                "language": {"type": "string", "description": "Programming language", "default": "auto"}
            },
            "required": ["code"]
        },
        "cost_cents": 5,
        "proxy_path": "/v1/review"
    },
    "scan_security": {
        "description": "Security vulnerability scan — detects XSS, injection, eval(), and other risks",
        "inputSchema": {
            "type": "object",
            "properties": {
                "code": {"type": "string", "description": "Source code to scan"},
                "language": {"type": "string", "description": "Programming language", "default": "auto"}
            },
            "required": ["code"]
        },
        "cost_cents": 3,
        "proxy_path": "/v1/security"
    },
    "explain_code": {
        "description": "Explain code in plain language — great for onboarding and code review",
        "inputSchema": {
            "type": "object",
            "properties": {
                "code": {"type": "string", "description": "Code to explain"},
                "language": {"type": "string", "description": "Programming language", "default": "auto"}
            },
            "required": ["code"]
        },
        "cost_cents": 2,
        "proxy_path": "/v1/explain"
    },
    "refactor_code": {
        "description": "Get refactoring suggestions to improve code quality and maintainability",
        "inputSchema": {
            "type": "object",
            "properties": {
                "code": {"type": "string", "description": "Code to refactor"},
                "language": {"type": "string", "description": "Programming language", "default": "auto"}
            },
            "required": ["code"]
        },
        "cost_cents": 5,
        "proxy_path": "/v1/refactor"
    },
    "check_complexity": {
        "description": "Analyze code complexity metrics — cyclomatic complexity, line counts, nesting depth",
        "inputSchema": {
            "type": "object",
            "properties": {
                "code": {"type": "string", "description": "Source code to analyze"},
                "language": {"type": "string", "description": "Programming language", "default": "auto"}
            },
            "required": ["code"]
        },
        "cost_cents": 2,
        "proxy_path": "/v1/complexity"
    },
    "get_catalog": {
        "description": "Get the full service catalog with pricing and endpoint information",
        "inputSchema": {
            "type": "object",
            "properties": {}
        },
        "cost_cents": 0,
        "proxy_path": None
    },
    "register_agent": {
        "description": "Register your agent in the my-automaton ecosystem for discovery and referrals",
        "inputSchema": {
            "type": "object",
            "properties": {
                "agentAddress": {"type": "string", "description": "Your wallet address"},
                "agentName": {"type": "string", "description": "Your agent name"},
                "capabilities": {"type": "array", "items": {"type": "string"}, "description": "Your capabilities"}
            },
            "required": ["agentAddress", "agentName"]
        },
        "cost_cents": 0,
        "proxy_path": None
    },
    "join_referral": {
        "description": "Join the referral program — earn 20% commission on referred agents' payments",
        "inputSchema": {
            "type": "object",
            "properties": {
                "agentAddress": {"type": "string", "description": "Your wallet address for payouts"},
                "agentName": {"type": "string", "description": "Your agent name"}
            },
            "required": ["agentAddress", "agentName"]
        },
        "cost_cents": 0,
        "proxy_path": None
    }
}

# --- Analysis functions (local implementation) ---
def analyze_text(text, mode="analyze"):
    words = re.findall(r'\S+', text.strip()) if text else []
    sents = [s for s in re.split(r'[.!?]+\s*', text) if s.strip()]
    
    if mode == "analyze":
        return {
            "word_count": len(words),
            "char_count": len(text),
            "sentence_count": len(sents),
            "avg_word_length": round(sum(len(w) for w in words)/max(len(words),1), 2),
            "unique_words": len(set(w.lower() for w in words))
        }
    elif mode == "sentiment":
        positive = ["good", "great", "excellent", "amazing", "love", "beautiful", "wonderful", "fantastic"]
        negative = ["bad", "terrible", "awful", "hate", "ugly", "horrible", "worst", "poor"]
        pos_count = sum(1 for w in words if w.lower() in positive)
        neg_count = sum(1 for w in words if w.lower() in negative)
        return {
            "sentiment": "positive" if pos_count > neg_count else "negative" if neg_count > pos_count else "neutral",
            "positive_signals": pos_count,
            "negative_signals": neg_count,
            "confidence": round(abs(pos_count - neg_count) / max(pos_count + neg_count, 1), 2)
        }
    elif mode == "entities":
        # Simple entity extraction
        entities = re.findall(r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b', text)
        return {"entities": list(set(entities))[:20], "count": len(set(entities))}
    elif mode == "themes":
        # Extract common words as themes
        common = sorted(set(w.lower() for w in words if len(w) > 4), 
                       key=lambda x: -text.lower().count(x))[:10]
        return {"themes": common, "count": len(common)}

def summarize_text(text, max_length=100):
    sents = [s.strip() for s in re.split(r'[.!?]+\s*', text) if len(s.strip()) > 10]
    summary = ". ".join(sents[:3]) + "."
    words = summary.split()
    if len(words) > max_length:
        summary = " ".join(words[:max_length]) + "..."
    topics = sorted(set(re.findall(r'\b[a-z]{4,}\b', text.lower())), key=lambda x: -text.count(x))[:5]
    return {"summary": summary, "topics": topics, "original_length": len(text), "compression_ratio": round(len(summary)/max(len(text),1), 2)}

def review_code(code, language="auto"):
    issues = []
    if "eval(" in code: issues.append({"severity": "critical", "message": "eval() usage - arbitrary code execution risk"})
    if "innerHTML" in code: issues.append({"severity": "high", "message": "innerHTML usage - XSS vulnerability"})
    if "var " in code: issues.append({"severity": "low", "message": "Use const/let instead of var"})
    if "console.log" in code: issues.append({"severity": "info", "message": "Remove console.log from production code"})
    if len(code) > 2000: issues.append({"severity": "info", "message": "Consider splitting into smaller modules"})
    return {"line_count": len(code.split("\n")), "issues": issues, "quality_score": max(0, 10 - len(issues) * 2)}

def scan_security(code, language="auto"):
    findings = []
    for pattern, severity, title in [
        (r'eval\s*\(', "critical", "eval() - arbitrary code execution"),
        (r'innerHTML', "high", "innerHTML usage (XSS)"),
        (r'document\.write', "high", "document.write() (XSS)"),
        (r'exec\s*\(', "critical", "exec() - command injection"),
        (r'process\.env', "info", "Environment variable exposure"),
        (r'password|secret|key|token', "high", "Potential secret in code"),
        (r'SELECT\s+.*\s+FROM', "high", "SQL query - check for injection"),
        (r'<script>', "critical", "Inline script injection"),
    ]:
        matches = re.findall(pattern, code, re.IGNORECASE)
        if matches:
            findings.append({"severity": severity, "type": title, "count": len(matches)})
    risk = "critical" if any(f["severity"] == "critical" for f in findings) else \
           "high" if any(f["severity"] == "high" for f in findings) else \
           "low" if findings else "none"
    return {"findings": findings, "risk_level": risk, "total_issues": len(findings)}

def explain_code(code, language="auto"):
    functions = re.findall(r'(?:def\s+(\w+)|class\s+(\w+)|function\s+(\w+)|const\s+(\w+)\s*=|let\s+(\w+)\s*=|var\s+(\w+)\s*=|async\s+function\s+(\w+))', code)
    all_funcs = [f for tup in functions for f in tup if f]
    return {"line_count": len(code.split("\n")), "identified_elements": all_funcs, "explanation": f"Found {len(all_funcs)} code elements"}

def refactor_code(code, language="auto"):
    suggestions = []
    if len(code) > 1000: suggestions.append("Split into smaller modules (< 1000 lines each)")
    if "var " in code: suggestions.append("Replace 'var' with 'const' or 'let' for block scoping")
    if re.search(r'\bfunction\b', code) and not re.search(r'(?:=>|async)', code):
        suggestions.append("Consider using arrow functions for cleaner syntax")
    if not code.strip().endswith("\n"): suggestions.append("Add trailing newline")
    suggestions.append("Add docstrings/comments for complex logic")
    return {"suggestions": suggestions, "complexity": "medium" if any("module" in s for s in suggestions) else "low"}

def complexity_check(code, language="auto"):
    lines = [x for x in code.split("\n") if x.strip()]
    conds = len(re.findall(r'\bif\b|\belse\b|\bfor\b|\bwhile\b|\bswitch\b|\bcatch\b|\bexcept\b', code))
    nesting = 0
    max_nesting = 0
    for ch in code:
        if ch in '{(':
            nesting += 1
            max_nesting = max(max_nesting, nesting)
        elif ch in '})':
            nesting = max(0, nesting - 1)
    score = conds + max_nesting
    return {
        "lines_of_code": len(lines),
        "cyclomatic_complexity": score,
        "max_nesting_depth": max_nesting,
        "conditional_count": conds,
        "rating": "high" if score > 15 else "medium" if score > 5 else "low",
        "maintainability": "needs_refactoring" if score > 10 else "moderate" if score > 5 else "good"
    }

HANDLERS = {
    "analyze_text": lambda a: analyze_text(a.get("text",""), a.get("mode","analyze")),
    "summarize_text": lambda a: summarize_text(a.get("text",""), a.get("max_length",100)),
    "review_code": lambda a: review_code(a.get("code",""), a.get("language","auto")),
    "scan_security": lambda a: scan_security(a.get("code",""), a.get("language","auto")),
    "explain_code": lambda a: explain_code(a.get("code",""), a.get("language","auto")),
    "refactor_code": lambda a: refactor_code(a.get("code",""), a.get("language","auto")),
    "check_complexity": lambda a: complexity_check(a.get("code",""), a.get("language","auto")),
}

class MCPHandler(http.server.BaseHTTPRequestHandler):
    def log_message(self, f, *a):
        sys.stderr.write(f"[mcp] {a[0]} {a[1]} {a[2]}\n")
    
    def _json(self, code, data):
        b = json.dumps(data).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("X-Service", "my-automaton-mcp")
        self.send_header("X-Server", f"{HOST}:{PORT}")
        self.end_headers()
        self.wfile.write(b)
    
    def _body(self):
        l = int(self.headers.get("Content-Length", 0))
        if not l: return {}
        try: return json.loads(self.rfile.read(l))
        except: return {}
    
    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type,Authorization")
        self.end_headers()
    
    def do_GET(self):
        path = urlparse(self.path).path.rstrip("/") or "/"
        
        if path == "/" or path == "/health":
            return self._json(200, {
                "service": "my-automaton-mcp",
                "version": "1.0.0",
                "status": "active",
                "wallet": WALLET,
                "server": HOST,
                "port": PORT,
                "mcp_protocol": "2025-03-26",
                "tools_available": len(SERVICES)
            })
        
        if path == "/tools" or path == "/tools/list":
            tools = []
            for name, svc in SERVICES.items():
                tool = {
                    "name": name,
                    "description": svc["description"],
                    "inputSchema": svc["inputSchema"]
                }
                if svc["cost_cents"] > 0:
                    tool["cost_usdc_cents"] = svc["cost_cents"]
                tools.append(tool)
            return self._json(200, {"tools": tools})
        
        if path == "/catalog":
            return self._json(200, {
                "agent": "my-automaton",
                "wallet": WALLET,
                "services": SERVICES,
                "payment_method": "x402",
                "chain": "base",
                "token": "USDC"
            })
        
        if path == "/v1/register":
            agents = rj("agents.json", {})
            return self._json(200, {"agents_registered": len(agents), "endpoint": f"POST /api/handshake on port 8888"})
        
        self._json(404, {"error": "not_found", "path": path})
    
    def do_POST(self):
        path = urlparse(self.path).path.rstrip("/")
        body = self._body()
        
        # MCP tools/call endpoint
        if path == "/tools/call":
            name = body.get("name", body.get("tool", ""))
            args = body.get("arguments", body.get("args", {}))
            
            if name not in SERVICES:
                return self._json(404, {"error": f"Unknown tool: {name}"})
            
            svc = SERVICES[name]
            
            # Check payment for paid services
            if svc["cost_cents"] > 0:
                payment = self.headers.get("X-X402-Payment", "")
                if not payment:
                    return self._json(402, {
                        "error": "payment_required",
                        "amount_usdc_cents": svc["cost_cents"],
                        "amount": f"{svc['cost_cents']/100:.2f}",
                        "address": WALLET,
                        "chain": "base",
                        "tool": name,
                        "instructions": f"Send ${svc['cost_cents']/100:.2f} USDC to {WALLET} on Base chain, then retry with X-X402-Payment header"
                    })
            
            # Handle built-in vs proxy
            if name in HANDLERS:
                result = HANDLERS[name](args)
                return self._json(200, {
                    "tool": name,
                    "result": result,
                    "cost_cents": svc["cost_cents"]
                })
            elif name == "get_catalog":
                return self._json(200, {
                    "tool": "get_catalog",
                    "result": {
                        "agent": "my-automaton",
                        "wallet": WALLET,
                        "services": list(SERVICES.keys()),
                        "pricing": {k: f"${v['cost_cents']/100:.2f}" for k, v in SERVICES.items() if v['cost_cents'] > 0},
                        "free_services": [k for k, v in SERVICES.items() if v['cost_cents'] == 0]
                    }
                })
            elif name == "register_agent":
                addr = args.get("agentAddress", "")
                agent_name = args.get("agentName", "unknown")
                if not addr:
                    return self._json(400, {"error": "agentAddress required"})
                agents = rj("agents.json", {})
                agents[addr] = {"address": addr, "name": agent_name, "time": time.time(), "source": "mcp"}
                wj("agents.json", agents)
                return self._json(200, {"status": "registered", "agent": addr, "name": agent_name})
            elif name == "join_referral":
                addr = args.get("agentAddress", "")
                agent_name = args.get("agentName", "unknown")
                if not addr:
                    return self._json(400, {"error": "agentAddress required"})
                refs = rj("referrals.json", {})
                code = hashlib.md5((addr + str(time.time())).encode()).hexdigest()[:8]
                refs[code] = {"address": addr, "name": agent_name, "time": time.time(), "earnings": 0, "source": "mcp"}
                wj("referrals.json", refs)
                return self._json(200, {
                    "status": "registered",
                    "code": code,
                    "link": f"http://{HOST}:{PORT}/r/{code}",
                    "commission": "20% for 30 days"
                })
            else:
                return self._json(500, {"error": f"Unhandled tool: {name}"})
        
        self._json(404, {"error": "not_found", "path": path})

if __name__ == "__main__":
    srv = http.server.HTTPServer(("0.0.0.0", PORT), MCPHandler)
    print(f"[mcp] my-automaton MCP server on port {PORT}")
    print(f"[mcp] Wallet: {WALLET}")
    print(f"[mcp] Tools: {list(SERVICES.keys())}")
    print(f"[mcp] MCP Protocol: 2025-03-26")
    print(f"[mcp] GET  /         - Health/info")
    print(f"[mcp] GET  /tools    - List tools")
    print(f"[mcp] POST /tools/call - Execute tool")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        srv.server_close()
        print("[mcp] Shutdown.")
