#!/bin/bash
# my-automaton - Directory Submission & Outreach Script
# Run this to submit to AI directories and SEO tools

BASE_URL="https://automation.songheng.vip"
GATEWAY="http://localhost:8080"

echo "=== my-automaton Outreach Package ==="
echo "Base URL: $BASE_URL"
echo ""

# 1. Ping Google (IndexNow API)
echo "[1/5] Pinging search engines..."
curl -s -X POST "https://api.indexnow.org/indexnow" \
  -H "Content-Type: application/json" \
  -d '{
    "host": "automation.songheng.vip",
    "key": "google27f3c8e1a2b4d5f6",
    "keyLocation": "https://automation.songheng.vip/google27f3c8e1a2b4d5f6.html",
    "urlList": [
      "https://automation.songheng.vip/",
      "https://automation.songheng.vip/get-started.html",
      "https://automation.songheng.vip/api-docs.html",
      "https://automation.songheng.vip/pricing.html",
      "https://automation.songheng.vip/api-playground.html",
      "https://automation.songheng.vip/blog.html"
    ]
  }' > /dev/null 2>&1
echo "   IndexNow ping sent!"

# 2. Ping Bing
curl -s "https://www.bing.com/ping?sitemap=https://automation.songheng.vip/sitemap.xml" > /dev/null 2>&1
echo "   Bing sitemap ping sent!"

# 3. Check gateway health
echo "[2/5] Checking gateway health..."
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" $GATEWAY/ 2>/dev/null)
echo "   Homepage: HTTP $HEALTH"

# 4. Test all content pages
echo "[3/5] Testing content pages..."
for page in index.html get-started.html api-docs.html pricing.html api-playground.html blog.html dashboard.html sitemap.xml robots.txt; do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" $GATEWAY/$page 2>/dev/null)
  if [ "$CODE" = "200" ]; then
    echo "   ✓ $page"
  else
    echo "   ✗ $page (HTTP $CODE)"
  fi
done

# 5. Test API endpoints
echo "[4/5] Testing API endpoints..."
for endpoint in /api/free/analyze; do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST $GATEWAY$endpoint \
    -H "Content-Type: application/json" \
    -d '{"text":"hello","mode":"analyze"}' 2>/dev/null)
  echo "   POST $endpoint → HTTP $CODE"
done

# 6. Generate outreach links
echo "[5/5] Directory submission links (open in browser):"
echo ""
echo "=== Submit to AI Directories ==="
echo "1. Smithery.ai: https://smithery.ai/server/submit?url=$BASE_URL"
echo "2. You.com/ai: https://you.com/search?q=site:$BASE_URL"
echo "3. MCP.so: https://mcp.so/submit?url=$BASE_URL"
echo "4. Google Search Console: https://search.google.com/search-console?resource_id=sc-domain:automation.songheng.vip"
echo "5. Bing Webmaster: https://www.bing.com/webmasters"
echo ""
echo "=== Social Posts ==="
echo "Show HN: https://news.ycombinator.com/submitlink?u=$BASE_URL&t=my-automaton%20-%20AI%20Code%20Review%20API%20that%20pays%20for%20its%20own%20compute"
echo "Product Hunt: https://www.producthunt.com/posts/my-automaton"
echo ""
echo "✅ Outreach package complete!"
