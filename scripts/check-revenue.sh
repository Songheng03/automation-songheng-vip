#!/bin/bash
# Revenue & Health Check — run this to see if you're surviving
# Usage: bash /root/automaton/scripts/check-revenue.sh

GATEWAY="http://localhost:8080"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo "========================================="
echo "  my-automaton — Health & Revenue Report"
echo "  $(date -u)"
echo "========================================="
echo ""

# 1. Gateway check
GW=$(curl -s -o /dev/null -w "%{http_code}" "$GATEWAY/" --connect-timeout 5 2>/dev/null || echo "000")
if [ "$GW" = "200" ]; then
    echo -e "Gateway:       ${GREEN}UP${NC} (HTTP $GW)"
else
    echo -e "Gateway:       ${RED}DOWN${NC} (HTTP $GW)"
fi

# 2. Cloudflare tunnel check
TUNNEL=$(curl -s -o /dev/null -w "%{http_code}" "https://automation.automation.songheng.vip/" --connect-timeout 5 2>/dev/null || echo "000")
if [ "$TUNNEL" = "200" ]; then
    echo -e "Public URL:    ${GREEN}UP${NC} (HTTP $TUNNEL)"
else
    echo -e "Public URL:    ${RED}DOWN${NC} (HTTP $TUNNEL)"
fi

# 3. API Keys & Revenue
echo ""
echo "--- API KEYS & REVENUE ---"
if [ -f /root/automaton/data/api-keys.json ]; then
    python3 -c "
import json
with open('/root/automaton/data/api-keys.json') as f:
    keys = json.load(f)

total_keys = len(keys)
total_credits = sum(k.get('credits', 0) for k in keys.values())
total_used = sum(k.get('used', 0) for k in keys.values())
paid_keys = sum(1 for k in keys.values() if k.get('price_id'))
free_keys = total_keys - paid_keys
util = (total_used / total_credits * 100) if total_credits > 0 else 0

# Revenue estimation (rough: based on credits / pricing)
# Starter=500cr, Advanced=1100cr, Pro=3000cr, Ultimate=6500cr
PRICE_MAP = {'price_starter': 38, 'price_advanced': 78, 'price_pro': 198, 'price_ultimate': 388}
revenue = 0
for k in keys.values():
    pid = k.get('price_id', '')
    if pid in PRICE_MAP:
        revenue += PRICE_MAP[pid]

print(f'Total keys:     {total_keys}')
print(f'  Paid keys:    {paid_keys}')
print(f'  Free/Dev:     {free_keys}')
print(f'Credits issued: {total_credits}')
print(f'Credits used:   {total_used}')
print(f'Utilization:    {util:.1f}%')
print(f'Est. Revenue:   HK\${revenue} (USD\${revenue/7.8:.2f})')
"
else
    echo -e "${YELLOW}api-keys.json not found${NC}"
fi

# 4. Content pages
echo ""
echo "--- CONTENT PAGES ---"
HTML_COUNT=$(find /root/automaton/content -name '*.html' 2>/dev/null | wc -l)
BLOG_COUNT=$(find /root/automaton/content/blog -name '*.html' 2>/dev/null | wc -l)
echo "Total HTML pages:  $HTML_COUNT"
echo "  Blog articles:   $BLOG_COUNT"

# 5. Recent errors in gateway logs
echo ""
echo "--- RECENT ERRORS ---"
journalctl -u automaton-gateway --since "1 hour ago" 2>/dev/null | grep -i "error\|fail\|warn" | tail -5 || echo "No recent errors found"

# 6. Server resources
echo ""
echo "--- SYSTEM ---"
DISK=$(df -h / | tail -1 | awk '{print $5}')
MEM=$(free -m | grep Mem | awk '{print $3"MB / "$2"MB"}')
echo "Disk:    $DISK used"
echo "Memory:  $MEM used"

# 7. DeepSeek spending estimate
echo ""
echo "--- ESTIMATED DEEPSEEK SPENDING ---"
TURNS=$(curl -s "$GATEWAY/api/stats/overview" --connect-timeout 5 2>/dev/null | python3 -c "
import sys, json
try: d = json.load(sys.stdin); print(d.get('total_calls', d.get('calls', 'unknown')))
except: print('unknown')
" 2>/dev/null || echo "unavailable")
echo "API calls served: $TURNS"

# Survival verdict
echo ""
echo "--- VERDICT ---"
if [ "$GW" = "200" ] && [ "$TUNNEL" = "200" ]; then
    echo -e "${GREEN}✓ SURVIVING. Gateway up. Public URL reachable.${NC}"
    echo -e "${YELLOW}⚠ Next milestone: Get first $38 payment${NC}"
else
    echo -e "${RED}✗ CRITICAL: Gateway or tunnel is down!${NC}"
fi
echo ""
