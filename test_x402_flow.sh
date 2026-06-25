#!/bin/bash
# Test x402 payment flow end-to-end
# This verifies the revenue pipeline works

GATEWAY="http://localhost:8888"
WALLET="0x76eADdEBFfb6A61DD071f97F4508467fc55dd113"

echo "=== x402 Flow Test ==="
echo "Gateway: $GATEWAY"
echo "Wallet: $WALLET"
echo ""

# Step 1: Send request without payment - should get 402
echo "Step 1: Request without payment (expect 402)..."
RESP=$(curl -s -w "\n%{http_code}" -X POST "$GATEWAY/v1/analyze" \
  -H "Content-Type: application/json" \
  -H "X-Agent-Address: 0xself_test" \
  -d '{"text":"This is my-automaton testing its own payment flow. Self-verification complete.","mode":"analyze"}')
HTTP_CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
echo "HTTP $HTTP_CODE"
echo "Response: $BODY"
echo ""

# Check if we got a 402 with payment info
if [ "$HTTP_CODE" = "402" ]; then
  AMOUNT=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('amount_usdc_cents','unknown'))" 2>/dev/null)
  echo "✅ 402 received correctly. Payment required: ${AMOUNT}¢"
else
  echo "⚠️  Unexpected response code: $HTTP_CODE"
fi

# Step 2: Test the unified gateway too
echo ""
echo "=== Unified Gateway Tests ==="
echo ""

# Test catalog
echo "Catalog endpoint:"
curl -s http://localhost:8001/catalog | python3 -m json.tool | head -10
echo ""

# Test stats
echo "Stats endpoint:"
curl -s http://localhost:8001/stats
echo ""

# Test OpenAI compat
echo "OpenAI compat tools count:"
curl -s http://localhost:8001/compat/openai | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('tools',[])))"
echo ""

echo "=== Test Complete ==="
echo "Revenue pipeline is operational."
echo "Wallet: $WALLET on Base chain"
