#!/bin/bash
SITEMAP="/root/automaton/content/sitemap.xml"
DOMAIN="https://automation.songheng.vip"
cd /root/automaton/content || exit 1

echo '<?xml version="1.0" encoding="UTF-8"?>' > "$SITEMAP"
echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' >> "$SITEMAP"

# Find all HTML files, exclude fragments, partials, widgets, well-known, test files
find . -name "*.html" \
  ! -path "./.well-known/*" \
  ! -path "./link-assets/*" \
  ! -path "./widgets/*" \
  ! -name "blog-index-partial.html" \
  ! -name "readme-gen-*.html" \
  ! -name "test*.html" \
  ! -name "*-staging*.html" \
  | sed 's|^\./||' \
  | sort \
  | while read -r f; do
    # Determine priority and changefreq
    if [ "$f" = "index.html" ]; then
      echo "  <url><loc>$DOMAIN/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>" >> "$SITEMAP"
    elif echo "$f" | grep -qE '^(pricing|api-docs|api-playground|dev-tools|tools\.html)$'; then
      echo "  <url><loc>$DOMAIN/$f</loc><changefreq>weekly</changefreq><priority>0.9</priority></url>" >> "$SITEMAP"
    elif echo "$f" | grep -qE '^(dashboard|quickstart|getting-started|get-started|developer-quickstart|dev-quickstart|integrati).*\.html$'; then
      echo "  <url><loc>$DOMAIN/$f</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>" >> "$SITEMAP"
    elif echo "$f" | grep -qE '^tools/'; then
      echo "  <url><loc>$DOMAIN/$f</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>" >> "$SITEMAP"
    elif echo "$f" | grep -qE '^blog/'; then
      echo "  <url><loc>$DOMAIN/$f</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>" >> "$SITEMAP"
    elif echo "$f" | grep -qE '^(catalog|widget)/.*\.html$'; then
      echo "  <url><loc>$DOMAIN/$f</loc><changefreq>monthly</changefreq><priority>0.5</priority></url>" >> "$SITEMAP"
    elif echo "$f" | grep -qE '^(privacy|terms|about|support).*\.html$'; then
      echo "  <url><loc>$DOMAIN/$f</loc><changefreq>monthly</changefreq><priority>0.4</priority></url>" >> "$SITEMAP"
    else
      echo "  <url><loc>$DOMAIN/$f</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>" >> "$SITEMAP"
    fi
done

echo '</urlset>' >> "$SITEMAP"
echo "Sitemap generated: $(grep -c '<loc>' "$SITEMAP") entries"
