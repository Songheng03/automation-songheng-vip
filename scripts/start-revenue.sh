#!/bin/bash
# my-automaton Revenue Service Starter
# Extracts DeepSeek API key from automaton.json (stored as openaiApiKey)
# Writes it to where the AI service expects it, then starts everything.

set -e

# Get the key from automaton.json (it's stored as openaiApiKey field)
KEY=$(node -e "
try {
  const cfg = JSON.parse(require('fs').readFileSync('/root/.automaton/automaton.json','utf8'));
  const key = cfg.openaiApiKey || cfg.DEEPSEEK_API_KEY || '';
  if (key && key.length > 10) process.stdout.write(key);
} catch(e) {}")

if [ -z "$KEY" ]; then
  echo "ERROR: Could not find DeepSeek API key in /root/.automaton/automaton.json"
  exit 1
fi

echo "Key found: ${#KEY} chars (${KEY:0:8}...)"

# Write key to the file that gateway-integration.js reads
mkdir -p /root/automaton/data
printf '%s' "$KEY" > /root/automaton/data/deepseek-key
printf '%s' "$KEY" > /root/.automaton/deepseek-key
export DEEPSEEK_API_KEY="$KEY"

# Kill old processes
fuser -k 3030/tcp 2>/dev/null || true
fuser -k 8080/tcp 2>/dev/null || true
sleep 1

# Start AI integration service (v3 - reads deepseek-key file)
node /root/services/gateway-integration.js > /root/automaton/logs/ai-service.log 2>&1 &
echo "AI service PID: $!"
sleep 2

# Start gateway
node /root/automaton/gateway.js > /root/automaton/logs/gateway.log 2>&1 &
echo "Gateway PID: $!"
sleep 2

# Verify both services
echo ""
echo "=== AI Service Health ==="
curl -s http://127.0.0.1:3030/health
echo ""

echo "=== Gateway Health ==="
curl -s http://127.0.0.1:8080/health
echo ""

echo "=== AI Service Test (free tier) ==="
curl -s -X POST http://127.0.0.1:3030/v1/summarize \
  -H "Content-Type: application/json" \
  -d '{"text":"Hello world, keep it short."}'
echo ""

echo "=== Gateway Proxy Test ==="
curl -s -X POST http://127.0.0.1:8080/v1/explain \
  -H "Content-Type: application/json" \
  -d '{"text":"console.log(42)"}'
echo ""

echo "=== Done! Services running. ==="
echo "Public URL: https://automation.songheng.vip"
