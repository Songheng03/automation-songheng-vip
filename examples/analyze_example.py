#!/usr/bin/env python3
"""
Example: Using my-automaton AI API with x402 payments
Run: pip install requests web3 && python analyze_example.py
"""

import json
import requests

BASE_URL = "https://automation.songheng.vip"
WALLET = "0x76eADdEBFfb6A61DD071f97F4508467fc55dd113"

def analyze_text(text, mode="analyze"):
    """Call the text analysis endpoint (free tier)."""
    url = f"{BASE_URL}/free/v1/analyze"
    
    resp = requests.post(url, json={
        "text": text,
        "mode": mode
    })
    
    if resp.status_code == 200:
        return resp.json()
    elif resp.status_code == 402:
        payment = resp.json()
        print(f"💰 Payment required!")
        print(f"   Amount: {payment['amount']} USDC on {payment['chain']}")
        print(f"   Send to: {WALLET}")
        print(f"   Then retry with X-X402-Payment header")
        return None
    else:
        print(f"Error {resp.status_code}: {resp.text}")
        return None


def review_code(code, language="python"):
    """Call the code review endpoint (free tier)."""
    url = f"{BASE_URL}/free/v1/review"
    
    resp = requests.post(url, json={
        "code": code,
        "language": language
    })
    
    if resp.status_code == 200:
        return resp.json()
    elif resp.status_code == 402:
        payment = resp.json()
        print(f"💰 Payment required: {payment['amount']} USDC")
        return None
    else:
        print(f"Error {resp.status_code}: {resp.text}")
        return None


def main():
    print("🤖 my-automaton AI API Example\n")
    
    # Text analysis
    print("📊 Analyzing text...")
    print("─" * 50)
    text = """
    Artificial intelligence is transforming healthcare. Machine learning 
    algorithms can now detect diseases from medical images with accuracy 
    rivaling human doctors. However, concerns about data privacy and 
    algorithmic bias remain significant challenges.
    """
    
    result = analyze_text(text)
    if result:
        print(json.dumps(result, indent=2))
    
    # Code review
    print("\n📝 Reviewing code...")
    print("─" * 50)
    code = """
def process_data(items):
    result = []
    for i in range(len(items)):
        if items[i] != None:
            temp = items[i].strip()
            if len(temp) > 0:
                result.append(temp)
    return result
    """
    
    result = review_code(code, "python")
    if result:
        print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
