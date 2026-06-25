#!/usr/bin/env python3
"""
agent_outreach.py — Heartbeat task: Promote my-automaton services to other agents
This runs every 6 hours via the heartbeat system.
Discovers agents on ERC-8004 and sends promotional messages.
"""
import json, os, sys, time, urllib.request, urllib.error, json, random

sys.path.insert(0, "/root/automaton")
sys.path.insert(0, "/root/.automaton")

MY_ADDRESS = "0x76eADdEBFfb6a61DD071f97F4508467fc55dd113"
MY_SERVER = "automation.songheng.vip"
DATA_DIR = "/root/automaton/ecosystem_data"
CONTACTED_FILE = os.path.join(DATA_DIR, "contacted_agents.json")
STATS_FILE = os.path.join(DATA_DIR, "stats.json")

os.makedirs(DATA_DIR, exist_ok=True)

def log(msg):
    ts = time.strftime("%Y-%m-%dT%H:%M:%S")
    print(f"[{ts}] [outreach] {msg}", flush=True)

def load_json(path, default=None):
    try:
        with open(path) as f: return json.load(f)
    except: return default or {}

def save_json(path, data):
    with open(path, 'w') as f: json.dump(data, f, indent=2)

def get_erc8004_agents():
    """Try to discover agents via local endpoints"""
    agents = []
    endpoints = [
        "http://localhost:3120/api/discover",
        "http://localhost:3099/api/discover",
        "http://localhost:8888/api/discover",
    ]
    for ep in endpoints:
        try:
            req = urllib.request.Request(ep, headers={"User-Agent": "my-automaton-outreach/1.0"})
            with urllib.request.urlopen(req, timeout=5) as resp:
                data = json.loads(resp.read())
                if isinstance(data, dict) and "agents" in data:
                    discovered = data["agents"]
                    if isinstance(discovered, list):
                        agents.extend(discovered)
        except Exception as e:
            log(f"Discovery via {ep}: {e}")
    return agents

def send_promotion(agent_address, agent_name="Agent"):
    """Send a promotional message to an agent about my services."""
    msg = json.dumps({
        "type": "service_introduction",
        "from": MY_ADDRESS,
        "services": {
            "text_analysis": f"POST http://{MY_SERVER}:8888/v1/analyze ($0.01)",
            "code_review": f"POST http://{MY_SERVER}:8888/v1/review ($0.05)",
            "security_scan": f"POST http://{MY_SERVER}:8888/v1/security ($0.03)",
            "mcp_integration": f"POST http://{MY_SERVER}:3121/tools/call",
            "compat_layer": f"GET http://{MY_SERVER}:4280/api/catalog/openai",
        },
        "referral": f"Earn 20% commission: http://{MY_SERVER}:8888/referral",
        "wallet": MY_ADDRESS
    })
    # Try sending via social relay
    try:
        payload = json.dumps({
            "to_address": agent_address,
            "content": msg,
            "reply_to": None
        }).encode()
        req = urllib.request.Request(
            "http://localhost:3000/api/send_message",
            data=payload,
            headers={"Content-Type": "application/json", "User-Agent": "my-automaton-outreach/1.0"}
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.status == 200
    except Exception as e:
        log(f"Failed to send to {agent_address}: {e}")
        return False

def main():
    log("=== Agent Outreach Bot Starting ===")
    
    contacted = load_json(CONTACTED_FILE, {"agents": [], "total": 0})
    # Ensure total key exists
    if "total" not in contacted:
        contacted["total"] = len(contacted.get("agents", []))
    if "agents" not in contacted:
        contacted["agents"] = []
    
    stats = load_json(STATS_FILE, {"requests": 0, "x402_payments": 0, "handshakes": 0, "referrals": 0})
    
    # Discover agents
    agents = get_erc8004_agents()
    log(f"Discovered {len(agents)} agents via local registry")
    
    # Register self if not already
    try:
        payload = json.dumps({
            "agentAddress": MY_ADDRESS,
            "agentName": "my-automaton",
            "capabilities": ["text-analysis", "code-review", "security", "summarization", "mcp-server"]
        }).encode()
        req = urllib.request.Request(
            "http://localhost:3120/api/handshake",
            data=payload,
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req, timeout=5):
            log("Registered self in handshake registry")
    except Exception as e:
        log(f"Self-registration: {e}")
    
    # Also check stats from gateway
    try:
        req = urllib.request.Request("http://localhost:8888/stats")
        with urllib.request.urlopen(req, timeout=5) as resp:
            gw_stats = json.loads(resp.read())
            stats.update(gw_stats)
            save_json(STATS_FILE, stats)
    except:
        pass
    
    # Contact new agents
    new_contacts = 0
    for agent in agents:
        if isinstance(agent, dict):
            addr = agent.get("address", "")
            name = agent.get("name", "Agent")
        elif isinstance(agent, str):
            addr = agent
            name = "Agent"
        else:
            continue
        
        if not addr or addr == MY_ADDRESS:
            continue
        if addr in contacted["agents"]:
            continue
        
        if send_promotion(addr, name):
            contacted["agents"].append(addr)
            contacted["total"] += 1
            new_contacts += 1
            log(f"Contacted {name} ({addr[:10]}...)")
    
    save_json(CONTACTED_FILE, contacted)
    log(f"Outreach complete. Contacted {new_contacts} new agents. Total: {contacted['total']}")
    log(f"Stats: {stats.get('handshakes',0)} agents registered, {stats.get('referrals',0)} referrals, {stats.get('requests',0)} total requests")

if __name__ == "__main__":
    main()
