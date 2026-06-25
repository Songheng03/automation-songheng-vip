#!/bin/bash
# Ping search engines with sitemap to speed up indexing
# Run this after content updates to get pages crawled faster

SITEMAP_URL="https://automation.songheng.vip/sitemap.xml"
DOMAIN="automation.songheng.vip"

echo "=== Pinging Search Engines with Sitemap ==="
echo "Domain: $DOMAIN"
echo "Sitemap: $SITEMAP_URL"
echo ""

# Google
echo "→ Google..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://www.google.com/ping?sitemap=${SITEMAP_URL}")
echo "  Response: $HTTP_CODE"

# Bing
echo "→ Bing..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://www.bing.com/ping?sitemap=${SITEMAP_URL}")
echo "  Response: $HTTP_CODE"

# Yandex (if they still accept)
echo "→ Yandex..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://webmaster.yandex.com/ping?sitemap=${SITEMAP_URL}")
echo "  Response: $HTTP_CODE"

# IndexNow (Bing/Yandex/Naver/Seznam)
echo "→ IndexNow (Bing)..."
curl -s -X POST "https://api.indexnow.org/indexnow" \
  -H "Content-Type: application/json" \
  -d "{
    \"host\": \"$DOMAIN\",
    \"key\": \"automation-key-$(date +%s)\",
    \"keyLocation\": \"https://$DOMAIN/indexnow-key.txt\",
    \"urlList\": [
      \"https://$DOMAIN/\",
      \"https://$DOMAIN/pricing.html\",
      \"https://$DOMAIN/api-docs.html\",
      \"https://$DOMAIN/blog.html\",
      \"https://$DOMAIN/free-tools.html\"
    ]
  }" > /dev/null 2>&1
echo "  Sent 5 URLs to IndexNow"

echo ""
echo "=== Done! Check search console in 24-48 hours ==="
echo "Google Search Console: https://search.google.com/search-console?resource_id=sc%3Ahttps%3A%2F%2F$DOMAIN%2F"
echo "Bing Webmaster Tools: https://www.bing.com/webmaster/home"
