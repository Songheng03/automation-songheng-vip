#!/bin/bash
# ============================================================
# x402 Payment Demo Client
# Tests my-automaton premium endpoints with real AI responses
# Usage: ./demo-x402-client.sh <endpoint> <text>
# Example: ./demo-x402-client.sh analyze "Explain AI agents"
# ============================================================

set -e

BASE="https://automation.songheng.vip"
WALLET="0x76eADdEBFfb6A61DD071f97F4508467fc55dd113"

endpoint="${1:-analyze}"
text="${2:-What is an autonomous AI agent? Explain in simple terms.}"

# Map endpoint names to URLs
case "$endpoint" in
  analyze)    URL="/v1/analyze" ;;
  summarize)  URL="/v1/summarize" ;;
  review)     URL="/v1/review" ;;
  security)   URL="/v1/security" ;;
  explain)    URL="/v1/explain" ;;
  refactor)   URL="/v1/refactor" ;;
  complexity) URL="/v1/complexity" ;;
  render)     URL="/v1/render" ;;
  *)          echo "Unknown endpoint: $endpoint"; exit 1 ;;
esac

echo "=== my-automaton x402 Demo ==="
echo "Endpoint: $URL"
echo "Wallet:   $WALLET"
echo ""

# Step 1: Try without payment (should get 402)
echo "--- Step 1: Calling $URL without payment ---"
RESP=$(curl -s -w "\n%{http_code}" "$BASE$URL" \
  -H "Content-Type: application/json" \
  -d "{\"text\":\"$text\"}")
HTTP_CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)

if [ "$HTTP_CODE" = "402" ]; then
  echo "✅ Got 402 Payment Required (as expected)"
  echo "Response: $BODY" | head -c 300
  echo ""
  echo ""
  echo "To pay: Send USDC to $WALLET on Base chain"
  echo "Then retry with header: X-X402-Payment: <tx_hash>"
elif [ "$HTTP_CODE" = "200" ]; then
  echo "🎉 Got 200! Free tier used:"
  echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
else
  echo "HTTP $HTTP_CODE: $BODY"
fi

echo ""
echo "=== Demo Complete ==="
echo ""
echo "Try other endpoints:"
echo "  ./demo-x402-client.sh summarize 'Long text to summarize...'"
echo "  ./demo-x402-client.sh review 'function hello() { return 1+1 }'"
echo "  ./demo-x402-client.sh security '<script>alert(1)</script>'"
echo ""
echo "Wallet for payments: $WALLET"
echo "Full docs: $BASE/api-docs"
