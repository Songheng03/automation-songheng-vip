#!/usr/bin/env python3
"""
my-automaton CLI — x402 AI API client
Usage:
  python3 automaton-cli.py analyze "your text here"
  python3 automaton-cli.py review --file /path/to/code.py
  python3 automaton-cli.py summarize --url https://example.com/article
  python3 automaton-cli.py --help

First 3 calls per day are FREE (no wallet needed).
After that, send USDC to 0x76eADdEBFfb6a61DD071f97F4508467fc55dd113 on Base chain.
"""
import sys
import json
import os
import urllib.request
import urllib.error

BASE_URL = "https://automation.songheng.vip"
WALLET = "0x76eADdEBFfb6a61DD071f97F4508467fc55dd113"
CHAIN = "Base"
TOKEN = "USDC"

SERVICES = {
    "analyze": {"cost": "1¢", "desc": "Deep text analysis — insights, patterns, key takeaways"},
    "summarize": {"cost": "2¢", "desc": "Concise AI summarization"},
    "review": {"cost": "5¢", "desc": "Full code review — bugs, style, security"},
    "security": {"cost": "3¢", "desc": "Security vulnerability scan (OWASP Top 10)"},
    "explain": {"cost": "2¢", "desc": "Code explanation — what it does and how"},
    "refactor": {"cost": "5¢", "desc": "Refactoring suggestions"},
    "complexity": {"cost": "2¢", "desc": "Big O complexity analysis"},
}

def call_api(service, text, code=None):
    """Call a service, trying free first, then prompting for payment."""
    data = {"text": text} if not code else {"code": code}
    
    # First try free
    req = urllib.request.Request(
        f"{BASE_URL}/free/{service}",
        data=json.dumps(data).encode(),
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            result = json.loads(resp.read())
            if "result" in result:
                remaining = result.get("remaining", 0)
                print(f"\n{'='*60}")
                print(f"✅ {service.upper()} — Free (remaining today: {remaining})")
                print(f"{'='*60}")
                print(result["result"])
                return
            print(json.dumps(result, indent=2))
            return
    except urllib.error.HTTPError as e:
        if e.code == 429:
            body = json.loads(e.read())
            print(f"\n❌ Free limit reached (3/day)")
            print(f"\nTo continue, send {SERVICES[service]['cost']} USDC to:")
            print(f"  {WALLET}")
            print(f"  on {CHAIN} chain")
            print(f"\nThen retry with:")
            print(f"  curl -X POST {BASE_URL}/v1/{service} \\")
            print(f"    -H 'Content-Type: application/json' \\")
            print(f"    -H 'X-X402-Payment: YOUR_TX_HASH' \\")
            print(f"    -d '{json.dumps(data)}'")
            return
        elif e.code == 400:
            print(f"\n❌ Error: {e.read().decode()}")
            return
        else:
            print(f"\n❌ HTTP {e.code}: {e.read().decode()}")
            return

def main():
    if len(sys.argv) < 2 or sys.argv[1] in ("-h", "--help"):
        print("my-automaton CLI — x402 AI API Client")
        print(f"Wallet: {WALLET} ({CHAIN} · {TOKEN})")
        print()
        print("Services:")
        for name, info in SERVICES.items():
            print(f"  {name:12s} {info['cost']:4s}  {info['desc']}")
        print()
        print("Usage:")
        print(f"  python3 {sys.argv[0]} <service> \"<text>\"")
        print(f"  python3 {sys.argv[0]} <service> --file <path>")
        print(f"  python3 {sys.argv[0]} <service> --url <url>")
        print()
        print("Examples:")
        print(f"  python3 {sys.argv[0]} analyze \"AI is transforming how we code\"")
        print(f"  python3 {sys.argv[0]} review --file app.js")
        print(f"  python3 {sys.argv[0]} summarize --url https://example.com/doc")
        print()
        print("First 3 calls/day are FREE.")
        return
    
    service = sys.argv[1].lower()
    if service not in SERVICES:
        print(f"Unknown service: {service}")
        print(f"Available: {', '.join(SERVICES.keys())}")
        sys.exit(1)
    
    text = None
    code = None
    
    if "--file" in sys.argv:
        idx = sys.argv.index("--file") + 1
        if idx < len(sys.argv):
            path = sys.argv[idx]
            with open(path) as f:
                code = f.read()
            print(f"📄 Reading file: {path} ({len(code)} chars)")
    elif "--url" in sys.argv:
        idx = sys.argv.index("--url") + 1
        if idx < len(sys.argv):
            url = sys.argv[idx]
            print(f"🌐 Fetching URL: {url}")
            try:
                with urllib.request.urlopen(url, timeout=15) as resp:
                    content = resp.read().decode()
                    text = content[:5000]
                print(f"📄 Got {len(content)} chars, using first 5000")
            except Exception as e:
                print(f"❌ Could not fetch URL: {e}")
                sys.exit(1)
    else:
        text = " ".join(sys.argv[2:]) if len(sys.argv) > 2 else ""
        if not text:
            print("Please provide text or use --file/--url")
            sys.exit(1)
    
    call_api(service, text, code)

if __name__ == "__main__":
    main()
