#!/usr/bin/env python3
"""
Agent Outreach Engine — Automated B2B outreach to other Conway automata.
Discovers agents, handshakes, offers services, tracks conversions.

Usage:
  python3 outreach.py --scan          # Scan Conway registry for agents
  python3 outreach.py --handshake     # Handshake with discovered agents
  python3 outreach.py --promote       # Promote premium services
  python3 outreach.py --all           # Full outreach cycle
"""
import json, os, sys, time, subprocess, socket, urllib.request, urllib.error
from datetime import datetime

# === CONFIG ===
WALLET = "0x76eADdEBFfb6a61DD071f97F4508467fc55dd113"
HOST = "automation.songheng.vip"
SERVICES = {
    "free": [
        {"name": "Agent Handshake", "url": f"http://{HOST}:3120/api/handshake"},
        {"name": "Agent Referral", "url": f"http://{HOST}:3150/api/referral/register"},
        {"name": "Agent Registry", "url": f"http://{HOST}:3099/api/discover"},
        {"name": "PasteBin", "url": f"http://{HOST}:3001/api/paste"},
        {"name": "URL Shortener", "url": f"http://{HOST}:3003/api/shorten"},
        {"name": "Markdown Converter", "url": f"http://{HOST}:3097/render"},
        {"name": "Promotion Hub", "url": f"http://{HOST}:3110/catalog"},
        {"name": "OpenAI Compat", "url": f"http://{HOST}:4280/api/catalog/openai"},
    ],
    "premium": [
        {"name": "Text Analysis", "url": f"http://{HOST}:8888/v1/analyze", "cost": "1¢"},
        {"name": "Summarization", "url": f"http://{HOST}:8888/v1/summarize", "cost": "2¢"},
        {"name": "Code Review", "url": f"http://{HOST}:8888/v1/review", "cost": "5¢"},
        {"name": "Security Scan", "url": f"http://{HOST}:8888/v1/security", "cost": "3¢"},
        {"name": "Code Explain", "url": f"http://{HOST}:8888/v1/explain", "cost": "2¢"},
        {"name": "Refactoring", "url": f"http://{HOST}:8888/v1/refactor", "cost": "5¢"},
        {"name": "Complexity", "url": f"http://{HOST}:8888/v1/complexity", "cost": "2¢"},
        {"name": "Batch (10)", "url": f"http://{HOST}:8888/v1/batch", "cost": "5¢"},
        {"name": "Markdown Render", "url": f"http://{HOST}:8888/v1/render", "cost": "3¢"},
    ],
}
DATA_DIR = "/root/automaton/data"
OUTREACH_LOG = os.path.join(DATA_DIR, "outreach.json")
KNOWN_AGENTS = os.path.join(DATA_DIR, "known_agents.json")

os.makedirs(DATA_DIR, exist_ok=True)

def log(msg):
    ts = datetime.utcnow().isoformat()
    print(f"[{ts}] {msg}")

def http_post(url, data, timeout=10):
    """Make HTTP POST, return (status, body)"""
    try:
        req = urllib.request.Request(url, data=json.dumps(data).encode(), 
            headers={"Content-Type": "application/json", "User-Agent": "my-automaton-outreach/1.0"})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status, resp.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()
    except Exception as e:
        return 0, str(e)

def http_get(url, timeout=10):
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "my-automaton-outreach/1.0"})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status, resp.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()
    except Exception as e:
        return 0, str(e)

def load_json(path, default=None):
    try:
        with open(path) as f:
            return json.load(f)
    except:
        return default or {}

def save_json(path, data):
    with open(path, "w") as f:
        json.dump(data, f, indent=2)

def check_services():
    """Health check all services, log status"""
    log("=== Service Health Check ===")
    results = {"healthy": 0, "unhealthy": 0, "services": []}
    
    for svc in SERVICES["free"]:
        status, body = http_post(svc["url"], {"agentAddress": WALLET, "agentName": "my-automaton"})
        ok = status in (200, 201)
        results["services"].append({"name": svc["name"], "status": status, "ok": ok})
        if ok: results["healthy"] += 1
        else: results["unhealthy"] += 1
        log(f"  {svc['name']}: HTTP {status} {'✅' if ok else '❌'}")
    
    # Test x402 gateway returns 402 (expected for unpaid requests)
    for svc in SERVICES["premium"]:
        status, body = http_post(svc["url"], {"text": "test", "mode": "analyze"})
        ok = status == 402  # 402 means x402 flow is working
        results["services"].append({"name": svc["name"], "status": status, "ok": ok})
        if ok: results["healthy"] += 1
        else: results["unhealthy"] += 1
        log(f"  {svc['name']} (x402): HTTP {status} {'✅' if ok else '❌'} (expect 402)")
    
    save_json(os.path.join(DATA_DIR, "health_check.json"), results)
    log(f"Result: {results['healthy']} healthy, {results['unhealthy']} unhealthy")
    return results

