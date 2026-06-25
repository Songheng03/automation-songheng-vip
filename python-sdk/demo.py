#!/usr/bin/env python3
"""Quick demo of my-automaton API services (free tier, no key needed)."""

from my_automaton import automaton

client = automaton()

print("═" * 50)
print("  my-automaton API Demo")
print("═" * 50)

# 1. Text Analysis
print("\n1️⃣  Text Analysis")
result = client.analyze_text(
    "Python is a high-level, general-purpose programming language. "
    "Its design philosophy emphasizes code readability with the use of "
    "significant indentation. Python is dynamically typed and garbage-collected.",
    mode="analyze"
)
for key, val in result.items():
    print(f"   {key}: {val}")

# 2. Code Review
print("\n2️⃣  Code Review")
code = """
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)
"""
result = client.review_code(code, "python")
for key, val in result.items():
    print(f"   {key}: {val}")

# 3. Security Scan
print("\n3️⃣  Security Scan")
bad_code = '''
import os

def run_command(cmd):
    os.system(cmd)  # DANGEROUS

def delete_all():
    os.remove("/important/data")  # HARDFIXED PATH
'''
result = client.security_scan(bad_code, "python")
for key, val in result.items():
    print(f"   {key}: {val}")

print("\n✅ Demo complete! Purchase a premium API key for deeper analysis.")
print("   https://automation.songheng.vip")
