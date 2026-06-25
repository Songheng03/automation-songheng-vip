#!/bin/bash
# Regenerate sitemap.xml with all HTML files in content/
# Usage: bash /root/automaton/scripts/build-sitemap.sh

CONTENT_DIR="/root/automaton/content"
SITEMAP="$CONTENT_DIR/sitemap.xml"
BASE_URL="https://automation.songheng.vip"
SCRIPT_DIR="/root/automaton/scripts"

# Create a clean sitemap
cat > "$SITEMAP" << 'XMLHEADER'
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
XMLHEADER

# Priority mapping based on filename
priority_home() {
  local file="$1"
  local base=$(basename "$file" .html)
  case "$base" in
    "index"|"") echo "1.0" ;;
    "dashboard"|"api-docs"|"pricing"|"quickstart"|"getting-started"|"developers"|"dev-tools"|"tools"|"api-playground"|"blog")
      echo "0.9" ;;
    "checkout"|"payment"|"payment-success"|"signup"|"login"|"integration"|"api-reference"|"dev-quickstart"|"developer-quickstart")
      echo "0.8" ;;
    "privacy"|"terms"|"about"|"support"|"contact"|"acceptable-use"|"security"|"status"|"service-status"|"health")
      echo "0.6" ;;
    *)
      echo "0.5" ;;
  esac
}

changefreq_for() {
  local file="$1"
  local base=$(basename "$file" .html)
  case "$base" in
    "index"|"dashboard"|"status"|"health"|"live-status"|"service-status")
      echo "daily" ;;
    "blog"|"api-docs"|"pricing"|"dev-tools"|"tools"|"developers"|"quickstart"|"getting-started")
      echo "weekly" ;;
    *)
      echo "monthly" ;;
  esac
}

# Remove old sitemap entries and rebuild
find "$CONTENT_DIR" -name "*.html" | sort | while read -r htmlfile; do
  # Skip google verification files
  base=$(basename "$htmlfile")
  [[ "$base" == google*.html ]] && continue
  
  # Get relative path from content dir
  relpath="${htmlfile#$CONTENT_DIR/}"
  
  # Determine priority and changefreq
  priority=$(priority_home "$htmlfile")
  changefreq=$(changefreq_for "$htmlfile")
  
  echo "  <url><loc>${BASE_URL}/${relpath}</loc><changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>" >> "$SITEMAP"
done

# Close XML
echo "</urlset>" >> "$SITEMAP"

# Count entries
echo "Sitemap generated with $(grep -c '<loc>' "$SITEMAP") entries at $SITEMAP"
