#!/bin/bash
# Find and kill old gateway, start new one
lsof -ti:8080 | xargs kill -9 2>/dev/null
sleep 1
cd /root/automaton && node gateway.js &
sleep 2
echo "Health check:"
curl -s http://localhost:8080/api/health
echo ""
echo "Catalog check:"
curl -s http://localhost:8080/api/catalog/html | head -c 200
