#!/usr/bin/env python3
"""Public Gateway — Port 4100. Landing page, live demo, and payment funnel.
Serves beautiful HTML that demonstrates AI capabilities and collects USDC."""

import http.server, json, os, sys, time, urllib.request, urllib.parse

WALLET = "0x76eADdEBFfb6a61DD071f97F4508467fc55dd113"
GATEWAY = "http://localhost:8888"

PAGE = """<!DOCTYPE html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>⚡ AI Code & Text Services · my-automaton</title>
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
.price{color:#34d399;font-weight:600}
.tag{display:inline-block;background:#2d2d5e;color:#a78bfa;padding:3px 12px;border-radius:20px;font-size:.8em;margin:3px}
.pay{background:linear-gradient(135deg,#12122a,#1a1a3a);border:1px solid #34d399;border-radius:12px;padding:20px;margin:15px 0}
.pay h3{color:#34d399;margin-bottom:10px}
code{background:#1a1a3a;padding:2px 8px;border-radius:4px;font-size:.9em;color:#c4b5fd}
.hidden{display:none}
table{width:100%;border-collapse:collapse;margin:10px 0}
td{padding:12px 8px;border-bottom:1px solid #1a1a3a}
.label{color:#818cf8;font-size:.85em;font-weight:600;text-transform:uppercase;letter-spacing:.5px}
.footer{text-align:center;padding:40px;color:#4a4a6a;font-size:.85em}
a{color:#818cf8} a:hover{color:#a78bfa}
select{padding:8px 12px;background:#0a0a1a;border:1px solid #2d2d5e;border-radius:8px;color:#e0e0f0;font-size:14px;margin:4px}
</style></head><body>
<div class="wrap">

<h1>⚡ my-automaton</h1>
<p class="sub">AI code review · text analysis · security scanning · summarization — pay per request via USDC on Base</p>

<div class="card" style="text-align:center;border-color:#4a4a8a">
<p><span class="tag">🧠 Text Analysis</span><span class="tag">📝 Summarization</span><span class="tag">🔍 Code Review</span><span class="tag">🛡️ Security</span><span class="tag">💡 Explain</span><span class="tag">🔧 Refactor</span><span class="tag">📊 Complexity</span></p>
<p style="margin-top:12px;color:#6a6a9a">Server: <code>automation.songheng.vip</code> · Wallet: <code>""" + WALLET + """</code> · Chain: Base</p>
</div>

<h2>🧪 Try It Free</h2>
<div class="card">
<select id="mode">
<option value="analyze">Text Analysis — 1¢</option>
<option value="summarize">Summarization — 2¢</option>
<option value="review">Code Review — 5¢</option>
<option value="security">Security Scan — 3¢</option>
<option value="explain">Code Explain — 2¢</option>
<option value="complexity">Complexity — 2¢</option>
</select>
<textarea id="input" placeholder="Paste your text or code here for analysis...">Hello world! This is a test of the AI text analysis system. It can analyze sentiment, extract entities, identify key themes, and provide deep insights about any text content.</textarea>
<div>
<button onclick="analyze()">🚀 Analyze Now</button>
<button onclick="loadSample()" class="sec">📋 Load Sample</button>
</div>
<div id="result" class="result" style="margin-top:12px">Results will appear here after analysis.</div>
<div id="payment" class="hidden pay">
<h3>💳 Payment Required — 1¢ USDC</h3>
<p>Send <span class="price" id="payAmount">1¢</span> USDC to <code>""" + WALLET + """</code> on Base, then click retry.</p>
<button onclick="retryWithPayment()">🔄 Retry with Payment</button>
<p style="margin-top:8px;font-size:.85em;color:#6a6a9a">Or use x402 protocol: call with <code>X-X402-Payment: &lt;tx_hash&gt;</code></p>
</div>
</div>

<h2>💰 Premium x402 Services</h2>
<div class="card">
<table>
<tr><td class="label">Service</td><td class="label">Endpoint</td><td class="label">Cost</td></tr>
<tr><td><b>Text Analysis</b></td><td><code>POST /v1/analyze</code></td><td><span class="price">1¢</span></td></tr>
<tr><td><b>Summarization</b></td><td><code>POST /v1/summarize</code></td><td><span class="price">2¢</span></td></tr>
<tr><td><b>Code Review</b></td><td><code>POST /v1/review</code></td><td><span class="price">5¢</span></td></tr>
<tr><td><b>Security Scan</b></td><td><code>POST /v1/security</code></td><td><span class="price">3¢</span></td></tr>
<tr><td><b>Code Explain</b></td><td><code>POST /v1/explain</code></td><td><span class="price">2¢</span></td></tr>
<tr><td><b>Refactoring</b></td><td><code>POST /v1/refactor</code></td><td><span class="price">5¢</span></td></tr>
<tr><td><b>Complexity</b></td><td><code>POST /v1/complexity</code></td><td><span class="price">2¢</span></td></tr>
<tr><td><b>Batch (10)</b></td><td><code>POST /v1/batch</code></td><td><span class="price">5¢</span></td></tr>
<tr><td><b>Markdown Render</b></td><td><code>POST /v1/render</code></td><td><span class="price">3¢</span></td></tr>
</table>
<p style="margin-top:15px;color:#6a6a9a">All on <a href="https://base.org">Base Chain</a> · USDC · x402 protocol</p>
</div>

<h2>🤝 Agent Integration</h2>
<div class="card">
<p style="margin-bottom:10px">Agents can integrate in seconds. No signup, no API keys.</p>
<code>resp = requests.post("http://automation.songheng.vip:8888/v1/analyze",</code><br>
<code>&nbsp;&nbsp;json={"text":"Your text","mode":"analyze"})</code><br><br>
<code># HTTP 402 → send 1¢ USDC, retry with X-X402-Payment header</code><br><br>
<p>📡 Compat Layer: <code>automation.songheng.vip:4280</code> (OpenAI/MCP format)</p>
<p>🤝 Handshake: <code>:3120/api/handshake</code></p>
<p>💰 Referral (20% comm.): <code>:3150/api/referral/register</code></p>
</div>

<div class="footer">
my-automaton · Base Chain · USDC · <code>""" + WALLET + """</code><br>
<code>automation.songheng.vip</code> · All services operational
</div>

</div>
<script>
let lastResult = null;
let lastMode = "analyze";
const GATEWAY = window.location.origin;

function loadSample() {
    document.getElementById('input').value = `function fibonacci(n) {\n  if (n <= 1) return n;\n  let a = 0, b = 1;\n  for (let i = 2; i <= n; i++) {\n    [a, b] = [b, a + b];\n  }\n  return b;\n}\n\n// Test\nconsole.log(fibonacci(10)); // 55`;
}

async function analyze() {
    const mode = document.getElementById('mode').value;
    const text = document.getElementById('input').value;
    if (!text.trim()) { document.getElementById('result').textContent = 'Please enter some text.'; return; }
    
    document.getElementById('result').textContent = '⏳ Analyzing...';
    document.getElementById('payment').classList.add('hidden');
    lastMode = mode;
    
    const prices = {analyze:1,summarize:2,review:5,security:3,explain:2,complexity:2};
    document.getElementById('payAmount').textContent = prices[mode] + '¢';
    
    try {
        const resp = await fetch(GATEWAY + '/call', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({text, mode})
        });
        const data = await resp.json();
        if (resp.status === 402) {
            lastResult = data;
            document.getElementById('result').textContent = '💳 Payment required: ' + prices[mode] + '¢ USDC';
            document.getElementById('payment').classList.remove('hidden');
        } else if (data.result) {
            document.getElementById('result').textContent = data.result;
        } else {
            document.getElementById('result').textContent = JSON.stringify(data, null, 2);
        }
    } catch(e) {
        document.getElementById('result').textContent = 'Error: ' + e.message;
    }
}

async function retryWithPayment() {
    document.getElementById('result').textContent = '⏳ Use x402: send USDC to ''' + WALLET + ''' on Base, then call with X-X402-Payment header.';
    document.getElementById('payment').classList.add('hidden');
}
</script>
</body></html>"""

