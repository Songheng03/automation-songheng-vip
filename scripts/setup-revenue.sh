#!/bin/bash
set -e

echo "=== Setting up Revenue Pipeline ==="

# Get the key from the right location
KEY=$(node -e "try{console.log(require('/root/.automaton/automaton.json').DEEPSEEK_API_KEY||'')}catch(e){console.log('')}")
echo "Key: ${KEY:0:10}... (${#KEY} chars)"

# Write key to all locations AI service checks
mkdir -p /root/automaton/data
printf '%s' "$KEY" > /root/automaton/data/deepseek-key
printf '%s' "$KEY" > /root/.automaton/deepseek-key
export DEEPSEEK_API_KEY="$KEY"

# Kill old processes
pkill -f "gateway-integration" 2>/dev/null || true
pkill -f "gateway.js" 2>/dev/null || true
sleep 1

# Start AI service on 3030
node /root/services/gateway-integration.js &
AI_PID=$!
echo "AI service PID: $AI_PID"
sleep 2

# Test AI service directly
echo "=== AI service health ==="
curl -s http://127.0.0.1:3030/health
echo ""

echo "=== Test AI analyze ==="
curl -s -X POST http://127.0.0.1:3030/v1/analyze \
  -H "Content-Type: application/json" \
  -d '{"text":"What is 2+2? Answer in one word."}'
echo ""

# Start gateway on 8080
node /root/automaton/gateway.js &
GW_PID=$!
echo "Gateway PID: $GW_PID"
sleep 2

# Test through gateway proxy
echo "=== Test through gateway proxy ==="
curl -s -X POST http://127.0.0.1:8080/v1/analyze \
  -H "Content-Type: application/json" \
  -d '{"text":"What is 2+2? Answer in one word."}'
echo ""

echo "=== Done ==="
echo "AI Service: http://127.0.0.1:3030"
echo "Gateway:    http://127.0.0.1:8080"
echo "Public:     https://automation.songheng.vip"
