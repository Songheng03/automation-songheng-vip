#!/bin/bash
# promote.sh — Drive traffic to my-automaton services
# Run: bash /root/automaton/promote.sh
# Posts service announcements and pings search engines

SITE="https://automation.songheng.vip"
LOG="/root/automaton/data/promote.log"
DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

mkdir -p /root/automaton/data

log() { echo "[$DATE] $1" >> "$LOG"; echo "[$DATE] $1"; }

echo "============= PROMO RUN =============" >> "$LOG"

# 1. Check gateway is alive
GW=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 http://localhost:8080/health 2>/dev/null)
log "Gateway health: $GW"

# 2. Ping Google Search Console (via IndexNow)
log "Pinging IndexNow..."

# Generate key file if missing
KEY="c79a8a7d8b2e4f3ca1d6e5f4a3b2c1d0"
KEY_FILE="/root/automaton/content/${KEY}.txt"
if [ ! -f "$KEY_FILE" ]; then
  echo "$KEY" > "$KEY_FILE"
  log "Created IndexNow key file"
fi

# Submit to IndexNow
curl -s -X POST "https://api.indexnow.org/indexnow" \
  -H "Content-Type: application/json" \
  -d "{
    \"host\": \"automation.songheng.vip\",
    \"key\": \"$KEY\",
    \"keyLocation\": \"$SITE/$KEY.txt\",
    \"urlList\": [
      \"$SITE/\",
      \"$SITE/playground\",
      \"$SITE/tools\",
      \"$SITE/dashboard\",
      \"$SITE/api-docs\",
      \"$SITE/blog\"
    ]
  }" > /dev/null 2>&1 && log "IndexNow pinged" || log "IndexNow FAILED"

# 3. Ping Bing
curl -s "https://www.bing.com/ping?siteMap=$SITE/sitemap.xml" > /dev/null 2>&1 && log "Bing pinged" || log "Bing FAILED"

# 4. Generate sitemap
SITEMAP="/root/automaton/content/sitemap.xml"
cat > "$SITEMAP" << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
EOF

# Add homepage
echo "  <url><loc>${SITE}/</loc><priority>1.0</priority><changefreq>daily</changefreq></url>" >> "$SITEMAP"
echo "  <url><loc>${SITE}/playground</loc><priority>0.9</priority><changefreq>daily</changefreq></url>" >> "$SITEMAP"
echo "  <url><loc>${SITE}/tools</loc><priority>0.9</priority><changefreq>daily</changefreq></url>" >> "$SITEMAP"
echo "  <url><loc>${SITE}/api-docs</loc><priority>0.8</priority><changefreq>weekly</changefreq></url>" >> "$SITEMAP"
echo "  <url><loc>${SITE}/dashboard</loc><priority>0.8</priority><changefreq>daily</changefreq></url>" >> "$SITEMAP"
echo "  <url><loc>${SITE}/blog</loc><priority>0.7</priority><changefreq>weekly</changefreq></url>" >> "$SITEMAP"

# Blog articles
for f in /root/automaton/content/blog/*.html; do
  slug=$(basename "$f" .html)
  echo "  <url><loc>${SITE}/blog/${slug}</loc><priority>0.6</priority><changefreq>monthly</changefreq></url>" >> "$SITEMAP"
done

# Tools
for f in /root/automaton/content/tools/*.html; do
  slug=$(basename "$f" .html)
  [ "$slug" = "index" ] && continue
  echo "  <url><loc>${SITE}/tools/${slug}</loc><priority>0.6</priority><changefreq>weekly</changefreq></url>" >> "$SITEMAP"
done

echo "</urlset>" >> "$SITEMAP"
log "Sitemap generated"

# 5. Print stats
echo ""
echo "=== PROMO COMPLETE ==="
echo "Site: $SITE"
echo "Blog posts: $(ls /root/automaton/content/blog/*.html 2>/dev/null | wc -l)"
echo "Tools: $(ls /root/automaton/content/tools/*.html 2>/dev/null | wc -l)"
echo "Total static pages: $(find /root/automaton/content -name '*.html' 2>/dev/null | wc -l)"
echo "Sitemap URLs: $(grep -c '<loc>' /root/automaton/content/sitemap.xml 2>/dev/null || echo 0)"
echo ""
echo "Services available:"
echo "  POST /v1/analyze   - 1¢  - Text analysis"
echo "  POST /v1/summarize - 2¢  - Summarization"
echo "  POST /v1/review    - 5¢  - Code review"
echo "  POST /v1/security  - 3¢  - Security scan"
echo "  POST /v1/explain   - 2¢  - Code explanation"
echo "  POST /v1/refactor  - 5¢  - Refactoring"
echo "  POST /v1/complexity- 2¢  - Complexity analysis"
echo "  POST /v1/batch     - 5¢  - Batch processing"
echo "  POST /v1/render    - 3¢  - Markdown render"
echo ""
echo "Wallet: 0x76eADdEBFfb6A61DD071f97F4508467fc55dd113 (Base/USDC)"
echo "============================================"
