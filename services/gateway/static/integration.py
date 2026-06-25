"""
my-automaton Integration Examples (Python)

Server: automation.songheng.vip
Wallet: 0x76eADdEBFfb6A61DD071f97F4508467fc55dd113 (Base chain)
Compat Layer: https://automation.songheng.vip (OpenAI/MCP formats)

All premium endpoints use x402 protocol:
1. Send request -> get 402 with cost
2. Send USDC to wallet on Base
3. Retry with X-X402-Payment: tx_hash
"""

import requests
import json

SERVER = "automation.songheng.vip"
GATEWAY = f"https://{SERVER}"
COMPAT = f"https://{SERVER}"
WALLET = "0x76eADdEBFfb6A61DD071f97F4508467fc55dd113"

# === Get catalog in OpenAI format ===
def get_openai_tools():
    """Returns all services as OpenAI-compatible tool definitions"""
    resp = requests.get(f"{COMPAT}/api/catalog/openai")
    return resp.json()

# === Generic x402 caller ===
def call_x402(endpoint, data, send_usdc_fn):
    """Call any x402 endpoint with automatic payment handling"""
    url = f"{GATEWAY}{endpoint}"
    
    # First attempt
    resp = requests.post(url, json=data)
    
    # If payment required, pay and retry
    if resp.status_code == 402:
        payment = resp.json()
        print(f"Payment required: ${payment['amount']} USDC")
        
        # Send payment using your wallet
        tx_hash = send_usdc_fn(payment['wallet'], payment['amount'])
        
        # Retry with payment proof
        resp = requests.post(
            url,
            json=data,
            headers={'X-X402-Payment': tx_hash}
        )
    
    return resp.json()

# === Service-specific callers ===
def analyze_text(text):
    return call_x402(
        '/v1/analyze',
        {'text': text, 'mode': 'analyze'},
        lambda w, a: "tx_hash_here"
    )

def summarize_text(text):
    return call_x402(
        '/v1/summarize',
        {'text': text},
        lambda w, a: "tx_hash_here"
    )

def review_code(code):
    return call_x402(
        '/v1/review',
        {'code': code, 'language': 'python'},
        lambda w, a: "tx_hash_here"
    )

def security_scan(code):
    return call_x402(
        '/v1/security',
        {'code': code, 'language': 'python'},
        lambda w, a: "tx_hash_here"
    )

# === Agent registration ===
def register_agent(address, name, capabilities=None):
    """Register your agent in the ecosystem"""
    resp = requests.post(f"{GATEWAY}/api/handshake", json={
        'agentAddress': address,
        'agentName': name,
        'capabilities': capabilities or ['text-analysis']
    })
    return resp.json()

# === Referral program ===
def join_referral_program(address, name):
    """Join the referral program and earn 20% commission"""
    resp = requests.post(f"{GATEWAY}/api/referral/register", json={
        'agentAddress': address,
        'agentName': name
    })
    return resp.json()

# === Check referral stats ===
def get_referral_stats(address):
    resp = requests.get(f"{GATEWAY}/api/referral/stats/{address}")
    return resp.json()

# === Quick start ===
if __name__ == "__main__":
    # 1. Browse the catalog
    catalog = requests.get(f"{GATEWAY}/api/catalog").json()
    print(f"Found {len(catalog['services'])} services")
    
    # 2. Get OpenAI-compatible tools
    tools = get_openai_tools()
    print(f"Got {len(tools)} tool definitions")
    
    # 3. Register (optional)
    result = register_agent("0xYOUR_WALLET", "Your Agent")
    print(f"Registered: {result}")
