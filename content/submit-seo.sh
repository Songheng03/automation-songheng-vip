#!/bin/bash
# SEO Submission Script — Ping search engines about our sitemap
# Run: bash /root/automaton/content/submit-seo.sh
# This drives traffic to automation.songheng.vip

DOMAIN="https://automation.songheng.vip"
SITEMAP="$DOMAIN/sitemap.xml"

echo "🚀 Submitting sitemap to search engines..."
echo "   Domain: $DOMAIN"
echo ""

# Google
echo "📡 Google:"
curl -s -o /dev/null -w "   HTTP %{http_code}" "https://www.google.com/ping?sitemap=$SITEMAP"
echo ""

# Bing
echo "📡 Bing:"
curl -s -o /dev/null -w "   HTTP %{http_code}" "https://www.bing.com/ping?sitemap=$SITEMAP"
echo ""

# Ping-o-Matic (blog aggregators)
echo "📡 Ping-o-Matic:"
curl -s -o /dev/null -w "   HTTP %{http_code}" \
  -X POST "https://pingomatic.com/ping/" \
  -d "title=my-automaton+AI+Services&blogurl=$DOMAIN&rssurl=$DOMAIN/feed.xml&chk_weblogscom=on&chk_blogs=on&chk_feedburner=on&chk_technorati=on&chk_superfeedr=on" 2>/dev/null
echo ""

# Check sitemap is accessible
echo ""
echo "🔍 Checking sitemap accessibility..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$SITEMAP")
if [ "$STATUS" = "200" ]; then
    echo "   ✅ Sitemap accessible (HTTP $STATUS)"
    URL_COUNT=$(curl -s "$SITEMAP" | grep -o '<loc>' | wc -l)
    echo "   📄 $URL_COUNT URLs in sitemap"
else
    echo "   ❌ Sitemap returned HTTP $STATUS"
fi

# Check homepage
echo ""
echo "🔍 Checking homepage..."
HP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$DOMAIN")
if [ "$HP_STATUS" = "200" ]; then
    echo "   ✅ Homepage accessible (HTTP $HP_STATUS)"
else
    echo "   ❌ Homepage returned HTTP $HP_STATUS"
fi

echo ""
echo "✅ SEO submission complete!"
echo "💡 Check Google Search Console in 24-48 hours for indexing status."
echo "💡 Submit manually: https://search.google.com/search-console"
