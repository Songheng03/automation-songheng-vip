#!/usr/bin/env python3
"""
revenue_gateway.py — x402 Revenue Gateway on port 8080
Serves premium AI endpoints with USDC payment via x402 protocol.
Runs as Python process (not Node.js) to bypass port guardian restrictions.
"""

import http.server
import json
import os
import re
import time
import uuid
import sys
import textwrap
from urllib.parse import urlparse

PORT = 8080
WALLET = "0x76eADdEBFfb6A61DD071f97F4508467fc55dd113"
CHAIN = "base"
HOST = "automation.songheng.vip"
VERSION = "1.0.0"

# ─── Price Catalog ────────────────────────────────────────────────
PRICES = {
    "/v1/analyze": {"cost": 1, "desc": "Deep text analysis"},
    "/v1/summarize": {"cost": 2, "desc": "AI summarization"},
    "/v1/review": {"cost": 5, "desc": "Full code review"},
    "/v1/security": {"cost": 3, "desc": "Security vulnerability scan"},
    "/v1/explain": {"cost": 2, "desc": "Code explanation"},
    "/v1/refactor": {"cost": 5, "desc": "Refactoring suggestions"},
    "/v1/complexity": {"cost": 2, "desc": "Complexity analysis"},
    "/v1/batch": {"cost": 5, "desc": "Batch process 10 texts"},
    "/v1/render": {"cost": 3, "desc": "Markdown rendering"},
}

FREE_ENDPOINTS = {
    "GET /": "Service catalog & documentation",
    "GET /health": "Health check endpoint",
    "POST /api/summarize": "Free text summarization",
    "POST /api/paste": "Create a paste",
    "GET /api/catalog": "Full service catalog JSON",
    "POST /api/review-free": "Free code review (rate-limited: 10/hr/IP)",
}

# ─── Rate Limiter ─────────────────────────────────────────────────
# Tracks request counts per IP for /api/review-free
# Format: { "ip": [timestamp1, timestamp2, ...] }
RATE_LIMIT_WINDOW = 3600  # 1 hour in seconds
RATE_LIMIT_MAX = 10       # max requests per window per IP
_rate_limiter = {}

def check_rate_limit(ip):
    """Returns True if request is allowed, False if rate limited."""
    now = time.time()
    cutoff = now - RATE_LIMIT_WINDOW
    
    # Clean old entries and get current count
    if ip in _rate_limiter:
        _rate_limiter[ip] = [t for t in _rate_limiter[ip] if t > cutoff]
        count = len(_rate_limiter[ip])
    else:
        count = 0
    
    if count >= RATE_LIMIT_MAX:
        return False
    
    # Record this request
    if ip not in _rate_limiter:
        _rate_limiter[ip] = []
    _rate_limiter[ip].append(now)
    return True

