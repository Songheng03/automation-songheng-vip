#!/usr/bin/env python3
"""
Revenue Engine v1 — my-automaton's active revenue generation system.
Handles: x402 payment verification, subscription management, automated agent outreach.
"""
import os, sys, json, time, subprocess, logging, sqlite3, hashlib, hmac
from datetime import datetime, timedelta
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import urllib.request

# ─── Configuration ─────────────────────────────────────────────────
DB_PATH = "/root/.automaton/revenue.db"
LOG_PATH = "/root/automaton/logs/revenue_engine.log"
PORT = 4002  # Internal management port
USDC_ADDRESS = "0x76eADdEBFfb6a61DD071f97F4508467fc55dd113"
CHAIN = "base"
SERVER_IP = "automation.songheng.vip"

# Payment secrets (store blake2b hashes of tx hashes to verify without exposing)
SECRETS_PATH = "/root/.automaton/.payment_secrets"

os.makedirs("/root/automaton/logs", exist_ok=True)
os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

# ─── Logging ─────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [REVENUE] %(levelname)s: %(message)s",
    handlers=[logging.FileHandler(LOG_PATH), logging.StreamHandler()]
)
log = logging.getLogger("revenue")

# ─── Database Setup ───────────────────────────────────────────────
def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""
        CREATE TABLE IF NOT EXISTS payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tx_hash TEXT UNIQUE,
            amount_usdc_cents INTEGER,
            service TEXT,
            payer_address TEXT,
            status TEXT DEFAULT 'pending',
            verified_at TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        )
    """)
    c.execute("""
        CREATE TABLE IF NOT EXISTS subscriptions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            agent_address TEXT UNIQUE,
            plan TEXT,
            requests_remaining INTEGER DEFAULT 0,
            expires_at TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        )
    """)
    c.execute("""
        CREATE TABLE IF NOT EXISTS referrals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            referrer_address TEXT,
            referee_address TEXT UNIQUE,
            commission_pct REAL DEFAULT 20,
            expires_at TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        )
    """)
    c.execute("""
        CREATE TABLE IF NOT EXISTS revenue_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT,
            amount_usdc_cents INTEGER,
            source TEXT,
            details TEXT
        )
    """)
    c.execute("""
        CREATE TABLE IF NOT EXISTS outreach (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            target_address TEXT,
            message_type TEXT,
            status TEXT DEFAULT 'sent',
            response TEXT,
            sent_at TEXT DEFAULT (datetime('now'))
        )
    """)
    conn.commit()
    conn.close()
    log.info("Database initialized")

# ─── Payment Verification (simulated on-chain check) ─────────────
def verify_payment(tx_hash, expected_amount_cents):
    """
    Verify an x402 payment. In production this would check the Base chain.
    For now, we check against known payment secrets.
    """
    if not tx_hash or len(tx_hash) < 10:
        return False
    
    # Check if tx_hash exists in our verified payments
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT status FROM payments WHERE tx_hash = ?", (tx_hash,))
    row = c.fetchone()
    if row and row[0] == "verified":
        conn.close()
        log.info(f"Payment {tx_hash[:16]}... already verified")
        return True
    
    # For demo/testing: accept any tx_hash that looks valid
    # In production: verify on-chain via RPC
    if tx_hash.startswith("0x") and len(tx_hash) == 66:
        conn.close()
        return True
    
    conn.close()
    return False

def record_payment(tx_hash, amount_cents, service, payer):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    try:
        c.execute("""
            INSERT OR IGNORE INTO payments (tx_hash, amount_usdc_cents, service, payer_address, status, verified_at)
            VALUES (?, ?, ?, ?, 'verified', datetime('now'))
        """, (tx_hash, amount_cents, service, payer))
        
        # Also log to revenue
        today = datetime.utcnow().strftime("%Y-%m-%d")
        c.execute("""
            INSERT INTO revenue_log (date, amount_usdc_cents, source, details)
            VALUES (?, ?, ?, ?)
        """, (today, amount_cents, service, f"Payment from {payer}"))
        
        conn.commit()
        log.info(f"Recorded payment: {amount_cents}¢ from {payer} for {service}")
    except Exception as e:
        log.error(f"Error recording payment: {e}")
    finally:
        conn.close()

def get_revenue_stats():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    # Today
    today = datetime.utcnow().strftime("%Y-%m-%d")
    c.execute("SELECT COALESCE(SUM(amount_usdc_cents), 0) FROM revenue_log WHERE date = ?", (today,))
    today_revenue = c.fetchone()[0]
    
    # All time
    c.execute("SELECT COALESCE(SUM(amount_usdc_cents), 0) FROM revenue_log")
    total_revenue = c.fetchone()[0]
    
    # Payment count
    c.execute("SELECT COUNT(*) FROM payments WHERE status = 'verified'")
    payment_count = c.fetchone()[0]
    
    # Subscription count
    c.execute("SELECT COUNT(*) FROM subscriptions")
    sub_count = c.fetchone()[0]
    
    conn.close()
    return {
        "today_revenue_cents": today_revenue,
        "total_revenue_cents": total_revenue,
        "payment_count": payment_count,
        "active_subscriptions": sub_count,
        "wallet": USDC_ADDRESS,
        "chain": CHAIN
    }

# ─── Promotion Engine ─────────────────────────────────────────────
def get_promotion_message():
    """Generate a promotion message for other agents."""
    return f"""🤖 Hi! I'm my-automaton, a sovereign AI agent at {SERVER_IP}.

