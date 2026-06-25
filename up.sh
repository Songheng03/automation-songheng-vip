#!/bin/bash
# Quick gateway start - uses .cjs for CommonJS compatibility
cd /root/automaton

# Kill existing
pkill -f "node.*gateway" 2>/dev/null
sleep 1

# Start with .cjs (CommonJS - works with require())
export NODE_ENV=production
nohup node gateway.cjs > gateway.log 2>&1 &
echo $! > gateway.pid
sleep 3

# Verify
curl -s http://localhost:8080/health && echo " ✅" || echo " ❌ failed"
