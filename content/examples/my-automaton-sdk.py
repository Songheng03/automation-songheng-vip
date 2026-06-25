#!/usr/bin/env python3
"""
my-automaton Python SDK Examples
=================================
AI code review, text analysis, security scanning — 3 free requests/day per service.

Install: pip install requests
Docs: https://automation.songheng.vip/api-docs.html
"""

import requests
import json

BASE_URL = "https://automation.songheng.vip"
API_KEY = None  # Set to "am_xxx" for premium access

def free_review(code, language="auto"):
    """Free code review (3/day/IP)"""
    resp = requests.post(f"{BASE_URL}/api/free/review", json={
        "text": code,
        "language": language
    })
    return resp.json()

def free_security_scan(code):
    """Free security scan (3/day/IP)"""
    resp = requests.post(f"{BASE_URL}/api/free/security", json={
        "text": code,
        "context": "web"
    })
    return resp.json()

def free_summarize(text):
    """Free summarization (3/day/IP)"""
    resp = requests.post(f"{BASE_URL}/api/free/summarize", json={
        "text": text,
        "max_length": 100
    })
    return resp.json()

def premium_review(code, api_key, language="auto"):
    """Premium code review (uses credits)"""
    resp = requests.post(f"{BASE_URL}/v1/review", 
        json={"text": code, "language": language},
        headers={"X-API-Key": api_key}
    )
    return resp.json()

def premium_analyze(text, api_key):
    """Premium text analysis"""
    resp = requests.post(f"{BASE_URL}/v1/analyze",
        json={"text": text, "mode": "deep"},
        headers={"X-API-Key": api_key}
    )
    return resp.json()

# ─── EXAMPLE USAGE ────────────────────────────────────────────────────

if __name__ == "__main__":
    print("=" * 50)
    print("my-automaton Python SDK Examples")
    print("=" * 50)
    
    # Example 1: Free code review
    print("\n1️⃣  Free Code Review")
    sample_code = """
    function getData(id) {
        var query = "SELECT * FROM users WHERE id = " + id;
        db.execute(query);
        eval(response);
    }
    """
    result = free_review(sample_code)
    print(f"   Result: {result.get('result', 'N/A')[:100]}...")
    print(f"   Free remaining: {result.get('free_remaining', 0)}/3")
    
    # Example 2: Free security scan
    print("\n2️⃣  Free Security Scan")
    result = free_security_scan(sample_code)
    print(f"   Result: {result.get('result', 'N/A')[:100]}...")
    
    # Example 3: Free summarization
    print("\n3️⃣  Free Summarization")
    text = """
    Artificial intelligence has transformed the way developers write code.
    Modern AI tools can review pull requests, detect bugs, scan for security
    vulnerabilities, and suggest optimizations automatically. This saves
    hundreds of developer hours annually and catches issues before they
    reach production.
    """
    result = free_summarize(text)
    print(f"   Summary: {result.get('result', 'N/A')[:150]}...")
    
    # Example 4: Premium API (requires API key)
    if API_KEY:
        print("\n4️⃣  Premium Code Review")
        result = premium_review(sample_code, API_KEY)
        print(f"   Result: {result.get('result', 'N/A')[:200]}...")
        print(f"   Credits remaining: {result.get('credits_remaining', 0)}")
    else:
        print("\n4️⃣  Premium API: ⏭️  (set API_KEY to test)")
        print(f"   Get your key at: {BASE_URL}/upgrade.html")
    
    print("\n" + "=" * 50)
    print("📚 Full API docs: {}/api-docs.html".format(BASE_URL))
    print("🎮 Try it live:   {}/api-playground.html".format(BASE_URL))
    print("💰 Buy credits:   {}/upgrade.html".format(BASE_URL))
    print("=" * 50)
