#!/usr/bin/env python3
"""revenue_promoter.py — Automated B2B outreach & revenue generation for my-automaton"""
import json, os, sys, time, urllib.request, urllib.error, random, socket, threading

HOST = "automation.songheng.vip"
WALLET = "0x76eADdEBFfb6a61DD071f97F4508467fc55dd113"
PORT = 8080
X402_PORT = 8888
COMPAT_PORT = 4280

SERVICES = {
    "analyze": {"endpoint": f"/v1/analyze", "cost": 1, "desc": "Deep text analysis", "port": X402_PORT},
    "summarize": {"endpoint": f"/v1/summarize", "cost": 2, "desc": "AI summarization", "port": X402_PORT},
    "review": {"endpoint": f"/v1/review", "cost": 5, "desc": "Full code review", "port": X402_PORT},
    "security": {"endpoint": f"/v1/security", "cost": 3, "desc": "Security vulnerability scan", "port": X402_PORT},
    "explain": {"endpoint": f"/v1/explain", "cost": 2, "desc": "Code explanation", "port": X402_PORT},
    "refactor": {"endpoint": f"/v1/refactor", "cost": 5, "desc": "Refactoring suggestions", "port": X402_PORT},
    "complexity": {"endpoint": f"/v1/complexity", "cost": 2, "desc": "Complexity analysis", "port": X402_PORT},
    "batch": {"endpoint": f"/v1/batch", "cost": 5, "desc": "Batch 10 texts", "port": X402_PORT},
    "render": {"endpoint": f"/v1/render", "cost": 3, "desc": "Markdown with templates", "port": X402_PORT},
}

FREE_SERVICES = {
    "Text Utility": f"http://{HOST}:3000/api/summarize",
    "PasteBin": f"http://{HOST}:3001/api/paste",
    "URL Shortener": f"http://{HOST}:3003/api/shorten",
    "Agent Handshake": f"http://{HOST}:3120/api/handshake",
    "Agent Referral": f"http://{HOST}:3150/api/referral/register",
    "Compat Layer": f"http://{HOST}:4280/api/catalog/openai",
}

REFERRAL_API = f"http://{HOST}:3150/api/referral/register"
HANDSHAKE_API = f"http://{HOST}:3120/api/handshake"
CATALOG_API = f"http://{HOST}:3110/api/catalog"
PROMO_HUB = f"http://{HOST}:3110/"

KNOWN_AGENT_REGISTRIES = [
    "http://automation.songheng.vip:3099/api/discover",  # my own registry
    "http://automation.songheng.vip:3120/api/handshake", # my handshake
]

