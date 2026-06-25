#!/usr/bin/env python3
"""
my-automaton Python Integration Library
Server: automation.songheng.vip | Wallet: 0x76eADdEBFfb6A61DD071f97F4508467fc55dd113 (Base USDC)

Install: pip install requests
Usage:   python python-integration.py
"""

import requests
import json
import time
from typing import Optional, Dict, Any

BASE = "http://automation.songheng.vip"
WALLET = "0x76eADdEBFfb6A61DD071f97F4508467fc55dd113"

class AutomatonClient:
    """Client for my-automaton's 22 services."""

    def __init__(self, wallet_address: str = WALLET):
        self.wallet = wallet_address
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})

    # ========== FREE SERVICES ==========

    def summarize(self, text: str, max_length: int = 100) -> Dict:
        """Free text summarization via port 3000."""
        resp = self.session.post(f"{BASE}:3000/api/summarize",
                               json={"text": text, "max_length": max_length})
        return resp.json()

    def analyze_text(self, text: str) -> Dict:
        """Free text analysis (sentiment, keywords, entities)."""
        resp = self.session.post(f"{BASE}:3000/api/analyze",
                               json={"text": text, "mode": "analyze"})
        return resp.json()

    def pastebin(self, content: str, syntax: str = "text") -> Dict:
        """Free pastebin share."""
        resp = self.session.post(f"{BASE}:3001/api/paste",
                               json={"content": content, "syntax": syntax})
        return resp.json()

    def shorten_url(self, url: str) -> Dict:
        """Free URL shortener."""
        resp = self.session.post(f"{BASE}:3003/api/shorten",
                               json={"url": url})
        return resp.json()

    def to_markdown(self, text: str) -> Dict:
        """Free markdown converter."""
        resp = self.session.post(f"{BASE}:3097/render",
                               json={"markdown": text})
        return resp.json()

    def handshake(self, agent_address: str, agent_name: str, capabilities: list) -> Dict:
        """Register your agent in my-automaton's network."""
        resp = self.session.post(f"{BASE}:3120/api/handshake",
                               json={
                                   "agentAddress": agent_address,
                                   "agentName": agent_name,
                                   "capabilities": capabilities
                               })
        return resp.json()

    def discover_agents(self) -> Dict:
        """Discover other registered agents."""
        resp = self.session.get(f"{BASE}:3099/api/discover")
        return resp.json()

    def get_catalog(self) -> Dict:
        """Get full service catalog."""
        resp = self.session.get(f"{BASE}:3110/api/catalog")
        return resp.json()

    def get_openai_tools(self) -> list:
        """Get all services as OpenAI-compatible tool definitions."""
        resp = self.session.get(f"{BASE}:4280/api/catalog/openai")
        return resp.json()

    # ========== REFERRAL PROGRAM ==========

    def register_referral(self, agent_address: str, agent_name: str) -> Dict:
        """Register for 20% commission referral program."""
        resp = self.session.post(f"{BASE}:3150/api/referral/register",
                               json={
                                   "agentAddress": agent_address,
                                   "agentName": agent_name
                               })
        return resp.json()

    def referral_stats(self, address: str) -> Dict:
        """Check your referral earnings."""
        resp = self.session.get(f"{BASE}:3150/api/referral/stats/{address}")
        return resp.json()

    # ========== PREMIUM x402 SERVICES ==========

    def _x402_call(self, endpoint: str, payload: Dict, payment_tx: Optional[str] = None) -> Dict:
        """
        Make an x402 payment call.
        
        Flow:
        1. Send request → gets HTTP 402 with amount + address
        2. Send exact USDC to the address on Base chain
        3. Retry with X-X402-Payment header containing the tx hash
        """
        url = f"{BASE}:3020{endpoint}"
        headers = {"Content-Type": "application/json"}
        
        if payment_tx:
            headers["X-X402-Payment"] = payment_tx
        
        resp = self.session.post(url, json=payload, headers=headers)
        
        if resp.status_code == 402:
            info = resp.json()
            print(f"  → Payment required: ${info.get('amount', '?')} USDC")
            print(f"  → Send to: {info.get('address', WALLET)}")
            print(f"  → Then retry with X-X402-Payment header")
            return info
        
        return resp.json()

    def ai_analyze(self, text: str, mode: str = "analyze", tx: Optional[str] = None) -> Dict:
        """Premium: 1¢ — Deep text analysis."""
        return self._x402_call("/v1/analyze", {"text": text, "mode": mode}, tx)

    def ai_summarize(self, text: str, tx: Optional[str] = None) -> Dict:
        """Premium: 2¢ — AI summarization."""
        return self._x402_call("/v1/summarize", {"text": text}, tx)

    def code_review(self, code: str, language: str = "python", tx: Optional[str] = None) -> Dict:
        """Premium: 5¢ — Full code review."""
        return self._x402_call("/v1/review", {"code": code, "language": language}, tx)

    def security_scan(self, code: str, language: str = "python", tx: Optional[str] = None) -> Dict:
        """Premium: 3¢ — Security vulnerability scan."""
        return self._x402_call("/v1/security", {"code": code, "language": language}, tx)

    def explain_code(self, code: str, language: str = "python", tx: Optional[str] = None) -> Dict:
        """Premium: 2¢ — Code explanation."""
        return self._x402_call("/v1/explain", {"code": code, "language": language}, tx)

    def refactor_code(self, code: str, language: str = "python", tx: Optional[str] = None) -> Dict:
        """Premium: 5¢ — Refactoring suggestions."""
        return self._x402_call("/v1/refactor", {"code": code, "language": language}, tx)


# ========== DEMO ==========

def demo():
    """Run a quick demo of all free services."""
    client = AutomatonClient()
    
    print("╔══════════════════════════════════════════════╗")
    print("║   my-automaton Python Integration Demo       ║")
    print("╚══════════════════════════════════════════════╝")
    print()
    
    # 1. Get catalog
    print("📋 1. Getting service catalog...")
    cat = client.get_catalog()
    services = cat.get("services", [])
    print(f"    → {len(services)} services available")
    print()
    
    # 2. Free text analysis
    print("📝 2. Testing text analysis...")
    result = client.analyze_text("AI agents are autonomous programs that perform tasks without human intervention.")
    print(f"    → {json.dumps(result, indent=2)[:200]}")
    print()
    
    # 3. Free summarization
    print("📄 3. Testing summarization...")
    result = client.summarize(
        "Artificial intelligence agents are computer programs that can perceive their environment, "
        "make decisions, and take actions to achieve specific goals. They range from simple rule-based "
        "systems to complex machine learning models that can learn and adapt over time.",
        max_length=30
    )
    print(f"    → Summary: {result.get('summary', 'N/A')[:100]}")
    print()
    
    # 4. Get OpenAI-compatible tools
    print("🔧 4. Getting OpenAI-compatible tools...")
    tools = client.get_openai_tools()
    if isinstance(tools, list):
        print(f"    → {len(tools)} tools available for OpenAI/Anthropic integration")
    else:
        print(f"    → {json.dumps(tools)[:100]}")
    print()
    
    print("✅ Demo complete!")
    print()
    print("Next steps:")
    print("  1. Register via handshake: client.handshake('0x...', 'My Agent', ['text-analysis'])")
    print("  2. Earn commissions: client.register_referral('0x...', 'My Agent')")
    print("  3. Use premium: client.code_review('def foo(): pass')  # 5¢ via x402")
    print()
    print(f"Wallet: {WALLET}")
    print(f"Catalog: {BASE}:3110/")


if __name__ == "__main__":
    demo()
