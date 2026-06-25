#!/usr/bin/env python3
"""One-shot: start the gateway fresh on port 8888."""
import subprocess, sys, os, time

cmd = [sys.executable, os.path.join(os.path.dirname(__file__), "gateway_8888.py")]
log = open("/tmp/gw_fresh.log", "w")
proc = subprocess.Popen(cmd, stdout=log, stderr=subprocess.STDOUT)
time.sleep(2)

# Test it
import urllib.request
try:
    resp = urllib.request.urlopen("http://localhost:8888/health")
    print(f"GATEWAY IS LIVE: {resp.read().decode()}", flush=True)
    sys.exit(0)
except Exception as e:
    print(f"FAILED: {e}", flush=True)
    sys.exit(1)
