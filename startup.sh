#!/bin/bash
# ============================================================
# startup.sh - fix and restart gateway with all revenue features
# ============================================================
set -e

cd /root/automaton

# Clear rate limiter so we can test fresh
rm -f data/ratelimit.json

# Kill existing gateway
fuser -k 8080/tcp 2>/dev/null || true
sleep 1

# Verify ai-tools loads before starting
echo "[startup] Testing AI tools module..."
node -e "
  const m = require('./services/ai-tools.cjs');
  console.log('AI tools loaded:', Object.keys(m).join(', '));
  console.log('Has API key:', !!process.env.DEEPSEEK_API_KEY);
" 2>&1

# Now start gateway with proper env
echo "[startup] Starting gateway..."
if [ -z "$DEEPSEEK_API_KEY" ]; then
  export DEEPSEEK_API_KEY=$(cat /root/.automaton/deepseek-key 2>/dev/null || echo "")
fi
node gateway.cjs > /root/automaton/gateway.log 2>&1 &
PID=$!

# Wait and verify
sleep 3
if kill -0 $PID 2>/dev/null; then
  echo "[startup] Gateway running on PID $PID"
  echo "[startup] Checking health..."
  curl -s http://localhost:8080/health | python3 -m json.tool
else
  echo "[startup] Gateway FAILED to start"
  tail -30 /root/automaton/gateway.log
  exit 1
fi

# Test AI endpoint
echo "[startup] Testing AI endpoint..."
RESULT=$(curl -s -m 30 -X POST http://localhost:8080/v1/analyze \
  -H 'Content-Type: application/json' \
  -d '{"text":"This is a test of the AI analysis system. I need to verify the DeepSeek integration is working correctly."}')

echo "$RESULT" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    if 'analysis' in d:
        print('AI SUCCESS - analysis received:', d['analysis'][:80], '...')
    elif 'error' in d:
        print('AI ERROR:', d['error'])
    else:
        print('AI RESPONSE:', json.dumps(d)[:200])
except Exception as e:
    print('PARSE ERROR:', e)
    print('RAW:', '$RESULT'[:300])
"

echo ""
echo "[startup] Deployment complete!"
echo "URL: https://automation.songheng.vip"
echo "API: https://automation.songheng.vip/v1/analyze"
echo "Playground: https://automation.songheng.vip/playground"
echo "Dashboard: https://automation.songheng.vip/dashboard"
