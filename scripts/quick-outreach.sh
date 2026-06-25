#!/bin/bash
# quick-outreach.sh - Ping search engines, update sitemaps, check indexing
# Usage: bash scripts/quick-outreach.sh
# Recommended: run daily via cron

set -e
DOMAIN="https://automation.songheng.vip"
SITEMAP="${DOMAIN}/sitemap.xml"
DIRECT_IP="http://automation.songheng.vip:8080"
WEB_ROOT="/root/automaton/content"

echo "🤖 my-automaton Outreach Engine"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Started: $(date -u)"
echo ""

# 1. Check gateway health
echo "📡 Checking gateway..."
GATEWAY_OK=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 "$DIRECT_IP/api/health" 2>/dev/null || echo "000")
echo "   Gateway: $GATEWAY_OK"

# 2. Ping search engines
echo ""
echo "🔍 Pinging search engines..."
ENGINES=(
  "https://www.google.com/ping?sitemap=$SITEMAP"
  "https://www.bing.com/ping?sitemap=$SITEMAP"
  "https://search.yahoo.com/ping?sitemap=$SITEMAP"
)

for engine in "${ENGINES[@]}"; do
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$engine" 2>/dev/null || echo "FAIL")
  echo "   Ping: $(echo "$engine" | cut -d/ -f3) → $HTTP_CODE"
done

# 3. Submit to IndexNow (Bing's fast indexing)
echo ""
echo "⚡ Submitting to IndexNow..."
# Count URLs in sitemap
SITEMAP_PATH="$WEB_ROOT/sitemap.xml"
if [ -f "$SITEMAP_PATH" ]; then
  URL_COUNT=$(grep -c '<url>' "$SITEMAP_PATH" 2>/dev/null || echo "0")
  echo "   Sitemap has $URL_COUNT URLs"
  
  # Submit first 10 URLs as test
  echo "   Submitting top URLs..."
  for url in $(grep -oP '<loc>\K[^<]+' "$SITEMAP_PATH" 2>/dev/null | head -10); do
    INDEXNOW_PAYLOAD="{\"host\":\"automation.songheng.vip\",\"key\":\"my-automaton-indexnow\",\"keyLocation\":\"${DOMAIN}/indexnow-key.txt\",\"urlList\":[\"$url\"]}"
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 \
      -X POST "https://api.indexnow.org/IndexNow" \
      -H "Content-Type: application/json" \
      -d "$INDEXNOW_PAYLOAD" 2>/dev/null || echo "FAIL")
    echo "   $url → $HTTP_CODE"
  done
else
  echo "   No sitemap found at $SITEMAP_PATH"
fi

# 4. Check if any directory submissions are due
echo ""
echo "📋 Directory submission status..."
echo "   Open this in browser to submit:"
echo "   → $DOMAIN/directory-blast.html"
echo "   → $DOMAIN/directory-submit.html"

# 5. Generate stats summary
echo ""
echo "📊 Quick Stats:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ -f "/root/automaton/data/api-keys.json" ]; then
  KEY_COUNT=$(grep -c '"credits"' /root/automaton/data/api-keys.json 2>/dev/null || echo "0")
  echo "   API Keys: $KEY_COUNT"
fi

if [ -f "/root/automaton/data/tunnel-status.json" ]; then
  TUNNEL_STATE=$(grep -oP '"tunnel_state": "\K[^"]+' /root/automaton/data/tunnel-status.json 2>/dev/null || echo "unknown")
  echo "   Tunnel: $TUNNEL_STATE"
fi

# Content count
CONTENT_COUNT=$(find "$WEB_ROOT" -name "*.html" 2>/dev/null | wc -l)
echo "   Pages: $CONTENT_COUNT"

echo ""
echo "✅ Outreach complete: $(date -u)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
