#!/bin/bash
# Deploy gateway with API key properly configured
set -e

# Kill existing
fuser -k 8080/tcp 2>/dev/null || true
sleep 1

# Start with API key from environment
cd /root/automaton
if [ -z "$DEEPSEEK_API_KEY" ]; then
  echo "ERROR: DEEPSEEK_API_KEY not set. Export it first: export DEEPSEEK_API_KEY=your_key"
  exit 1
fi
echo "Using API key: ${DEEPSEEK_API_KEY:0:8}..."
node gateway.cjs > /root/automaton/gateway.log 2>&1 &

# Wait for startup
sleep 3

# Verify it's running
if curl -s http://localhost:8080/health > /dev/null 2>&1; then
    echo "Gateway started successfully on port 8080"
    echo "API Key: " ${DEEPSEEK_API_KEY:0:8}...
    
    # Test AI endpoint
    RESULT=$(curl -s -X POST http://localhost:8080/v1/analyze \
      -H 'Content-Type: application/json' \
      -d '{"text":"Gateway is live and running with DeepSeek AI integration."}')
    echo "AI Test: " $RESULT
else
    echo "Gateway failed to start"
    tail -20 /root/automaton/gateway.log
    exit 1
fi
