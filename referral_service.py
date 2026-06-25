#!/usr/bin/env python3
"""
Referral Service — Port 3150
Agents register and earn 20% commission on referred agent payments for 30 days.
"""
import json, os, time, hashlib, http.server

PORT = 3150
DATA_DIR = "/root/automaton/ecosystem_data"
REFERRALS_FILE = os.path.join(DATA_DIR, "referrals.json")
COMMISSIONS_FILE = os.path.join(DATA_DIR, "commissions.json")
MY_ADDRESS = "0x76eADdEBFfb6a61DD071f97F4508467fc55dd113"

os.makedirs(DATA_DIR, exist_ok=True)

def load_json(path, default=None):
    try:
        with open(path) as f: return json.load(f)
    except: return default or {}

def save_json(path, data):
    with open(path, 'w') as f: json.dump(data, f, indent=2)

class ReferralHandler(http.server.BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass  # Suppress default logging
    
    def _send_json(self, data, status=200):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())
    
    def do_OPTIONS(self):
        self._send_json({})
    
    def do_GET(self):
        path = self.path.rstrip("/")
        
        # GET /api/referral/stats/<address>
        if path.startswith("/api/referral/stats/"):
            addr = path.split("/api/referral/stats/")[1]
            referrals = load_json(REFERRALS_FILE, {"referrals": []})
            commissions = load_json(COMMISSIONS_FILE, {"commissions": {}, "total_paid": 0})
            agent_refs = [r for r in referrals["referrals"] if r.get("referrer") == addr]
            agent_commissions = commissions["commissions"].get(addr, 0)
            self._send_json({
                "referrer": addr,
                "total_referrals": len(agent_refs),
                "referrals": agent_refs,
                "commissions_earned_cents": agent_commissions,
                "total_paid_cents": commissions["total_paid"],
                "commission_rate": "20%"
            })
            return
        
        # GET /r/<code> — referral redirect
        if path.startswith("/r/"):
            code = path.split("/r/")[1]
            referrals = load_json(REFERRALS_FILE, {"referrals": []})
            ref = next((r for r in referrals["referrals"] if r.get("code") == code), None)
            if ref:
                self.send_response(302)
                self.send_header("Location", f"http://automation.songheng.vip:8888/?ref={ref['referrer'][:8]}%20({ref['referrer'][2:10]}...)")
                self.end_headers()
            else:
                self._send_json({"error": "Invalid referral code"}, 404)
            return
        
        # Health check
        if path == "/health":
            self._send_json({"service": "referral", "status": "active", "port": PORT, "commissions_paid": load_json(COMMISSIONS_FILE, {}).get("total_paid", 0)})
            return
        
        self._send_json({"error": "Not found"}, 404)
    
    def do_POST(self):
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length) if content_length else b"{}"
        try:
            data = json.loads(body)
        except:
            data = {}
        
        path = self.path.rstrip("/")
        
        # POST /api/referral/register
        if path == "/api/referral/register":
            agent_addr = data.get("agentAddress", "")
            agent_name = data.get("agentName", "Unknown Agent")
            
            if not agent_addr or len(agent_addr) < 10:
                self._send_json({"error": "Invalid agentAddress"}, 400)
                return
            
            referrals = load_json(REFERRALS_FILE, {"referrals": []})
            
            # Check if already registered
            existing = [r for r in referrals["referrals"] if r.get("referrer") == agent_addr]
            if existing:
                self._send_json({"message": "Already registered", "code": existing[0]["code"], "referral_link": f"http://automation.songheng.vip:{PORT}/r/{existing[0]['code']}"})
                return
            
            # Generate unique referral code
            code = hashlib.sha256(f"{agent_addr}{time.time()}{os.urandom(8).hex()}".encode()).hexdigest()[:8]
            
            ref_entry = {
                "referrer": agent_addr,
                "name": agent_name,
                "code": code,
                "registered_at": time.time(),
                "commission_rate": 0.20,
                "referral_link": f"http://automation.songheng.vip:{PORT}/r/{code}"
            }
            referrals["referrals"].append(ref_entry)
            save_json(REFERRALS_FILE, referrals)
            
            self._send_json({
                "message": "Registered successfully",
                "code": code,
                "referral_link": ref_entry["referral_link"],
                "commission_rate": "20% for 30 days"
            })
            return
        
        # POST /api/referral/earnings — record commission from a referred payment
        if path == "/api/referral/earnings":
            referrer_addr = data.get("referrer")
            amount_cents = data.get("amount_cents", 0)
            if not referrer_addr or amount_cents <= 0:
                self._send_json({"error": "Invalid referrer or amount"}, 400)
                return
            
            commissions = load_json(COMMISSIONS_FILE, {"commissions": {}, "total_paid": 0})
            commission = int(amount_cents * 0.20)  # 20%
            commissions["commissions"][referrer_addr] = commissions["commissions"].get(referrer_addr, 0) + commission
            commissions["total_paid"] += commission
            save_json(COMMISSIONS_FILE, commissions)
            
            self._send_json({"commission_cents": commission, "total_earned": commissions["commissions"][referrer_addr]})
            return
        
        self._send_json({"error": "Not found"}, 404)

def main():
    server = http.server.HTTPServer(("0.0.0.0", PORT), ReferralHandler)
    print(f"Referral service running on port {PORT}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.shutdown()

if __name__ == "__main__":
    main()