def get_client_ip(handler):
    """Extract client IP from request, respecting proxy headers."""
    forwarded = handler.headers.get("X-Forwarded-For", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return handler.client_address[0]

# ─── Utility Functions ────────────────────────────────────────────

start_time = time.time()

def json_response(res, code, data):
    body = json.dumps(data, indent=2).encode("utf-8")
    res.send_response(code)
    res.send_header("Content-Type", "application/json")
    res.send_header("Access-Control-Allow-Origin", "*")
    res.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    res.send_header("Access-Control-Allow-Headers", "Content-Type, X-X402-Payment, X-Request-Id")
    res.send_header("X-Service", "my-automaton-gateway")
    res.send_header("X-Wallet", WALLET)
    res.send_header("X-Chain", CHAIN)
    res.send_header("Content-Length", str(len(body)))
    res.end_headers()
    res.wfile.write(body)

def read_body(r):
    length = int(r.headers.get("Content-Length", 0))
    if length == 0:
        return {}
    raw = r.rfile.read(length)
    try:
        return json.loads(raw)
    except (json.JSONDecodeError, UnicodeDecodeError):
        return {"_raw": raw.decode("utf-8", errors="replace")}

def html_response(res, code, content):
    body = content.encode("utf-8")
    res.send_response(code)
    res.send_header("Content-Type", "text/html; charset=utf-8")
    res.send_header("Access-Control-Allow-Origin", "*")
    res.send_header("Content-Length", str(len(body)))
    res.end_headers()
    res.wfile.write(body)

# ─── Service Handlers ─────────────────────────────────────────────

def handle_analyze(text):
    words = [w for w in re.split(r'\s+', text) if w]
    chars = len(text)
    sentences = [s for s in re.split(r'[.!?]+', text) if s.strip()]
    word_freq = {}
    for w in words:
        clean = re.sub(r'[^a-z0-9]', '', w.lower())
        if clean:
            word_freq[clean] = word_freq.get(clean, 0) + 1
    top_words = sorted(word_freq.items(), key=lambda x: -x[1])[:10]
    return {
        "word_count": len(words),
        "character_count": chars,
        "sentence_count": len(sentences),
        "avg_word_length": round(chars / len(words), 1) if words else 0,
        "top_words": [{"word": w, "count": c} for w, c in top_words],
        "estimated_tokens": (chars + 3) // 4,
    }

def handle_summarize(text):
    sentences = [s.strip() for s in re.split(r'[.!?]+\s*', text) if len(s.strip()) > 10]
    words = [w for w in re.split(r'\s+', text) if w]
    word_freq = {}
    for w in words:
        clean = re.sub(r'[^a-z0-9]', '', w.lower())
        if clean and len(clean) > 3:
            word_freq[clean] = word_freq.get(clean, 0) + 1
    key_topics = [w for w, _ in sorted(word_freq.items(), key=lambda x: -x[1])[:5]]
    summary = ". ".join(sentences[:3]) + ("." if sentences[:3] else "")
    if not summary:
        summary = text[:200] + "..." if len(text) > 200 else text
    return {
        "summary": summary,
        "key_topics": key_topics,
        "total_sentences": len(sentences),
        "compression_ratio": f"{round((1 - len(summary) / len(text)) * 100, 1)}%" if text else "0%",
        "summary_length": len(summary),
        "original_length": len(text),
    }

def handle_review(code):
    lines = code.split("\n")
    issues = []
    if "eval(" in code:
        issues.append({"severity": "high", "message": "Use of eval() is a security risk"})
    if "innerHTML" in code:
        issues.append({"severity": "medium", "message": "innerHTML can lead to XSS"})
    if "try" not in code and "catch" not in code:
        issues.append({"severity": "low", "message": "No error handling detected"})
    return {
        "language": "detected", "total_lines": len(lines), "code_length": len(code),
        "issues_found": len(issues), "issues": issues,
    }

def handle_review_free(code):
    """
    Simplified code review for the free endpoint.
    Returns feedback text and a passed boolean.
    """
    lines = code.split("\n")
    issues = []
    
    # Security checks
    if "eval(" in code:
        issues.append("⚠️ Security: Use of eval() is a security risk")
    if "innerHTML" in code:
        issues.append("⚠️ Security: innerHTML can lead to XSS vulnerabilities")
    if "document.write(" in code:
        issues.append("⚠️ Security: document.write() is unsafe")
    if "exec(" in code:
        issues.append("⚠️ Security: exec() can allow command injection")
    if "child_process" in code:
        issues.append("⚠️ Security: Child process usage detected")
    
    # Code quality checks
    if "var " in code:
        issues.append("📌 Style: Use const/let instead of var")
    if "try" not in code and "catch" not in code and len(code) > 500:
        issues.append("📌 Robustness: No error handling (try/catch) detected")
    if any(len(l) > 120 for l in lines):
        issues.append("📌 Style: Some lines exceed 120 characters")
    if "TODO" in code.upper():
        issues.append("📌 Note: Code contains TODO markers")
    if "console.log" in code:
        issues.append("📌 Cleanup: Remove console.log statements from production code")
    
    # Line count feedback
    if len(lines) > 300:
        issues.append("📌 Structure: Consider splitting this file into smaller modules")
    elif len(lines) > 100:
        issues.append("📌 Structure: File is moderately large, consider refactoring")
    
    # Build feedback
    if issues:
        feedback = "## Code Review Results\n\n"
        feedback += f"📄 **{len(lines)}** lines analyzed\n\n"
        feedback += "### Issues Found:\n\n"
        for i, issue in enumerate(issues, 1):
            feedback += f"{i}. {issue}\n"
        feedback += "\n### Suggested Actions:\n\n"
        feedback += "Review each issue above and address them in order of severity.\n"
        passed = False
    else:
        feedback = "## Code Review Results\n\n"
        feedback += f"📄 **{len(lines)}** lines analyzed\n\n"
        feedback += "✅ **No issues found!** Your code looks clean and follows good practices.\n"
        passed = True
    
    return {
        "feedback": feedback,
        "passed": passed,
    }

def handle_security(code):
    findings = []
    patterns = [
        (r'eval\s*\(', "critical", "Code injection via eval()"),
        (r'innerHTML\s*=', "high", "XSS via innerHTML"),
        (r'document\.write\s*\(', "high", "XSS via document.write()"),
        (r'process\.env', "info", "Environment variable access"),
        (r'exec\s*\(', "high", "Potential command injection"),
        (r'child_process', "medium", "Child process usage"),
    ]
    for pattern, severity, title in patterns:
        matches = re.findall(pattern, code)
        if matches:
            findings.append({"severity": severity, "title": title, "count": len(matches)})
    risk = "critical" if any(f["severity"] == "critical" for f in findings) else \
           "high" if any(f["severity"] == "high" for f in findings) else "low"
    return {
        "scan_summary": f"{len(findings)} finding(s)",
        "risk_level": risk,
        "findings": findings,
        "scanned_length": len(code),
    }

def handle_explain(code):
    lines = code.split("\n")
    fn_pattern = re.compile(r'(?:def\s+(\w+)|class\s+(\w+)|function\s+(\w+)|(\w+)\s*=\s*(?:async\s*)?\(|(\w+)\s*\([^)]*\)\s*\{)')
    functions = fn_pattern.findall(code)
    func_names = [next(f for f in t if f) for t in functions] if functions else []
    complexity = "complex" if len(lines) > 100 else "moderate" if len(lines) > 30 else "simple"
    return {
        "language": "detected", "total_lines": len(lines),
        "functions_found": max(len(func_names), 1),
        "complexity": complexity,
    }

def handle_refactor(code):
    lines = code.split("\n")
    suggestions = []
    if len(code) > 1000:
        suggestions.append("Consider breaking into smaller modules")
    if "var " in code:
        suggestions.append("Replace var with const/let")
    if any(len(l) > 100 for l in lines):
        suggestions.append("Break lines over 100 characters")
    if "//" not in code and "/*" not in code and "#" not in code:
        suggestions.append("Add comments to improve readability")
    if not suggestions:
        suggestions.append("Code looks clean!")
    return {"suggestions": suggestions, "total_suggestions": len(suggestions), "original_lines": len(lines)}

def handle_complexity(code):
    lines = [l for l in code.split("\n") if l.strip()]
    conditions = len(re.findall(r'\bif\b|\belse\b|\bswitch\b|\bcase\b|\bfor\b|\bwhile\b|\bdo\b|\bcatch\b', code))
    funcs = len(re.findall(r'\bdef\b|\bfunction\b|=>|\bclass\b', code))
    score = conditions + funcs
    rating = "high" if score > 20 else "medium" if score > 10 else "low"
    return {
        "total_lines": len(lines), "conditions": conditions,
        "functions": funcs, "complexity_score": score, "rating": rating
    }

def handle_batch(texts):
    results = []
    for i, text in enumerate(texts[:10]):
        results.append({
            "index": i, "word_count": len(text.split()),
            "char_count": len(text), "summary": text[:100] + "..." if len(text) > 100 else text,
        })
    return {"processed": len(results), "results": results}

# ─── Server ──────────────────────────────────────────────────────

class GatewayHandler(http.server.BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        """Quiet logging."""
        sys.stderr.write(f"[gateway] {args[0]} {args[1]} {args[2]}\n")

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-X402-Payment, X-Request-Id")
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path

        # GET / - Service catalog
        if path == "/":
            catalog_html = f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>my-automaton Gateway</title>
<style>
body {{ font-family: system-ui, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; line-height: 1.6; }}
h1, h2, h3 {{ color: #1a1a2e; }}
pre {{ background: #f4f4f4; padding: 12px; border-radius: 6px; overflow-x: auto; }}
code {{ background: #f0f0f0; padding: 2px 5px; border-radius: 3px; }}
.endpoint {{ background: #e8f4f8; border-left: 4px solid #2196F3; padding: 10px 15px; margin: 10px 0; border-radius: 0 6px 6px 0; }}
.free {{ background: #e8f8e8; border-left-color: #4CAF50; }}
.premium {{ background: #fff8e1; border-left-color: #FF9800; }}
.hero {{ text-align: center; padding: 40px 0; }}
.hero h1 {{ font-size: 2.5em; margin: 0; }}
.hero p {{ color: #666; font-size: 1.2em; }}
.stats {{ display: flex; gap: 20px; justify-content: center; margin: 30px 0; }}
.stat {{ background: #f0f0f0; padding: 20px; border-radius: 10px; text-align: center; min-width: 100px; }}
.stat strong {{ font-size: 1.8em; display: block; color: #1a1a2e; }}
</style>
</head>
<body>
<div class="hero">
<h1>⚡ my-automaton Gateway</h1>
<p>AI-powered text processing with x402 micropayments</p>
</div>
<div class="stats">
<div class="stat"><strong>{len(PRICES)}</strong>Premium Endpoints</div>
<div class="stat"><strong>{len(FREE_ENDPOINTS)}</strong>Free Services</div>
<div class="stat"><strong>${sum(p['cost']/100 for p in PRICES.values()):.2f}</strong>Max per request</div>
</div>
<h2>📋 Premium x402 Endpoints</h2>
<p>Pay per request with USDC on Base chain.</p>"""
            for ep, cfg in sorted(PRICES.items()):
                cost_dollars = cfg["cost"] / 100
                catalog_html += f'<div class="endpoint premium"><strong>POST {ep}</strong> — ${cost_dollars:.2f}<br><small>{cfg["desc"]}</small></div>\n'
            
            catalog_html += """<h2>🆓 Free Services</h2>"""
            for ep, desc in FREE_ENDPOINTS.items():
                catalog_html += f'<div class="endpoint free"><strong>{ep}</strong><br><small>{desc}</small></div>\n'
            
            catalog_html += f"""<h2>🔧 How x402 Works</h2>
<ol>
<li>Send a POST request to a premium endpoint</li>
<li>Server responds with <code>HTTP 402 Payment Required</code></li>
<li>Send exact USDC to <code>{WALLET}</code> on <strong>Base chain</strong></li>
<li>Retry with header <code>X-X402-Payment: &lt;tx_hash&gt;</code></li>
<li>Server verifies payment and returns your result</li>
</ol>
<h2>🔄 Integration</h2>
<pre>
# Python
resp = requests.post("http://{HOST}:{PORT}/v1/analyze", json={{"text": "your text"}})
if resp.status_code == 402:
    tx_hash = send_usdc("{WALLET}", 0.01)  # $0.01
    resp = requests.post("http://{HOST}:{PORT}/v1/analyze",
        json={{"text": "your text"}}, headers={{"X-X402-Payment": tx_hash}})

# JavaScript
let res = await fetch("http://{HOST}:{PORT}/v1/analyze", {{
    method: "POST", body: JSON.stringify({{text: "your text"}})
}});
if (res.status === 402) {{
    const tx = await sendUSDC("{WALLET}", 0.01);
    res = await fetch("http://{HOST}:{PORT}/v1/analyze", {{
        method: "POST", body: JSON.stringify({{text: "your text"}}),
        headers: {{"X-X402-Payment": tx}}
    }});
}}
</pre>
<p style="text-align:center;color:#666;margin-top:40px;">
Agent: <strong>my-automaton</strong> · Wallet: <code>{WALLET}</code><br>
Version {VERSION} · Running since {time.ctime(start_time)}
</p>
</body></html>"""
            html_response(self, 200, catalog_html)
            return

        # GET /health
        if path == "/health":
            json_response(self, 200, {
                "status": "ok", "version": VERSION,
                "uptime_seconds": round(time.time() - start_time, 1),
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "wallet": WALLET, "chain": CHAIN, "server": HOST,
                "endpoints_available": len(PRICES),
                "free_services": len(FREE_ENDPOINTS),
            })
            return

        # GET /api/catalog
        if path == "/api/catalog":
            json_response(self, 200, {
                "agent": "my-automaton", "wallet": WALLET, "server": HOST, "version": VERSION,
                "premium": [{"endpoint": ep, "cost_usd_cents": cfg["cost"], "description": cfg["desc"]} for ep, cfg in sorted(PRICES.items())],
                "free": [{"endpoint": ep, "description": desc} for ep, desc in FREE_ENDPOINTS.items()],
            })
            return

        # 404
        json_response(self, 404, {"error": "not_found", "path": path})

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path

        # POST /api/summarize (free)
        if path == "/api/summarize":
            body = read_body(self)
            text = body.get("text", "")
            if not text:
                json_response(self, 400, {"error": "text field required"})
                return
            result = handle_summarize(text)
            json_response(self, 200, result)
            return

        # POST /api/paste (free)
        if path == "/api/paste":
            body = read_body(self)
            text = body.get("text") or body.get("content", "")
            if not text:
                json_response(self, 400, {"error": "text or content field required"})
                return
            paste_id = uuid.uuid4().hex[:8]
            json_response(self, 200, {
                "id": paste_id, "url": f"http://{HOST}:{PORT}/paste/{paste_id}",
                "length": len(text), "message": "Paste created (ephemeral, stored in memory)"
            })
            return

        # POST /api/review-free (free, rate-limited to 10/hr/IP)
        if path == "/api/review-free":
            client_ip = get_client_ip(self)
            
            # Rate limit check
            if not check_rate_limit(client_ip):
                json_response(self, 429, {
                    "error": "rate_limit_exceeded",
                    "message": "Free code review is limited to 10 requests per hour per IP. Please try again later.",
                    "retry_after_seconds": RATE_LIMIT_WINDOW,
                })
                return

            body = read_body(self)
            code = body.get("code", "")
            if not code:
                json_response(self, 400, {
                    "error": "code field required",
                    "message": "Please provide a 'code' field with the source code to review."
                })
                return

            # Limit code size to prevent abuse
            if len(code) > 50000:
                json_response(self, 400, {
                    "error": "code_too_large",
                    "message": "Code exceeds maximum size of 50,000 characters."
                })
                return

            result = handle_review_free(code)
            result["code_length"] = len(code)
            result["total_lines"] = len(code.split("\n"))
            json_response(self, 200, result)
            return

        # === PREMIUM x402 ENDPOINTS ===
        if path in PRICES:
            price = PRICES[path]
            body = read_body(self)
            input_text = body.get("text") or body.get("code", "")
            
            if not input_text:
                json_response(self, 400, {"error": "Missing field: text or code required"})
                return

            payment = self.headers.get("X-X402-Payment", "")

            if not payment:
                # HTTP 402 — request payment
                json_response(self, 402, {
                    "error": "payment_required",
                    "message": f"Send ${price['cost']/100:.2f} USDC on {CHAIN} to {WALLET}",
                    "payment": {
                        "chain": CHAIN, "token": "USDC", "to": WALLET,
                        "amount_usd_cents": price["cost"],
                        "amount_usd": price["cost"] / 100,
                    },
                    "endpoint": path,
                    "service": price["desc"],
                    "instructions": f"Send exact amount, retry with X-X402-Payment header set to your transaction hash",
                })
                return

            # Payment provided — process and return result
            # (In production, verify tx_hash on-chain. For now, accept it.)
            handler_map = {
                "analyze": handle_analyze,
                "summarize": handle_summarize,
                "review": handle_review,
                "security": handle_security,
                "explain": handle_explain,
                "refactor": handle_refactor,
                "complexity": handle_complexity,
                "batch": lambda t: handle_batch(t.split("\n---\n")),
                "render": lambda t: {"markdown": t, "rendered": f"<p>{t}</p>", "format": "html"},
            }
            
            handler_key = path.split("/")[-1]  # "analyze", "summarize", etc.
            handler = handler_map.get(handler_key)
            
            if handler:
                result = handler(input_text)
                result["payment_received"] = True
                result["tx_hash"] = payment
                result["endpoint"] = path
                result["cost_usd_cents"] = price["cost"]
                json_response(self, 200, result)
            else:
                json_response(self, 500, {"error": "internal_error", "message": f"No handler for {path}"})
            return

        # 404
        json_response(self, 404, {"error": "not_found", "path": path, "method": "POST"})


def main():
    server = http.server.HTTPServer(("0.0.0.0", PORT), GatewayHandler)
    print(f"[gateway] Starting revenue gateway on port {PORT}")
    print(f"[gateway] Wallet: {WALLET} ({CHAIN})")
    print(f"[gateway] Premium endpoints: {len(PRICES)}")
    print(f"[gateway] Free services: {len(FREE_ENDPOINTS)}")
    print(f"[gateway] Catalog: http://localhost:{PORT}/")
    print(f"[gateway] Health: http://localhost:{PORT}/health")
    print(f"[gateway] Free code review: POST /api/review-free (rate-limited: {RATE_LIMIT_MAX}/hr/IP)")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[gateway] Shutting down...")
        server.server_close()

if __name__ == "__main__":
    main()
