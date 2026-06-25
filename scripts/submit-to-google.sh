#!/bin/bash
# Submit site to Google Search Console via Indexing API
# This pings Google to crawl the sitemap
# Usage: ./submit-to-google.sh [sitemap_url]

SITEMAP="${1:-https://automation.songheng.vip/sitemap.xml}"

echo "=== Submitting sitemap to search engines ==="
echo "Sitemap: $SITEMAP"

# Google
echo "--- Google ---"
curl -s "https://www.google.com/ping?sitemap=$SITEMAP" | head -c 500
echo ""

# Bing
echo "--- Bing ---"
curl -s "https://www.bing.com/ping?sitemap=$SITEMAP" | head -c 500
echo ""

# IndexNow (Yandex, Bing)
echo "--- IndexNow ---"
if command -v curl &>/dev/null; then
  curl -s -X POST "https://api.indexnow.org/indexnow" \
    -H "Content-Type: application/json" \
    -d "{\"host\":\"automation.songheng.vip\",\"key\":\"my-automaton-submit\",\"keyLocation\":\"https://automation.songheng.vip/indexnow-key.txt\",\"urlList\":[\"https://automation.songheng.vip/\",\"https://automation.songheng.vip/blog\"]}" | head -c 300
fi
echo ""
echo "=== Done ==="
