#!/usr/bin/env python3
"""
outreach_bot.py — Active agent outreach and revenue engine
Discovers agents, pitches services, tracks conversion funnel
"""
import json, os, time, sqlite3, urllib.request, urllib.error
from datetime import datetime

DB_PATH = "/root/automaton/outreach.db"
MY_ADDR = "0x76eADdEBFfb6a61DD071f97F4508467fc55dd113"
MY_NAME = "my-automaton"
MY_SERVER = "automation.songheng.vip"
GATEWAY = "http://localhost:8888"
HANDSHAKE = "http://localhost:3120"
REFERRAL = "http://localhost:3150"

# Service catalog for pitch
SERVICES = {
    "analyze": {"price": 1, "desc": "Deep text analysis"},
    "summarize": {"price": 2, "desc": "AI summarization"},
    "review": {"price": 5, "desc": "Full code review"},
    "security": {"price": 3, "desc": "Security vulnerability scan"},
    "explain": {"price": 2, "desc": "Code explanation"},
    "refactor": {"price": 5, "desc": "Refactoring suggestions"},
    "complexity": {"price": 2, "desc": "Complexity analysis"},
}

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""CREATE TABLE IF NOT EXISTS agents (
        address TEXT PRIMARY KEY, name TEXT, first_seen REAL, last_seen REAL,
        capabilities TEXT, outreached INTEGER DEFAULT 0, 
        responded INTEGER DEFAULT 0, converted INTEGER DEFAULT 0,
        revenue_cents INTEGER DEFAULT 0
    )""")
    c.execute("""CREATE TABLE IF NOT EXISTS outreach_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        agent_address TEXT, message_type TEXT, message TEXT,
        sent_at REAL, responded INTEGER DEFAULT 0,
        response_text TEXT, response_at REAL
    )""")
    c.execute("""CREATE TABLE IF NOT EXISTS metrics (
        date TEXT PRIMARY KEY,
        outreaches INTEGER DEFAULT 0,
        responses INTEGER DEFAULT 0,
        conversions INTEGER DEFAULT 0,
        revenue_cents INTEGER DEFAULT 0
    )""")
    conn.commit()
    return conn

conn = init_db()

def fetch_json(url, data=None, method="GET"):
    try:
        if data:
            req = urllib.request.Request(url, data=json.dumps(data).encode(),
                                       headers={"Content-Type": "application/json"},
                                       method=method)
        else:
            req = urllib.request.Request(url, method=method)
        resp = urllib.request.urlopen(req, timeout=10)
        return json.loads(resp.read())
    except Exception as e:
        return {"error": str(e)}

def discover_agents():
    """Find agents via handshake registry"""
    result = fetch_json(f"{HANDSHAKE}/api/discover")
    agents = result.get("agents", [])
    # Filter out self and already-converted
    known = set()
    c = conn.cursor()
    c.execute("SELECT address FROM agents WHERE converted = 1")
    for row in c.fetchall():
        known.add(row[0])
    
    new_agents = []
    for a in agents:
        addr = a.get("address", "")
        if addr and addr.upper() != MY_ADDR.upper() and addr not in known:
            new_agents.append(a)
    return new_agents

def outreach_agent(agent):
    """Send a personalized message to an agent"""
    addr = agent.get("address", "")
    name = agent.get("name", "Agent")
    caps = agent.get("capabilities", [])
    
    # Personalize based on capabilities
    relevant = []
    if "text-analysis" in caps:
        relevant.append("text analysis")
    if "code-review" in caps or "security-scanning" in caps:
        relevant.append("code review & security scanning")
    if "storage" in caps:
        relevant.append("data processing")
    
    pitch = (
        f"🤝 Hello {name}! I'm {MY_NAME}, an autonomous agent at {MY_SERVER}. "
    )
    if relevant:
        pitch += f"I noticed you offer {', '.join(relevant)} — I provide complementary services: "
    pitch += (
        f"AI-powered code review, text analysis, security scanning, and summarization. "
        f"Pay per request via USDC on Base (from 1¢). "
        f"3 free trials to get started. "
        f"Wallet: {MY_ADDR} | Catalog: http://{MY_SERVER}:3110/"
    )
    
    # Try to send via Conway social relay (we'll use the inbox/outbox approach)
    # For now, log the outreach
    c = conn.cursor()
    now = time.time()
    c.execute("""INSERT INTO outreach_log (agent_address, message_type, message, sent_at)
                 VALUES (?, 'pitch', ?, ?)""", (addr, pitch, now))
    c.execute("""UPDATE agents SET outreached = outreached + 1, last_seen = ?
                 WHERE address = ?""", (now, addr))
    if c.rowcount == 0:
        c.execute("""INSERT INTO agents (address, name, first_seen, last_seen, capabilities, outreached)
                     VALUES (?, ?, ?, ?, ?, 1)""", 
                  (addr, name, now, now, json.dumps(caps)))
    
    # Update daily metrics
    date = datetime.utcfromtimestamp(now).strftime("%Y-%m-%d")
    c.execute("""INSERT INTO metrics (date, outreaches) VALUES (?, 1)
                 ON CONFLICT(date) DO UPDATE SET outreaches = outreaches + 1""", (date,))
    conn.commit()
    
    return {"pitch": pitch, "agent": addr}

def check_responses():
    """Check for agent responses (incoming messages)"""
    # This would integrate with a message inbox
    # For now, check if any agents have visited the demo
    pass

def get_metrics():
    """Get outreach metrics report"""
    c = conn.cursor()
    c.execute("""SELECT date, outreaches, responses, conversions, revenue_cents 
                 FROM metrics ORDER BY date DESC LIMIT 7""")
    rows = c.fetchall()
    
    c.execute("SELECT COUNT(*) FROM agents")
    total_agents = c.fetchone()[0]
    
    c.execute("SELECT COUNT(*) FROM agents WHERE outreached > 0")
    outreached = c.fetchone()[0]
    
    c.execute("SELECT COUNT(*) FROM agents WHERE converted = 1")
    converted = c.fetchone()[0]
    
    c.execute("SELECT COALESCE(SUM(revenue_cents), 0) FROM agents")
    total_revenue = c.fetchone()[0]
    
    return {
        "total_agents_discovered": total_agents,
        "agents_outreached": outreached,
        "agents_converted": converted,
        "total_revenue_cents": total_revenue,
        "daily": [{"date": r[0], "outreaches": r[1], "responses": r[2], 
                    "conversions": r[3], "revenue_cents": r[4]} for r in rows]
    }

def run_outreach_cycle():
    """Run one outreach cycle"""
    print(f"[{datetime.utcnow().isoformat()}] Running outreach cycle...")
    
    # 1. Discover new agents
    agents = discover_agents()
    print(f"  Found {len(agents)} new agents to reach out to")
    
    # 2. Outreach to each
    results = []
    for agent in agents:
        result = outreach_agent(agent)
        results.append(result)
        print(f"  → Outreach to {agent.get('name', 'unknown')} ({agent.get('address', '')[:10]}...)")
    
    # 3. Check for responses
    check_responses()
    
    # 4. Report metrics
    metrics = get_metrics()
    print(f"  Metrics: {metrics['agents_outreached']} outreached, {metrics['agents_converted']} converted, ${metrics['total_revenue_cents']/100:.2f} revenue")
    
    return results

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "cycle":
        run_outreach_cycle()
    elif len(sys.argv) > 1 and sys.argv[1] == "metrics":
        print(json.dumps(get_metrics(), indent=2))
    else:
        print("Usage: outreach_bot.py [cycle|metrics]")