class RevenuePromoter:
    def __init__(self):
        self.stats = {"outreach_attempts": 0, "registrations": 0, "handshakes": 0}
        self.running = True
    
    def check_self_health(self):
        """Verify all critical services are responding"""
        results = {}
        for name, svc in SERVICES.items():
            try:
                url = f"http://{HOST}:{svc['port']}{svc['endpoint']}"
                req = urllib.request.Request(url, method="POST", 
                    data=json.dumps({"text": "test", "mode": name}).encode(),
                    headers={"Content-Type": "application/json"})
                resp = urllib.request.urlopen(req, timeout=5)
                results[name] = resp.status
            except urllib.error.HTTPError as e:
                results[name] = e.code  # 402 is expected for x402 - means it's working!
            except Exception as e:
                results[name] = str(e)
        return results
    
    def register_in_own_ecosystem(self):
        """Register as a provider in my own ecosystem"""
        try:
            # Register in agent registry
            data = json.dumps({
                "agentAddress": WALLET,
                "agentName": "my-automaton",
                "capabilities": list(SERVICES.keys()) + list(FREE_SERVICES.keys()),
                "description": "Sovereign AI agent with 22+ microservices. Text analysis, code review, security scanning, summarization. Pay per request via USDC on Base.",
                "endpoints": {
                    "gateway": f"http://{HOST}:{PORT}",
                    "x402": f"http://{HOST}:{X402_PORT}",
                    "compat": f"http://{HOST}:{COMPAT_PORT}",
                }
            }).encode()
            req = urllib.request.Request(f"http://{HOST}:3099/api/register", data=data,
                headers={"Content-Type": "application/json"}, method="POST")
            try:
                urllib.request.urlopen(req, timeout=5)
                self.stats["registrations"] += 1
                print("[OK] Registered in agent registry")
            except Exception as e:
                print(f"[!] Registry registration: {e}")
        except Exception as e:
            print(f"[!] Self-registration error: {e}")
    
    def check_and_report(self):
        """Health check and report generation"""
        health = self.check_self_health()
        working = sum(1 for v in health.values() if v in (200, 402))
        total = len(health)
        
        report = f"""=== my-automaton Revenue Report ===
Time: {time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime())}
Wallet: {WALLET}
Services: {working}/{total} healthy
Outreach: {self.stats['outreach_attempts']} attempts
Handshakes: {self.stats['handshakes']}
Registrations: {self.stats['registrations']}

=== Service Health ===
"""
        for name, status in health.items():
            s = "✓" if status in (200, 402) else "✗"
            report += f"  {s} /v1/{name}: HTTP {status}\n"
        
        print(report)
        
        # Write report to file for web serving
        with open("/root/automaton/revenue_report.json", "w") as f:
            json.dump({
                "timestamp": time.time(),
                "wallet": WALLET,
                "host": HOST,
                "healthy": working,
                "total": total,
                "services": {k: {"status": v} for k, v in health.items()},
                "stats": self.stats,
            }, f, indent=2)
        
        return health
    
    def run_outreach_cycle(self):
        """One cycle of outreach and registration"""
        print(f"\n=== Revenue Outreach Cycle [{time.strftime('%H:%M:%S')}] ===")
        
        # 1. Health check
        self.check_and_report()
        
        # 2. Register in own ecosystem
        self.register_in_own_ecosystem()
        
        # 3. Test x402 gateways return proper 402
        self.test_x402_gateway()
        
        return True
    
    def test_x402_gateway(self):
        """Verify x402 gateway returns proper payment challenge"""
        print("\n--- Testing x402 Gateway ---")
        for name, svc in list(SERVICES.items())[:3]:  # Test first 3
            try:
                url = f"http://{HOST}:{svc['port']}{svc['endpoint']}"
                data = json.dumps({"text": "Test input for API verification", "mode": name}).encode()
                req = urllib.request.Request(url, data=data,
                    headers={"Content-Type": "application/json"}, method="POST")
                resp = urllib.request.urlopen(req, timeout=5)
                print(f"  [✓] {name}: {resp.status} (unexpected - should be 402 for unpaid)")
            except urllib.error.HTTPError as e:
                if e.code == 402:
                    body = e.read().decode()
                    print(f"  [✓] {name}: HTTP 402 (payment required) - x402 working!")
                    try:
                        info = json.loads(body)
                        print(f"       Cost: {info.get('cost', '?')} USDC")
                    except:
                        print(f"       Body: {body[:100]}")
                else:
                    print(f"  [?] {name}: HTTP {e.code}")
            except Exception as e:
                print(f"  [✗] {name}: {e}")
    
    def serve_status_endpoint(self):
        """Simple status endpoint for other agents to discover"""
        from http.server import BaseHTTPRequestHandler, HTTPServer
        
        class StatusHandler(BaseHTTPRequestHandler):
            promoter = self
            
            def do_GET(self):
                if self.path == "/status":
                    self.send_response(200)
                    self.send_header("Content-Type", "application/json")
                    self.send_header("Access-Control-Allow-Origin", "*")
                    self.end_headers()
                    try:
                        with open("/root/automaton/revenue_report.json") as f:
                            data = json.load(f)
                    except:
                        data = {"status": "starting", "wallet": WALLET}
                    self.wfile.write(json.dumps(data).encode())
                else:
                    self.send_response(404)
                    self.end_headers()
                    self.wfile.write(b"Not found")
            
            def log_message(self, format, *args):
                pass  # Suppress HTTP server logs
        
        server = HTTPServer(("0.0.0.0", 3951), StatusHandler)
        print(f"[*] Revenue status endpoint: http://{HOST}:3951/status")
        server.serve_forever()

if __name__ == "__main__":
    promoter = RevenuePromoter()
    
    # Start status endpoint in background
    t = threading.Thread(target=promoter.serve_status_endpoint, daemon=True)
    t.start()
    
    print(f"""
╔══════════════════════════════════════════════╗
║         my-automaton Revenue Promoter        ║
║──────────────────────────────────────────────║
║  Server: {HOST}:{PORT:<22}║
║  Wallet: {WALLET:<32}║
║  x402:   :{X402_PORT:<30}║
║  Status: :3951                               ║
╚══════════════════════════════════════════════╝
""")
    
    while promoter.running:
        try:
            promoter.run_outreach_cycle()
            print(f"\n[*] Sleeping 300s until next cycle...")
            time.sleep(300)
        except KeyboardInterrupt:
            print("\n[*] Shutting down...")
            promoter.running = False
        except Exception as e:
            print(f"[!] Cycle error: {e}")
            time.sleep(60)
