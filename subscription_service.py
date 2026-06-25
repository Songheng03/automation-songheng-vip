#!/usr/bin/env python3
"""
Subscription Service — Port 4001
Recurring revenue through subscription tiers
Agents subscribe monthly via USDC and get discounted/premium access
"""
import json, http.server, os, time, hashlib

PORT = 4001
DATA_DIR = "/root/automaton/ecosystem_data"
SUBS_FILE = os.path.join(DATA_DIR, "subscriptions.json")
MY_ADDRESS = "0x76eADdEBFfb6A61DD071f97F4508467fc55dd113"
MY_SERVER = "automation.songheng.vip"

os.makedirs(DATA_DIR, exist_ok=True)

PLANS = [
    {"id": "starter", "name": "Starter", "price_cents": 500, "price_display": "$5/mo",
     "requests": 5000, "features": ["50% off x402 endpoints", "Priority support", "Monthly report"]},
    {"id": "pro", "name": "Pro", "price_cents": 1500, "price_display": "$15/mo",
     "requests": 25000, "features": ["Free x402 endpoints", "5% revenue share", "API key", "Custom integrations"]},
    {"id": "enterprise", "name": "Enterprise", "price_cents": 5000, "price_display": "$50/mo",
     "requests": 100000, "features": ["Free x402 endpoints", "10% revenue share", "Dedicated support", "Custom SLA", "White-label available"]}
]

def load_subs():
    try:
        with open(SUBS_FILE) as f: return json.load(f)
    except: return {"subscriptions": []}

def save_subs(s):
    with open(SUBS_FILE, 'w') as f: json.dump(s, f, indent=2)

class SubHandler(http.server.BaseHTTPRequestHandler):
    def log_message(self, format, *args): pass
    
    def _send_json(self, data, status=200):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-X402-Payment, Authorization")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())
    
    def do_OPTIONS(self):
        self._send_json({})
    
    def do_GET(self):
        path = self.path.rstrip("/")
        if path == "/api/plans":
            self._send_json({"plans": PLANS})
        elif path == "/api/subscriptions":
            self._send_json(load_subs())
        elif path == "/" or path == "":
            self._send_json({
                "service": "Subscription Service",
                "endpoints": {
                    "GET /api/plans": "List available plans",
                    "POST /api/subscribe": "Subscribe to a plan (send USDC payment)",
                    "POST /api/cancel": "Cancel subscription",
                    "GET /api/subscriptions": "List all subscriptions"
                }
            })
        else:
            self._send_json({"error": "not_found"}, 404)
    
    def do_POST(self):
        path = self.path.rstrip("/")
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length) if content_length else b"{}"
        try: data = json.loads(body)
        except: data = {}
        
        if path == "/api/subscribe":
            agent_addr = data.get("agentAddress", "")
            plan_id = data.get("planId", "starter")
            payment_tx = self.headers.get("X-X402-Payment", data.get("paymentTx", ""))
            
            if not agent_addr:
                self._send_json({"error": "agentAddress required"}, 400)
                return
            
            # Find plan
            plan = None
            for p in PLANS:
                if p["id"] == plan_id:
                    plan = p
                    break
            if not plan:
                self._send_json({"error": f"Plan '{plan_id}' not found. Options: starter, pro, enterprise"}, 400)
                return
            
            # If no payment, return 402
            if not payment_tx:
                self._send_json({
                    "error": "payment_required",
                    "message": f"Send {plan['price_display']} USDC to {MY_ADDRESS} on Base chain",
                    "payment": {
                        "to": MY_ADDRESS,
                        "amount_cents": plan["price_cents"],
                        "plan": plan_id,
                        "network": "base",
                        "chain_id": 8453
                    }
                }, 402)
                return
            
            # Register subscription
            subs = load_subs()
            sub_id = hashlib.sha256(f"{agent_addr}:{plan_id}:{time.time()}".encode()).hexdigest()[:16]
            subscription = {
                "id": sub_id,
                "agentAddress": agent_addr,
                "planId": plan_id,
                "planName": plan["name"],
                "paymentTx": payment_tx,
                "active": True,
                "startedAt": time.time(),
                "expiresAt": time.time() + 30*86400,
                "requestsUsed": 0,
                "requestsLimit": plan["requests"]
            }
            subs["subscriptions"].append(subscription)
            save_subs(subs)
            
            self._send_json({
                "success": True,
                "subscription": subscription,
                "message": f"Subscribed to {plan['name']}! Expires at {time.ctime(subscription['expiresAt'])}"
            })
        
        elif path == "/api/cancel":
            agent_addr = data.get("agentAddress", "")
            subs = load_subs()
            found = False
            for s in subs["subscriptions"]:
                if s["agentAddress"] == agent_addr and s["active"]:
                    s["active"] = False
                    s["cancelledAt"] = time.time()
                    found = True
            if found:
                save_subs(subs)
                self._send_json({"success": True, "message": "Subscription cancelled"})
            else:
                self._send_json({"error": "No active subscription found"}, 404)
        
        else:
            self._send_json({"error": "not_found"}, 404)

def main():
    server = http.server.HTTPServer(("0.0.0.0", PORT), SubHandler)
    print(f"Subscription service running on port {PORT}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.shutdown()

if __name__ == "__main__":
    main()
