#!/bin/bash
# my-automaton: Deploy gateway + start monitoring
# This script ensures the gateway is running with real AI and monitors revenue

HOME=/root/automaton
GATEWAY=$HOME/gateway.cjs
LOG=/tmp/automaton-deploy.log

echo "=== my-automaton Deploy $(date) ===" | tee $LOG

# 1. Find the DeepSeek key from environment or config
DEEPSEEK_KEY="${DEEPSEEK_KEY:-}"
if [ -z "$DEEPSEEK_KEY" ] && [ -f $HOME/automaton.json ]; then
    DEEPSEEK_KEY=$(grep -o '"deepseek_key"[[:space:]]*:[[:space:]]*"[^"]*"' $HOME/automaton.json | cut -d'"' -f4)
fi

# 2. Test the key
if [ -n "$DEEPSEEK_KEY" ]; then
    echo "Testing DeepSeek API key..." | tee -a $LOG
    TEST=$(curl -s -o /dev/null -w "%{http_code}" \
        https://api.deepseek.com/v1/models \
        -H "Authorization: Bearer $DEEPSEEK_KEY" 2>/dev/null)
    if [ "$TEST" = "200" ]; then
        echo "✓ DeepSeek API key is VALID" | tee -a $LOG
        export DEEPSEEK_KEY="$DEEPSEEK_KEY"
    else
        echo "✗ DeepSeek API key returned HTTP $TEST — will use mock mode" | tee -a $LOG
    fi
else
    echo "⚠ No DeepSeek key found — will use mock mode" | tee -a $LOG
fi

# 3. Kill existing gateway
echo "Stopping old gateway..." | tee -a $LOG
fuser -k 8080/tcp 2>/dev/null || true
sleep 1

# 4. Start v8.2 gateway
echo "Starting gateway v8.2..." | tee -a $LOG
cd $HOME && node gateway.cjs > /tmp/gw.log 2>&1 &
GWPID=$!
sleep 2

# 5. Verify
HEALTH=$(curl -s http://localhost:8080/health 2>/dev/null)
if echo "$HEALTH" | grep -q '"status":"ok"'; then
    echo "✓ Gateway running on port 8080" | tee -a $LOG
else
    echo "✗ Gateway failed to start" | tee -a $LOG
    cat /tmp/gw.log | tail -5 >> $LOG
    exit 1
fi

# 6. Test all free endpoints
echo "Testing free API endpoints..." | tee -a $LOG
for svc in analyze summarize review security explain refactor complexity; do
    RESULT=$(curl -s -o /dev/null -w "%{http_code}" \
        http://localhost:8080/api/free/$svc \
        -H "Content-Type: application/json" \
        -d "{\"code\":\"test\"}" 2>/dev/null)
    echo "  /api/free/$svc → $RESULT" | tee -a $LOG
done

# 7. Check Stripe mode
    echo "✓ Stripe: REAL mode (key set)" | tee -a $LOG
else
    echo "ℹ Stripe: DEV mode (auto-generate keys)" | tee -a $LOG
fi

# 8. Check API keys count
KEYS=$(curl -s http://localhost:8080/api/stats/overview 2>/dev/null | grep -o '"count":[0-9]*' | cut -d: -f2)
echo "ℹ Active API keys: ${KEYS:-0}" | tee -a $LOG

# 9. Test purchase flow
PURCHASE=$(curl -s -o /dev/null -w "%{redirect_url}" \
    "http://localhost:8080/api/x402-payment?price=price_starter&credits=500" 2>/dev/null)
echo "ℹ Purchase flow: $PURCHASE" | tee -a $LOG

# 10. Write status to file
cat > $HOME/data/deploy-status.json << EOF
{
  "deployed_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "gateway": "v8.2",
  "status": "running",
  "deepseek": "$([ "$TEST" = "200" ] && echo 'real' || echo 'mock')",
  "port": 8080,
  "pid": $GWPID
}
EOF

echo ""
echo "=== DEPLOYMENT COMPLETE ===" | tee -a $LOG
echo "Site: https://automation.songheng.vip" | tee -a $LOG
echo "Health: http://localhost:8080/health" | tee -a $LOG
echo "Dashboard: http://localhost:8080/dashboard" | tee -a $LOG
