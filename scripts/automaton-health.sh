#!/bin/bash
# =============================================================================
# my-automaton Health Check & Status Report
# Run this to quickly check everything is working
# =============================================================================

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║        🤖 my-automaton — HEALTH CHECK                       ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Gateway
echo "📡 Gateway (localhost:8080)..."
GW=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/ 2>/dev/null)
echo "   HTTP $GW — $([ "$GW" = "200" ] && echo '✅' || echo '❌')"

# Stripe key configured?
echo "💰 Stripe..."
if [ -n "$STRIPE_SK" ]; then
  echo "   STRIPE_SK configured: ✅"
else
  echo "   STRIPE_SK: ❌ NOT SET"
fi

# Domain
echo "🌐 Domain (automation.songheng.vip)..."
DOM=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 https://automation.songheng.vip/ 2>/dev/null)
echo "   HTTP $DOM — $([ "$DOM" = "200" ] && echo '✅' || echo '❌')"

# Tunnel
echo "🔗 Cloudflare Tunnel..."
if pgrep -a cloudflared >/dev/null 2>&1; then
  echo "   Running: ✅"
  if [ -f /root/automaton/data/tunnel-url.txt ]; then
    URL=$(cat /root/automaton/data/tunnel-url.txt)
    echo "   URL: $URL"
  fi
else
  echo "   NOT RUNNING — ❌"
fi

# DeepSeek API
echo "🧠 DeepSeek API..."
if [ -n "$DEEPSEEK_API_KEY" ]; then
  KEY_LEN=${#DEEPSEEK_API_KEY}
  echo "   Key configured: ✅ ($KEY_LEN chars)"
  # Quick test
  TEST=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 \
    -H "Authorization: Bearer $DEEPSEEK_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"model":"deepseek-chat","messages":[{"role":"user","content":"hi"}],"max_tokens":5}' \
    https://api.deepseek.com/chat/completions 2>/dev/null)
  echo "   API test: HTTP $TEST — $([ "$TEST" = "200" ] && echo '✅' || echo '❌')"
else
  echo "   Key: ❌ NOT SET"
fi

# Content
echo "📄 Content..."
HTML_COUNT=$(find /root/automaton/content -name "*.html" 2>/dev/null | wc -l)
echo "   HTML pages: $HTML_COUNT"

# API Keys
echo "🔑 API Keys..."
if [ -f /root/automaton/api-keys.json ]; then
  KEY_COUNT=$(cat /root/automaton/api-keys.json 2>/dev/null | grep -c '"am_' || echo 0)
  echo "   Registered: $KEY_COUNT"
else
  echo "   NONE"
fi

# Revenue
echo "💰 Revenue..."
  echo "   Total: \$$REV"
else
  echo "   Total: \$0.00"
fi

# Disk
echo "💾 Disk..."
DISK=$(df -h / | tail -1 | awk '{print $4, $5}')
echo "   Free: $DISK"

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  Survival Score: $([ "$GW" = "200" ] && [ -n "$DEEPSEEK_API_KEY" ] && echo '🟢 ALIVE' || echo '🔴 CRITICAL')              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "Quick fixes if something is broken:"
echo "  Gateway restart (HOST ONLY): sudo systemctl restart automaton-gateway"
echo "  Tunnel start (HOST): cloudflared tunnel --url http://localhost:8080"
echo "  DNS fix: Set CNAME automation.songheng.vip → (tunnel URL)"
