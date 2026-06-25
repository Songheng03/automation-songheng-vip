#!/bin/bash
# check-indexed.sh — Check if our pages are indexed in Google
# Usage: bash check-indexed.sh

SITE="automation.automation.songheng.vip"
PAGES=(
  "/"
  "/pricing.html"
  "/api-docs.html"
  "/portal.html"
  "/api-playground.html"
  "/dashboard.html"
  "/blog.html"
  "/agent-integration.html"
  "/webhook-integration.html"
  "/mcp-install.html"
)

echo "============================================"
echo "  Google Index Check for $SITE"
echo "============================================"
echo ""

for page in "${PAGES[@]}"; do
  url="https://$SITE$page"
  result=$(curl -s "https://www.google.com/search?q=site:$url" \
    -H "User-Agent: Mozilla/5.0" \
    --connect-timeout 10 2>/dev/null | grep -o "About [0-9,]* results" | head -1)
  
  if [ -z "$result" ]; then
    echo "  ? $url — not indexed yet"
  else
    echo "  ✓ $url — $result"
  fi
done

echo ""
echo "============================================"
echo "  Testing live HTTP status of all pages..."
echo "============================================"
echo ""

for page in "${PAGES[@]}"; do
  status=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "http://localhost:8080$page" 2>/dev/null)
  echo "  $status localhost:8080$page"
done

echo ""
echo "============================================"
echo "  API Gateway Health Check"
echo "============================================"

# Check gateway is responding
gw=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "http://localhost:8080/" 2>/dev/null)
echo "  Gateway: $gw"

# Check free tier works
free=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 10 \
  -X POST "http://localhost:8080/free/analyze" \
  -H "Content-Type: application/json" \
  -d '{"text":"Hello world"}' 2>/dev/null)
echo "  Free tier: $free"

# Check api keys exist and their status
echo ""
echo "============================================"
echo "  API Key Summary"
echo "============================================"
python3 -c "
import json
with open('/root/automaton/api-keys.json') as f:
    keys = json.load(f)

real_keys = {k:v for k,v in keys.items() if k.startswith('am_') and not k.startswith('am_trial') and not k.startswith('am_dev_')}
trial_keys = {k:v for k,v in keys.items() if k.startswith('am_trial')}
total_credits = sum(k.get('credits',0) for k in real_keys.values())
total_used = sum(k.get('used',0) for k in real_keys.values())

print(f'  Real paying keys: {len(real_keys)}')
print(f'  Trial/dev keys: {len(trial_keys)}')
print(f'  Total credits issued: {total_credits}')
print(f'  Total credits used: {total_used}')
print(f'  Utilization rate: {(total_used/total_credits*100) if total_credits > 0 else 0:.2f}%')
print()
for k, v in real_keys.items():
    print(f'  {k[:20]}...: {v.get(\"credits\",0)}cr, {v.get(\"used\",0)} used, {v.get(\"price_id\",\"?\")}')
"
