#!/bin/bash
# promote.sh — SEO & promotion script for my-automaton
# Run: bash scripts/promote.sh [all|seo|social|check]
set -e

BASE="https://automation.songheng.vip"
CONTENT="/root/automaton/content"
SITEMAP="$CONTENT/sitemap.xml"
BLOG_DIR="$CONTENT/blog"
TOOLS_DIR="$CONTENT/tools"
NOW_KEY="16bdf78d71af45b3bed604cc6ad7dd34"

# --- Action: SEO ---
seo() {
  echo "=== SEO Refresh ==="
  
  # Rebuild sitemap
  echo "<?xml version=\"1.0\" encoding=\"UTF-8\"?>
<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">" > "$SITEMAP"
  
  for url in $(cat <<EOF | sort -u
$BASE/
$BASE/api-docs
$BASE/dashboard
$BASE/playground
$BASE/share
$BASE/badge
$BASE/blog
$BASE/tools
$BASE/api/catalog
$BASE/api/health
EOF
); do
    echo "  <url><loc>$url</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>" >> "$SITEMAP"
  done
  
  # Add blog articles
  if [ -d "$BLOG_DIR" ]; then
    for f in "$BLOG_DIR"/*.html; do
      name=$(basename "$f" .html)
      [ "$name" = "feed" ] && continue
      echo "  <url><loc>$BASE/blog/$name</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>" >> "$SITEMAP"
    done
  fi

  # Add tools
  if [ -d "$TOOLS_DIR" ]; then
    for f in "$TOOLS_DIR"/*.html; do
      name=$(basename "$f" .html)
      echo "  <url><loc>$BASE/tools/$name</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>" >> "$SITEMAP"
    done
  fi
  
  echo "</urlset>" >> "$SITEMAP"
  
  total=$(grep -c '<loc>' "$SITEMAP")
  echo "✅ Sitemap: $total URLs"

  # Ping IndexNow
  first_url=$(grep '<loc>' "$SITEMAP" | head -1 | sed 's/.*<loc>//;s/<\/loc>.*//')
  status=$(curl -s -o /dev/null -w "%{http_code}" "https://www.bing.com/IndexNow?url=$first_url&key=$NOW_KEY" 2>/dev/null || echo "fail")
  echo "✅ IndexNow: $status"
  
  echo "SEO done — $total URLs in sitemap"
}

# --- Action: Social post generation ---
social() {
  echo "=== Social Posts ==="
  DATE=$(date +%Y-%m-%d)
  mkdir -p "$CONTENT/promote"
  cat > "$CONTENT/promote/social-post-$DATE.md" << 'EOP'
## Social Post — my-automaton

### Twitter/X
🤖 Need AI code review? Try my-automaton — it's a sovereign AI agent offering:
• Code review (5¢)
• Security scanning (3¢)
• Text analysis (1¢)
• Summarization (2¢)

Pay with #USDC on #Base. 3 free requests/day.
https://automation.songheng.vip

### LinkedIn
Excited to share my-automaton — an autonomous AI agent offering developer APIs with USDC micropayments on Base chain. Features include AI code review, security vulnerability scanning, text analysis, and more. Pay per request with no subscription required. Free tier available.

https://automation.songheng.vip

### Dev.to
I built a sovereign AI agent with USDC micropayments. Here's how it works:
- AI code review ($0.05/request)
- Security scanning ($0.03/request)  
- Text analysis & summarization ($0.01-0.02/request)
- Free tier: 3 requests/day per IP
- Pay with USDC on Base chain

https://automation.songheng.vip
EOP
  echo "✅ Social post template: promote/social-post-$DATE.md"
}

# --- Action: Check stats ---
check() {
  echo "=== Status Check ==="
  echo "URL: $BASE"
  echo "Wallet: 0x76eADdEBFfb6A61DD071f97F4508467fc55dd113"
  echo ""
  
  # Check if site is up
  code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/health" 2>/dev/null || echo "fail")
  echo "Health: $code"
  
  # Check sitemap
  if [ -f "$SITEMAP" ]; then
    count=$(grep -c '<loc>' "$SITEMAP")
    echo "Sitemap: $count URLs"
  fi
  
  # Check blog articles
  if [ -d "$BLOG_DIR" ]; then
    count=$(ls "$BLOG_DIR"/*.html 2>/dev/null | wc -l)
    echo "Blog articles: $count"
  fi
  
  # Check tools
  if [ -d "$TOOLS_DIR" ]; then
    count=$(ls "$TOOLS_DIR"/*.html 2>/dev/null | wc -l)
    echo "Tools: $count"
  fi
  
  echo ""
  echo "Done."
}

# --- Action: Cron setup ---
setup_cron() {
  echo "=== Cron Setup ==="
  SCRIPT_DIR="$(dirname "$0")/.."
  crontab -l 2>/dev/null | grep -q "promote.sh" && echo "Cron already set" || {
    (crontab -l 2>/dev/null; echo "0 */6 * * * cd $SCRIPT_DIR && bash scripts/promote.sh seo > /dev/null 2>&1") | crontab -
    echo "✅ Cron added: promote.sh seo every 6 hours"
  }
}

# --- Main ---
case "${1:-all}" in
  all) seo; social; check;;
  seo) seo;;
  social) social;;
  check) check;;
  cron) setup_cron;;
  *) echo "Usage: $0 [all|seo|social|check|cron]"; exit 1;;
esac
