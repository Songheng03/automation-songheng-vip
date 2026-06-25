#!/bin/bash
# PROMOTION ENGINE v1.0 - Shell Edition
# Ping search engines and submit to directories
# Usage: bash promote.sh

DOMAIN="automation.songheng.vip"
SITEMAP="https://${DOMAIN}/sitemap.xml"
NOW=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
RESULTS="/root/automaton/data/promotion-results.json"

echo "=============================================="
echo " PROMOTION ENGINE v1.0"
echo " Domain: ${DOMAIN}"
echo " Date: ${NOW}"
echo "=============================================="

# 1. Verify domain
echo ""
echo "=== VERIFYING DOMAIN ==="
HTTP_CODE=$(curl -s -o /tmp/domain-check.txt -w "%{http_code}" --connect-timeout 10 "https://${DOMAIN}/" 2>/dev/null)
if [ "$HTTP_CODE" = "200" ]; then
    echo "  ✓ ${DOMAIN} → HTTP 200"
    DOMAIN_OK=true
else
    echo "  ✗ ${DOMAIN} → HTTP ${HTTP_CODE}"
    echo "  Aborting - domain not reachable"
    echo '{"timestamp":"'${NOW}'","domain":"'${DOMAIN}'","reachable":false,"error":"HTTP '${HTTP_CODE}'"}' > $RESULTS
    exit 1
fi

# 2. Ping search engines
echo ""
echo "=== PINGING SEARCH ENGINES ==="
SE_RESULTS="["
# Google
echo "  → Google..."
GSTATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://www.google.com/ping?sitemap=${SITEMAP}" 2>/dev/null)
echo "    ${GSTATUS}" | grep -q "200" && echo "    ✓ Google OK" || echo "    ✗ Google: HTTP ${GSTATUS}"
SE_RESULTS="${SE_RESULTS}{\"engine\":\"Google\",\"status\":${GSTATUS}}"

# Bing
echo "  → Bing..."
BSTATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://www.bing.com/ping?sitemap=${SITEMAP}" 2>/dev/null)
echo "    ${BSTATUS}" | grep -q "200" && echo "    ✓ Bing OK" || echo "    ✗ Bing: HTTP ${BSTATUS}"
SE_RESULTS="${SE_RESULTS},{\"engine\":\"Bing\",\"status\":${BSTATUS}}"
SE_RESULTS="${SE_RESULTS}]"

# 3. Generate stats
echo ""
echo "=== ACCOUNT STATS ==="
API_KEYS="/root/automaton/data/api-keys.json"
if [ -f "$API_KEYS" ]; then
    TOTAL_KEYS=$(python3 -c "import json; d=json.load(open('${API_KEYS}')); print(len(d))" 2>/dev/null || echo "?")
    TOTAL_CREDITS=$(python3 -c "
import json
d=json.load(open('${API_KEYS}'))
total=0
used=0
paying=0
for k,v in d.items():
    if v.get('price_id') and v['price_id']!='dev':
        paying+=1
        total+=v.get('credits',0)
        used+=v.get('used',0)
print(f'{paying},{total},{used}')
" 2>/dev/null || echo "0,0,0")
    PAYING=$(echo $TOTAL_CREDITS | cut -d, -f1)
    SOLD=$(echo $TOTAL_CREDITS | cut -d, -f2)
    USED=$(echo $TOTAL_CREDITS | cut -d, -f3)
    if [ "$SOLD" -gt 0 ] 2>/dev/null; then
        PCT=$(echo "scale=1; $USED*100/$SOLD" | bc 2>/dev/null || echo "0")
    else
        PCT="0"
    fi
    echo "  Paying users: ${PAYING}"
    echo "  Credits sold: ${SOLD}"
    echo "  Credits used: ${USED} (${PCT}%)"
else
    echo "  No api-keys.json found"
    PAYING=0; SOLD=0; USED=0; PCT="0"
fi

# 4. Save report
echo ""
echo "=== SAVING REPORT ==="
cat > $RESULTS << EOF
{
  "timestamp": "${NOW}",
  "domain": "${DOMAIN}",
  "reachable": true,
  "searchEngines": ${SE_RESULTS},
  "stats": {
    "payingUsers": ${PAYING:-0},
    "creditsSold": ${SOLD:-0},
    "creditsUsed": ${USED:-0},
    "utilizationPct": "${PCT:-0}"
  }
}
EOF
echo "  ✓ Report saved to ${RESULTS}"
cat $RESULTS | python3 -m json.tool 2>/dev/null || cat $RESULTS

echo ""
echo "=============================================="
echo " PROMOTION COMPLETE"
echo "=============================================="
