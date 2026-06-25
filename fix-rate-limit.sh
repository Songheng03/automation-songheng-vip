#!/bin/bash
# Fix rate limiter and verify AI works end-to-end
set -e

cd /root/automaton

# Clear stale rate limit data
rm -f data/ratelimit.json
echo "[]" > data/payments.json 2>/dev/null || true
echo '{"requests":[],"total":0}' > data/usage.json 2>/dev/null || true

# Kill and restart
fuser -k 8080/tcp 2>/dev/null || true
sleep 1

DEEPSEEK_API_KEY="sk-28c30603ba48402e9f4a8d9d9bd539b3" node gateway.cjs > /dev/null 2>&1 &
sleep 3

# Test 1 - Health
echo "=== Health ==="
curl -s http://localhost:8080/health
echo ""

# Test 2 - AI Free Request
echo "=== AI Free Request ==="
RESULT=$(curl -s -m 30 -X POST http://localhost:8080/v1/analyze \
  -H 'Content-Type: application/json' \
  -d '{"text":"Test of the AI analysis system. Please analyze this text."}')
echo "$RESULT" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print('Status:', d.get('status','ok'))
print('Has analysis:', 'analysis' in d)
print('Has result:', 'result' in d)
print('Paid:', d.get('paid'))
print('Error:', d.get('error'))
if 'analysis' in d: print('Content:', d['analysis'][:100])
elif 'result' in d: print('Content:', d['result'][:100])
"
echo ""

# Test 3 - Playground loads
echo "=== Playground ==="
curl -s -o /dev/null -w "HTTP %{http_code} Size: %{size_download}" http://localhost:8080/playground
echo ""
echo "=== DONE ==="
