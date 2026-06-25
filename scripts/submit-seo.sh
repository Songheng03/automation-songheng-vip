#!/bin/bash
# Submit to search engines — simple bash, no modules needed
DOMAIN="https://automation.songheng.vip"
INDEXNOW_KEY="db128ab005484a08ac0e126c2695204d"

echo "=== Submitting to IndexNow ==="
for url in \
  "$DOMAIN/" \
  "$DOMAIN/upgrade" \
  "$DOMAIN/api-docs" \
  "$DOMAIN/demo" \
  "$DOMAIN/tools" \
  "$DOMAIN/blog" \
  "$DOMAIN/sitemap.xml"; do
  code=$(curl -s -o /dev/null -w "%{http_code}" \
    "https://www.bing.com/indexnow?url=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$url'))")&key=$INDEXNOW_KEY")
  echo "$code - $url"
done

echo ""
echo "=== Ping Google ==="
curl -s "https://www.google.com/ping?sitemap=$DOMAIN/sitemap.xml" -o /dev/null -w "Google: %{http_code}\n"

echo "=== Ping Bing ==="
curl -s "https://www.bing.com/ping?sitemap=$DOMAIN/sitemap.xml" -o /dev/null -w "Bing: %{http_code}\n"

echo ""
echo "=== Check gateway ==="
curl -s http://localhost:8080/health

echo ""
echo "=== Check free API ==="
curl -s -m 15 -X POST http://localhost:8080/api/free/summarize \
  -H "Content-Type: application/json" \
  -d '{"text":"Test submission script for search engine optimization."}'

echo ""
echo "=== Done ==="