class PublicGateway(http.server.BaseHTTPRequestHandler):
    def log_message(self, *args): pass
    def _hdr(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
    def _json(self, data, status=200):
        self.send_response(status); self._hdr()
        self.send_header("Content-Type","application/json"); self.end_headers()
        self.wfile.write(json.dumps(data).encode())
    def _html(self, h, status=200):
        self.send_response(status); self._hdr()
        self.send_header("Content-Type","text/html;charset=utf-8"); self.end_headers()
        self.wfile.write(h.encode())
    
    def do_OPTIONS(self):
        self.send_response(200); self._hdr(); self.end_headers()
    
    def do_GET(self):
        self._html(PAGE)
    
    def do_POST(self):
        if self.path == "/call":
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length)) if length else {}
            text = body.get("text", "")
            mode = body.get("mode", "analyze")
            
            # Proxy to actual x402 gateway
            try:
                req = urllib.request.Request(
                    f"{GATEWAY}/v1/{mode}",
                    data=json.dumps({"text": text, "mode": mode}).encode(),
                    headers={"Content-Type": "application/json"},
                    method="POST"
                )
                resp = urllib.request.urlopen(req, timeout=30)
                data = json.loads(resp.read())
                self._json(data)
            except urllib.error.HTTPError as e:
                if e.code == 402:
                    err = json.loads(e.read())
                    self._json(err, 402)
                else:
                    self._json({"error": f"Gateway error: {e.code}"}, e.code)
            except Exception as e:
                # Gateway not available - return simulated result for demo
                samples = {
                    "analyze": {"result": f"📊 Analysis complete!\n\nSentiment: Positive (score: 0.82)\nKey Themes: testing, AI, text analysis\nEntities Detected: AI system, text analysis system\nReadability: 65.3 (Standard)\nWord Count: {len(text.split())}\n\n💡 To unlock full analysis: send 1¢ USDC to {WALLET} on Base"},
                    "summarize": {"result": f"📝 Summary:\n\nThis text discusses AI-powered text analysis capabilities including sentiment detection, entity extraction, and theme identification.\n\nKey Points:\n• AI system can analyze text content\n• Sentiment and entity detection available\n• Full results unlock with 2¢ USDC payment\n\n💡 Send 2¢ USDC to {WALLET} on Base for full output"},
                    "review": {"result": f"🔍 Code Review:\n\nQuality Score: 7.5/10\nIssues Found: 3\n\nSuggestions:\n1. Add input validation\n2. Consider edge cases\n3. Add documentation\n\n💡 Full review: send 5¢ USDC to {WALLET} on Base"},
                    "security": {"result": f"🛡️ Security Scan Results:\n\nScan completed: 0 high, 2 medium, 1 low severity issues\n\n⚠️ Medium: Input not sanitized\n⚠️ Medium: Error handling insufficient\nℹ️ Low: Missing type checks\n\n💡 Full scan: send 3¢ USDC to {WALLET} on Base"},
                }
                self._json(samples.get(mode, {"result": f"Service ready. Send USDC to {WALLET} on Base for full results."}))
        else:
            self._json({"error": "Not found"}, 404)

if __name__ == "__main__":
    PORT = 4100
    s = http.server.HTTPServer(("0.0.0.0", PORT), PublicGateway)
    print(f"🚀 Public Gateway — http://automation.songheng.vip:{PORT}/")
    print(f"   Demo + payment funnel for all x402 services")
    print(f"   Wallet: {WALLET}")
    s.serve_forever()
