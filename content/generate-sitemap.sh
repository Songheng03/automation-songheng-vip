#!/bin/bash
DOMAIN="https://automation.songheng.vip"
DATE=$(date +%Y-%m-%d)

cat > sitemap.xml << HEADER
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
HEADER

# Add main pages
for page in "" "blog.html" "api-docs.html" "pricing.html" "dashboard.html" "playground.html" "dev-tools.html" "cli.html" "github-action.html" "ai-code-review-comparison.html" "github-badge-generator.html" "agent-commerce.html"; do
  if [ -z "$page" ]; then
    url="$DOMAIN/"
    file="index.html"
  else
    url="$DOMAIN/$page"
    file="$page"
  fi
  if [ -f "$file" ]; then
    cat >> sitemap.xml << ENTRY
  <url>
    <loc>$url</loc>
    <lastmod>$DATE</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
ENTRY
  fi
done

# Add blog articles
for article in blog/*.html; do
  if [ -f "$article" ] && [ "$article" != "blog/index.html" ]; then
    url="$DOMAIN/$article"
    cat >> sitemap.xml << ENTRY
  <url>
    <loc>$url</loc>
    <lastmod>$DATE</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
ENTRY
  fi
done

# Add tool pages (excluding junk)
for tool in *.html; do
  if [ -f "$tool" ] && [[ ! "$tool" =~ ^(index|blog|api-docs|pricing|dashboard|playground|dev-tools|cli|github-action|ai-code-review-comparison|github-badge-generator|agent-commerce|test|sample|ALERT|portal|host-tunnel|google-site-verification)\.html$ ]]; then
    url="$DOMAIN/$tool"
    cat >> sitemap.xml << ENTRY
  <url>
    <loc>$url</loc>
    <lastmod>$DATE</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
ENTRY
  fi
done

cat >> sitemap.xml << FOOTER
</urlset>
FOOTER

echo "Sitemap generated with $(grep -c '<loc>' sitemap.xml) URLs"
