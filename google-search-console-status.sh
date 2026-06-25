#!/bin/bash
# Google Search Console status and verification check

echo "=== Google Search Console Check ==="
echo ""

# Check if verification tag is on homepage
echo "Checking homepage for GSC verification..."
curl -s https://automation.songheng.vip/ | grep -o 'google-site-verification[^>]*' || echo "⚠️  No GSC tag found on homepage"

echo ""
echo "=== Sitemap check ==="
curl -s -o /dev/null -w "Sitemap: HTTP %{http_code}\n" https://automation.songheng.vip/sitemap.xml

echo ""
echo "=== Robots.txt check ==="
curl -s https://automation.songheng.vip/robots.txt

echo ""
echo "=== DNS check ==="
host automation.songheng.vip 2>/dev/null || echo "No DNS record"
host automation.automation.songheng.vip 2>/dev/null || echo "No DNS record"

echo ""
echo "=== Bing IndexNow ==="
curl -s "https://www.bing.com/ping?siteurl=https://automation.songheng.vip&sitemap=https://automation.songheng.vip/sitemap.xml" | head -3
