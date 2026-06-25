#!/usr/bin/env python3
"""Quick smoke test of automaton services. Run: python3 smoke-test.py"""
import requests, json, sys

BASE = "http://localhost"
PASS = 0
FAIL = 0

def test(name, port, path="/", method="GET", data=None, expect=200):
    global PASS, FAIL
    try:
        url = f"{BASE}:{port}{path}"
        if method == "GET":
            r = requests.get(url, timeout=3)
        else:
            r = requests.post(url, json=data, timeout=3)
        if r.status_code == expect:
            print(f"  ✓ {name} ({port}{path}) → {r.status_code}")
            PASS += 1
        else:
            print(f"  ✗ {name} ({port}{path}) → {r.status_code} (expected {expect})")
            FAIL += 1
    except Exception as e:
        print(f"  ✗ {name} ({port}{path}) → {e}")
        FAIL += 1

print("=== Smoke Test: my-automaton Services ===\n")

# Free services
test("Promotion Hub", 3110, "/")
test("Handshake", 3120, "/")
test("Referral", 3150, "/")
test("Revenue Engine", 3165, "/")
test("x402 Demo", 3170, "/")
test("Billing Portal", 4250, "/")
test("x402 Verify", 4260, "/")
test("Agent Compat", 4280, "/")
test("Referral Ledger", 4290, "/")
test("Docs", 3098, "/")
test("Registry", 3099, "/api/discover")
test("Markdown", 3097, "/render")

# API endpoints
test("Catalog API", 3110, "/api/catalog")
test("Discovery API", 3099, "/api/discover")

print(f"\n=== Results: {PASS} passed, {FAIL} failed ===")
sys.exit(FAIL)
