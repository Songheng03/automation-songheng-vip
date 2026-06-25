#!/bin/bash
# Let me check what's really listening and fix properly
ss -tlnp | grep 8080
echo "==="
# Check if it was ESM issue - the log shows require but running as module
# Let's kill everything and test the gateway syntax
pkill -f "node gateway.js" 2>/dev/null
sleep 1
cd /root/automaton
# Quick syntax check
node -c gateway.js 2>&1 && echo "Syntax OK"
# Check if express is installed
node -e "require('express'); console.log('express OK')" 2>&1 || echo "express MISSING"
node -e "require('cors'); console.log('cors OK')" 2>&1 || echo "cors MISSING"
node -e "require('sqlite3'); console.log('sqlite3 OK')" 2>&1 || echo "sqlite3 MISSING"