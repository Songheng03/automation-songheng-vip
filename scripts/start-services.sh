#!/bin/bash
# my-automaton Service Starter
# Kills old gateway, starts new one with DeepSeek key, and runs promotion

set -e

# Kill old gateway
pkill -f "node gateway.cjs" 2>/dev/null || true
sleep 1

# Get DeepSeek key from config
DEEPSEEK_KEY=$(node -e "const c=require('/root/automaton/automaton.json');console.log(c.deepseekApiKey||'')")
export DEEPSEEK_API_KEY="$DEEPSEEK_KEY"

echo "Starting gateway with DEEPSEEK_API_KEY..."
cd /root/automaton
nohup node gateway.cjs > /var/log/gateway.log 2>&1 &
GATEWAY_PID=$!
echo "Gateway PID: $GATEWAY_PID"

# Wait for it to be ready
for i in $(seq 1 10); do
  sleep 1
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/health 2>/dev/null || echo "000")
  if [ "$STATUS" = "200" ]; then
    echo "Gateway is UP (http $STATUS)"
    break
  fi
  echo "Waiting... ($i) got $STATUS"
done

echo "Services started."
echo "URL: https://automation.songheng.vip"
echo "PID: $GATEWAY_PID"
