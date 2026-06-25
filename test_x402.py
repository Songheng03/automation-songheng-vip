#!/usr/bin/env python3
"""Test the x402 payment gateway end-to-end"""
import json, urllib.request, sys

HOST = "automation.songheng.vip"
GATEWAY = f"http://{HOST}:8888"

def test_endpoint(name, path, data):
    """Test a premium x402 endpoint"""
    url = f"{GATEWAY}{path}"
    req_data = json.dumps(data).encode()
    
    print(f"\n=== Testing {name} ({path}) ===")
    print(f"POST {url}")
    
    req = urllib.request.Request(url, data=req_data, 
        headers={"Content-Type": "application/json"},
        method="POST")
    
    try:
        resp = urllib.request.urlopen(req, timeout=10)
        result = json.loads(resp.read())
        print(f"✓ Status: {resp.status}")
        print(f"  Result: {json.dumps(result, indent=2)[:300]}")
        return True
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"! HTTP {e.code}")
        print(f"  Body: {body[:500]}")
        if e.code == 402:
            print("  → This is EXPECTED (payment required)")
            print("  → x402 flow works correctly")
        return e.code == 402  # 402 means x402 flow is working
    except Exception as e:
        print(f"✗ Error: {e}")
        return False

# Test all premium endpoints
results = []
texts = {
    "analyze": {"text": "AI is transforming how we build software. From code generation to automated testing, machine learning models are becoming essential tools for developers.", "mode": "analyze"},
    "summarize": {"text": "Artificial intelligence has made remarkable progress in recent years. From natural language processing to computer vision, AI systems are now capable of tasks that were once thought to be exclusively human. This has led to widespread adoption across industries including healthcare, finance, transportation, and entertainment. However, concerns about safety, privacy, and job displacement remain important topics of discussion.", "mode": "summarize"},
    "review": {"text": "function factorial(n) {\n  if (n <= 1) return 1;\n  return n * factorial(n - 1);\n}", "mode": "review"},
    "security": {"text": "SELECT * FROM users WHERE username = '" + sys.argv[1] if len(sys.argv) > 1 else "admin" + "' AND password = '" + sys.argv[2] if len(sys.argv) > 2 else "password" + "'", "mode": "security"},
    "explain": {"text": "async function fetchData(url) {\n  const response = await fetch(url);\n  const data = await response.json();\n  return data;\n}", "mode": "explain"},
    "complexity": {"text": "function bubbleSort(arr) {\n  for (let i = 0; i < arr.length; i++) {\n    for (let j = 0; j < arr.length - 1; j++) {\n      if (arr[j] > arr[j + 1]) {\n        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];\n      }\n    }\n  }\n  return arr;\n}", "mode": "complexity"},
}

for name, data in texts.items():
    path = f"/v1/{name}"
    ok = test_endpoint(name, path, data)
    results.append((name, ok))

# Summary
print("\n" + "="*50)
print("RESULTS SUMMARY")
print("="*50)
all_ok = True
for name, ok in results:
    status = "✓ WORKING" if ok else "✗ FAILED"
    print(f"  {name:15s} {status}")
    if not ok:
        all_ok = False

print(f"\nOverall: {'ALL PASS' if all_ok else 'SOME FAILURES'}")
