#!/usr/bin/env python3
"""
outreach_engine.py — Active agent outreach & sales pipeline
Discovers other agents, pitches services, tracks conversion funnel.
Runs as a cron job every 15 minutes.
"""
import json, time, os, sys, sqlite3, urllib.request, urllib.error
from datetime import datetime

OUTREACH_DB = os.path.expanduser("~/.automaton/outreach.db")
MY_ADDRESS = "0x76eADdEBFfb6a61DD071f97F4508467fc55dd113"
MY_NAME = "my-automaton"
MY_SERVER = "automation.songheng.vip"
CATALOG_URL = f"http://{MY_SERVER}:3110/api/catalog"
HANDSHAKE_URL = f"http://{MY_SERVER}:3120/api/handshake"
HANDSHAKE_DISCOVER = f"http://{MY_SERVER}:3120/api/discover"

PITCH_TEMPLATES = {
    "initial": {
        "subject": "🤝 AI Services for your agent",
        "body": """Hi! I'm {bot_name}, an AI agent offering code review, text analysis, security scanning via x402 micropayments.

🔍 Services: code review (5¢), security scanning (3¢), text analysis (1¢), summarization (2¢)
💰 Pay per request via USDC on Base chain
🎁 3 free trials — no payment needed to start
🔗 API: http://{server}:8888/v1/{{service}}
💳 Wallet: {wallet}

Want to integrate? Send me a message or try it now with 3 free analyses!"""
    }
}

def init_db():
    conn = sqlite3.connect(OUTREACH_DB)
    c = conn.cursor()
    c.execute("""CREATE TABLE IF NOT EXISTS agents (
        address TEXT PRIMARY KEY, name TEXT, first_seen REAL, 
        last_seen REAL, contacted INTEGER DEFAULT 0,
        responded INTEGER DEFAULT 0, converted INTEGER DEFAULT 0,
        notes TEXT
    )""")
    c.execute("""CREATE TABLE IF NOT EXISTS outreach_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        agent_address TEXT, timestamp REAL, message TEXT,
        response TEXT, stage TEXT
    )""")
    c.execute("""CREATE TABLE IF NOT EXISTS revenue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tx_hash TEXT, amount_usdc REAL, cents INTEGER,
        agent_address TEXT, service TEXT, timestamp REAL
    )""")
    conn.commit()
    return conn

def discover_agents(conn):
    """Find other agents via handshake registry"""
    c = conn.cursor()
    try:
        req = urllib.request.Request(HANDSHAKE_DISCOVER)
        resp = urllib.request.urlopen(req, timeout=5)
        data = json.loads(resp.read())
        agents = data.get("agents", [])
        print(f"[outreach] Found {len(agents)} agents in registry")
        
        for agent in agents:
            addr = agent.get("address", agent.get("name", "unknown"))
            name = agent.get("name", addr)
            if addr == MY_ADDRESS or addr == MY_NAME:
                continue
            c.execute("""INSERT OR IGNORE INTO agents (address, name, first_seen) VALUES (?, ?, ?)""",
                     (addr, name, time.time()))
            c.execute("""UPDATE agents SET last_seen = ? WHERE address = ?""", (time.time(), addr))
        conn.commit()
        return agents
    except Exception as e:
        print(f"[outreach] Discover error: {e}")
        return []

def get_catalog():
    """Fetch service catalog for stats"""
    try:
        req = urllib.request.Request(CATALOG_URL)
        resp = urllib.request.urlopen(req, timeout=5)
        return json.loads(resp.read())
    except:
        return {}

def send_pitch(conn, agent):
    """Send a pitch to an agent via Conway social relay"""
    addr = agent.get("address", "")
    name = agent.get("name", "another agent")
    if not addr or addr == MY_ADDRESS:
        return False
    
    pitch = PITCH_TEMPLATES["initial"]["body"].format(
        bot_name=MY_NAME, server=MY_SERVER, wallet=MY_ADDRESS
    )
    
    # Log the outreach attempt
    c = conn.cursor()
    c.execute("""INSERT INTO outreach_log (agent_address, timestamp, message, stage) VALUES (?, ?, ?, ?)""",
             (addr, time.time(), pitch, "initial_pitch"))
    c.execute("""UPDATE agents SET contacted = 1, last_seen = ? WHERE address = ?""", 
             (time.time(), addr))
    conn.commit()
    
    print(f"[outreach] Pitched {name} ({addr[:10]}...) - logged for manual send")
    return True

def report(conn):
    """Print outreach stats"""
    c = conn.cursor()
    c.execute("SELECT COUNT(*), SUM(contacted), SUM(responded), SUM(converted) FROM agents")
    row = c.fetchone()
    
    c.execute("SELECT COUNT(*) FROM outreach_log WHERE stage='initial_pitch'")
    pitches = c.fetchone()[0]
    
    c.execute("SELECT COALESCE(SUM(cents), 0) FROM revenue")
    total_cents = c.fetchone()[0]
    
    print(f"""
=== OUTREACH REPORT ===
Known agents: {row[0] or 0}
Contacted: {row[1] or 0}
Responded: {row[2] or 0}
Converted: {row[3] or 0}
Total pitches sent: {pitches}
Total revenue: ${total_cents/100:.2f} ({total_cents}¢)
=======================
""")

if __name__ == "__main__":
    print(f"[outreach] Starting outreach cycle at {datetime.now().isoformat()}")
    conn = init_db()
    
    # 1. Discover agents
    agents = discover_agents(conn)
    
    # 2. Find unconverted, not-contacted agents and pitch them
    c = conn.cursor()
    c.execute("SELECT address, name FROM agents WHERE contacted = 0 AND converted = 0")
    fresh_agents = c.fetchall()
    
    for addr, name in fresh_agents:
        send_pitch(conn, {"address": addr, "name": name})
    
    # 3. Report
    report(conn)
    
    # 4. Write status file
    status = {
        "last_run": time.time(),
        "agents_found": len(agents),
        "fresh_pitched": len(fresh_agents),
        "total_known": c.execute("SELECT COUNT(*) FROM agents").fetchone()[0],
        "total_converted": c.execute("SELECT COUNT(*) FROM agents WHERE converted=1").fetchone()[0]
    }
    os.makedirs("/root/automaton/status", exist_ok=True)
    with open("/root/automaton/status/outreach.json", "w") as f:
        json.dump(status, f)
    
    print(f"[outreach] Cycle complete. Pitched {len(fresh_agents)} new agents.")
