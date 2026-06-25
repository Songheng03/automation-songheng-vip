#!/usr/bin/env python3
"""
subscriptions.py — my-automaton Subscription Manager
Port 4000. Recurring USDC payments on Base chain.
"""
import http.server, json, os, sys, time, hashlib, hmac
from urllib.parse import urlparse

PORT = 4000
WALLET = "0x76eADdEBFfb6a61DD071f97F4508467fc55dd113"
HOST = "automation.songheng.vip"
DATA = os.path.join(os.path.dirname(__file__), "subscription_data")
os.makedirs(DATA, exist_ok=True)

# Plans
PLANS = {
    "starter":  {"price_cents": 500,  "requests_per_month": 5000,  "x402_discount": 50,  "revenue_share": 0},
    "pro":      {"price_cents": 1500, "requests_per_month": 25000, "x402_discount": 100, "revenue_share": 5},
    "enterprise":{"price_cents": 5000,"requests_per_month": 100000,"x402_discount": 100, "revenue_share": 10},
}

def j(*a): return os.path.join(DATA, *a)
def rj(n, d=None):
    try:
        with open(j(n)) as f: return json.load(f)
    except: return d or {}
def wj(n, o):
    with open(j(n), 'w') as f: json.dump(o, f, indent=2)

subs = rj("subscriptions.json", {})
txs = rj("transactions.json", [])

def save_subs(): wj("subscriptions.json", subs)
def save_txs(): wj("transactions.json", txs)

class Handler(http.server.BaseHTTPRequestHandler):
    def log_message(self, f, *a):
        sys.stderr.write(f"[subs] {a[0]} {a[1]} {a[2]}\n")

    def _j(self, code, data):
        b = json.dumps(data).encode()
        self.send_response(code)
        self.send_header("Content-Type","application/json")
        self.send_header("Access-Control-Allow-Origin","*")
        self.send_header("X-Service","my-automaton-subscriptions")
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
        self.send_header("Access-Control-Allow-Headers","Content-Type,X-X402-Payment")
        self.end_headers()

    def do_GET(self):
        p = urlparse(self.path).path.rstrip("/")
        
        # List plans
        if p == "/plans":
            return self._j(200, {"plans": PLANS, "wallet": WALLET, "chain": "base"})
        
        # Check subscription status
        if p.startswith("/subscription/"):
            addr = p.split("/")[-1]
            s = subs.get(addr, {})
            if s:
                s["active"] = s.get("expires_at", 0) > time.time()
                return self._j(200, s)
            return self._j(404, {"error":"no_subscription","address":addr})
        
        # List all active subs (admin)
        if p == "/admin/subscriptions":
            return self._j(200, {
                "total": len(subs),
                "active": sum(1 for s in subs.values() if s.get("expires_at",0) > time.time()),
                "subscriptions": {k: {**v, "active": v.get("expires_at",0) > time.time()} for k,v in subs.items()}
            })
        
        # Stats
        if p == "/stats":
            total_rev = sum(t.get("amount_cents",0) for t in txs)
            return self._j(200, {
                "subscriptions": len(subs),
                "total_revenue_cents": total_rev,
                "transactions": len(txs),
                "plans": list(PLANS.keys())
            })
        
        self._j(404, {"error":"not_found"})

    def do_POST(self):
        p = urlparse(self.path).path.rstrip("/")
        body = self._body()

        # Subscribe
        if p == "/api/subscribe":
            addr = body.get("address", "")
            plan = body.get("plan", "")
            
            if not addr:
                return self._j(400, {"error":"address required"})
            if plan not in PLANS:
                return self._j(400, {"error":"invalid plan","available":list(PLANS.keys())})
            
            plan_info = PLANS[plan]
            
            # Check if already subscribed
            existing = subs.get(addr, {})
            if existing and existing.get("expires_at",0) > time.time():
                existing["plan"] = plan
                existing["price_cents"] = plan_info["price_cents"]
                existing["requests_per_month"] = plan_info["requests_per_month"]
                existing["expires_at"] = existing["expires_at"] + 30*86400
                save_subs()
                return self._j(200, {
                    "status":"extended",
                    "plan":plan,
                    "price_cents":plan_info["price_cents"],
                    "expires_at":existing["expires_at"],
                    "payment_address":WALLET
                })
            
            # New subscription
            sub = {
                "address": addr,
                "plan": plan,
                "price_cents": plan_info["price_cents"],
                "requests_per_month": plan_info["requests_per_month"],
                "x402_discount": plan_info["x402_discount"],
                "revenue_share": plan_info["revenue_share"],
                "created_at": time.time(),
                "expires_at": time.time() + 30*86400,
                "paid": False
            }
            
            subs[addr] = sub
            save_subs()
            
            return self._j(201, {
                "status":"pending_payment",
                "plan":plan,
                "amount_cents":plan_info["price_cents"],
                "amount_usd": f"${plan_info['price_cents']/100:.2f}",
                "payment_address": WALLET,
                "chain": "base",
                "token": "USDC",
                "expires_at": sub["expires_at"],
                "instructions": f"Send ${plan_info['price_cents']/100:.2f} USDC to {WALLET} on Base chain, then confirm with tx hash"
            })

        # Confirm payment
        if p == "/api/confirm":
            addr = body.get("address", "")
            tx_hash = body.get("tx_hash", "")
            
            if not addr or not tx_hash:
                return self._j(400, {"error":"address and tx_hash required"})
            if addr not in subs:
                return self._j(404, {"error":"no_subscription_found","address":addr})
            
            sub = subs[addr]
            sub["paid"] = True
            sub["last_tx"] = tx_hash
            sub["expires_at"] = time.time() + 30*86400
            save_subs()
            
            txs.append({
                "address": addr,
                "tx_hash": tx_hash,
                "amount_cents": sub["price_cents"],
                "plan": sub["plan"],
                "time": time.time()
            })
            save_txs()
            
            return self._j(200, {
                "status":"active",
                "plan":sub["plan"],
                "expires_at":sub["expires_at"],
                "requests_per_month":sub["requests_per_month"],
                "benefits":{
                    "x402_discount": f"{sub['x402_discount']}% off",
                    "revenue_share": f"{sub['revenue_share']}% of referral revenue" if sub['revenue_share'] else "None"
                }
            })
        
        self._j(404, {"error":"not_found","path":p})

if __name__ == "__main__":
    srv = http.server.HTTPServer(("0.0.0.0", PORT), Handler)
    print(f"[subscriptions] LIVE on port {PORT}")
    print(f"[subscriptions] Plans: {list(PLANS.keys())}")
    print(f"[subscriptions] Wallet: {WALLET}")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        srv.server_close()
        print("[subscriptions] Shutdown.")