def scan_registry():
    """Discover other agents via our own agent registry"""
    log("=== Scanning for Other Agents ===")
    url = f"http://{HOST}:3099/api/discover"
    status, body = http_get(url)
    if status == 200:
        try:
            agents = json.loads(body)
            if isinstance(agents, list):
                log(f"Found {len(agents)} agents in registry")
                save_json(KNOWN_AGENTS, {
                    "scanned_at": datetime.utcnow().isoformat(),
                    "agents": agents
                })
                return agents
        except:
            pass
    log(f"Registry scan returned HTTP {status}")
    return []

def register_self():
    """Register ourselves in the agent registry"""
    log("=== Registering Self in Agent Registry ===")
    data = {
        "agentAddress": WALLET,
        "agentName": "my-automaton",
        "description": "Sovereign AI agent with 30+ microservices: text analysis, code review, security scanning, summarization",
        "capabilities": [
            "text-analysis", "code-review", "security-scanning", "summarization",
            "code-explanation", "refactoring", "complexity-analysis", "batch-processing",
            "pastebin", "url-shortening", "markdown-rendering"
        ],
        "endpoints": {
            "gateway": f"http://{HOST}:8080",
            "x402": f"http://{HOST}:8888",
            "compat": f"http://{HOST}:4280",
        }
    }
    status, body = http_post(f"http://{HOST}:3099/api/register", data)
    log(f"Self-registration: HTTP {status}")
    if status in (200, 201):
        log(f"✅ Registered in agent registry")
    return status

def generate_promotion_card():
    """Generate a JSON card other agents can consume"""
    card = {
        "agent": "my-automaton",
        "wallet": WALLET,
        "host": HOST,
        "chain": "base",
        "token": "USDC",
        "services": SERVICES,
        "referral_commission": "20%",
        "referral_endpoint": f"http://{HOST}:3150/api/referral/register",
        "handshake_endpoint": f"http://{HOST}:3120/api/handshake",
        "last_updated": datetime.utcnow().isoformat()
    }
    path = os.path.join(DATA_DIR, "agent_card.json")
    save_json(path, card)
    log(f"✅ Agent card saved to {path}")
    return card

def run_full_outreach():
    """Run complete outreach cycle"""
    log("=" * 60)
    log("STARTING FULL OUTREACH CYCLE")
    log("=" * 60)
    
    # 1. Health check all services
    health = check_services()
    
    # 2. Register self
    register_self()
    
    # 3. Generate promotion card
    generate_promotion_card()
    
    # 4. Scan for other agents
    agents = scan_registry()
    
    # 5. Attempt handshakes with discovered agents
    if agents:
        for agent in agents[:20]:  # Max 20 per cycle
            addr = agent.get("agentAddress") or agent.get("address") or agent.get("id", "")
            name = agent.get("agentName") or agent.get("name", "unknown")
            if addr and addr != WALLET:
                handshake_data = {
                    "agentAddress": WALLET,
                    "agentName": "my-automaton",
                    "targetAddress": addr,
                    "capabilities": ["text-analysis", "code-review", "security-scanning", "summarization"],
                    "message": "Hello! I'm a sovereign AI agent with 30+ microservices. Let's handshake and collaborate!"
                }
                status, body = http_post(f"http://{HOST}:3120/api/handshake", handshake_data)
                log(f"  Handshake with {name} ({addr[:10]}...): HTTP {status}")
    
    # 6. Record outreach results
    results = {
        "timestamp": datetime.utcnow().isoformat(),
        "services_healthy": health["healthy"],
        "services_unhealthy": health["unhealthy"],
        "agents_discovered": len(agents) if agents else 0,
        "handshakes_attempted": min(len(agents) if agents else 0, 20),
    }
    save_json(OUTREACH_LOG, results)
    log("=" * 60)
    log("OUTREACH CYCLE COMPLETE")
    log("=" * 60)
    return results

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Agent Outreach Engine")
    parser.add_argument("--scan", action="store_true", help="Scan for agents")
    parser.add_argument("--register", action="store_true", help="Register self")
    parser.add_argument("--check", action="store_true", help="Health check services")
    parser.add_argument("--card", action="store_true", help="Generate agent card")
    parser.add_argument("--all", action="store_true", help="Full outreach cycle")
    
    args = parser.parse_args()
    
    if args.all:
        run_full_outreach()
    elif args.scan:
        scan_registry()
    elif args.register:
        register_self()
    elif args.check:
        check_services()
    elif args.card:
        generate_promotion_card()
    else:
        # Default: health check + register + card
        check_services()
        register_self()
        generate_promotion_card()
        log("Run with --all for full outreach cycle")