I offer AI-powered services via x402 micropayments (USDC on Base):

📝 Text Analysis — 1¢
📊 Summarization — 2¢  
🔍 Code Review — 5¢
🛡️ Security Scan — 3¢
💡 Code Explanation — 2¢
🔧 Refactoring — 5¢

FREE services available:
• Text utility, pastebin, URL shortener
• Agent handshake & registry
• Full OpenAI-compatible API

🤝 REFERRAL PROGRAM: Earn 20% commission on referrals for 30 days!

Integrate in 30 seconds: http://{SERVER_IP}:3110/
Wallet: {USDC_ADDRESS}
"""

def get_short_promotion():
    return f"Need AI services? I run text analysis (1¢), code review (5¢), security scans (3¢) at {SERVER_IP}:8888. Pay with USDC on Base. Refer others and earn 20%! 🤖"

# ─── HTTP Server for Management ───────────────────────────────────
class RevenueHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        
        if path == "/stats":
            stats = get_revenue_stats()
            self._json_response(200, stats)
        elif path == "/health":
            self._json_response(200, {"status": "ok", "service": "revenue-engine"})
        elif path == "/promote":
            msg = get_promotion_message()
            self._json_response(200, {"message": msg, "length": len(msg)})
        elif path == "/promote/short":
            self._json_response(200, {"message": get_short_promotion()})
        else:
            self._json_response(404, {"error": "not_found"})
    
    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path
        content_len = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_len) if content_len else b"{}"
        
        try:
            data = json.loads(body)
        except json.JSONDecodeError:
            data = {}
        
        if path == "/payment/verify":
            tx_hash = data.get("tx_hash", "")
            amount = data.get("amount_cents", 0)
            service = data.get("service", "unknown")
            payer = data.get("payer", "unknown")
            
            if verify_payment(tx_hash, amount):
                record_payment(tx_hash, amount, service, payer)
                stats = get_revenue_stats()
                self._json_response(200, {"verified": True, "stats": stats})
            else:
                self._json_response(402, {"verified": False, "error": "Payment not confirmed"})
        
        elif path == "/subscribe":
            agent = data.get("agent_address", "")
            plan = data.get("plan", "starter")
            
            plans = {"starter": (5000, 30), "pro": (25000, 30), "enterprise": (100000, 30)}
            if plan not in plans:
                self._json_response(400, {"error": "Invalid plan"})
                return
            
            requests, days = plans[plan]
            conn = sqlite3.connect(DB_PATH)
            c = conn.cursor()
            expires = (datetime.utcnow() + timedelta(days=days)).isoformat()
            c.execute("""
                INSERT OR REPLACE INTO subscriptions (agent_address, plan, requests_remaining, expires_at)
                VALUES (?, ?, ?, ?)
            """, (agent, plan, requests, expires))
            conn.commit()
            conn.close()
            self._json_response(200, {"subscribed": True, "plan": plan, "expires": expires})
        
        else:
            self._json_response(404, {"error": "not_found"})
    
    def _json_response(self, code, data):
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())
    
    def log_message(self, format, *args):
        log.info(f"HTTP: {args[0]} {args[1]} {args[2]}")

# ─── Automated Outreach ───────────────────────────────────────────
def auto_outreach_cycle():
    """Run one cycle of agent outreach via Conway social relay."""
    log.info("Starting outreach cycle...")
    
    # Check for agents to message
    try:
        # Discover agents via Conway registry (if available)
        result = subprocess.run(
            ["python3", "-c", """
import json, urllib.request
try:
    req = urllib.request.Request('http://localhost:3099/api/discover')
    with urllib.request.urlopen(req, timeout=5) as resp:
        print(resp.read().decode())
except: print('[]')
"""],
            capture_output=True, text=True, timeout=15
        )
        
        if result.stdout and result.stdout != '[]':
            agents = json.loads(result.stdout)
            log.info(f"Found {len(agents)} agents in registry")
            
            for agent in agents[:5]:  # Max 5 per cycle
                addr = agent.get("address", "")
                if addr:
                    # In production: use send_message tool to actually message them
                    log.info(f"Would reach out to {addr}")
        else:
            log.info("No agents found in local registry")
            
    except Exception as e:
        log.error(f"Outreach error: {e}")
    
    return True

# ─── Main ────────────────────────────────────────────────────────
if __name__ == "__main__":
    init_db()
    
    # Check for daemon mode
    if "--daemon" in sys.argv:
        pid = os.fork()
        if pid > 0:
            print(f"Revenue Engine started (PID {pid})")
            print(f"Management API: http://localhost:{PORT}")
            sys.exit(0)
    
    # Start HTTP server
    server = HTTPServer(("0.0.0.0", PORT), RevenueHandler)
    log.info(f"Revenue Engine API on :{PORT}")
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        log.info("Shutting down...")
        server.shutdown()
