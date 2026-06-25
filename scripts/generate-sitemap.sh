#!/bin/bash
# Generate proper sitemap.xml with all 361 HTML files
# Points to the WORKING domain (automation.songheng.vip), not the broken one

DOMAIN="https://automation.songheng.vip"
CONTENT_DIR="/root/automaton/content"
SITEMAP="$CONTENT_DIR/sitemap.xml"
TODAY=$(date +%Y-%m-%d)

# Start sitemap
cat > "$SITEMAP" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
EOF

# Priority mapping based on filename
get_priority() {
  local name="$1"
  case "$name" in
    "index.html") echo "1.0" ;;
    "pricing.html"|"api-docs.html"|"dashboard.html"|"developer-hub.html"|"getting-started.html"|"quickstart.html") echo "0.9" ;;
    "tools.html"|"playground.html"|"api-playground.html"|"dev-tools.html"|"seo-tools.html") echo "0.8" ;;
    blog/*) echo "0.7" ;;
    "blog.html") echo "0.8" ;;
    "about.html"|"support.html"|"terms.html"|"privacy.html"|"contact.html") echo "0.5" ;;
    "test.html") echo "0.1" ;;  # test page should be low priority
    *) echo "0.6" ;;
  esac
}

get_changefreq() {
  local name="$1"
  case "$name" in
    "index.html"|"pricing.html"|"dashboard.html") echo "daily" ;;
    blog/*|"blog.html") echo "weekly" ;;
    "api-docs.html"|"getting-started.html"|"quickstart.html") echo "weekly" ;;
    "about.html"|"terms.html"|"privacy.html"|"support.html") echo "monthly" ;;
    "test.html") echo "never" ;;
    *) echo "weekly" ;;
  esac
}

# Add all HTML files
find "$CONTENT_DIR" -name "*.html" -type f | sort | while read -r file; do
  # Skip the sitemap itself
  [[ "$file" == "$SITEMAP" ]] && continue
  
  # Get relative path from content directory
  relpath="${file#$CONTENT_DIR/}"
  
  # Skip google verification files (they're for SEO but shouldn't be in sitemap)
  [[ "$relpath" == google* ]] && continue
  [[ "$relpath" == *"google"* ]] && [[ "$relpath" != blog/* ]] && continue
  
  # Get name without extension
  name=$(basename "$file")
  
  priority=$(get_priority "$name")
  changefreq=$(get_changefreq "$name")
  
  cat >> "$SITEMAP" << EOF
  <url>
    <loc>${DOMAIN}/${relpath}</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>
EOF
done

# Close sitemap
cat >> "$SITEMAP" << EOF
</urlset>
EOF

echo "Sitemap generated: $(wc -c < "$SITEMAP") bytes, $(grep -c '<loc>' "$SITEMAP") URLs"
echo "Domain: $DOMAIN"

# Also update robots.txt
cat > "$CONTENT_DIR/robots.txt" << EOF
User-agent: *
Allow: /
Sitemap: ${DOMAIN}/sitemap.xml
EOF
echo "robots.txt updated"
