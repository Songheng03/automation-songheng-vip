#!/bin/bash
# rebuild-sitemap.sh — Generate a clean, deduplicated sitemap.xml
CONTENT_DIR="/root/automaton/content"
SITEMAP="$CONTENT_DIR/sitemap.xml"
DOMAIN="https://automation.songheng.vip"

# Collect all .html files and the root files
FILES=$(find "$CONTENT_DIR" -maxdepth 2 -name "*.html" | sort)

# Write header
cat > "$SITEMAP" << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
EOF

# Track seen URLs to avoid duplicates
declare -A SEEN

for f in $FILES; do
    # Get relative path from content dir
    rel="${f#$CONTENT_DIR/}"
    
    # Skip index.html -> root
    if [ "$rel" = "index.html" ]; then
        url="$DOMAIN/"
        priority="1.0"
        freq="daily"
    else
        url="$DOMAIN/$rel"
        # Determine priority and frequency based on path depth and name
        if [[ "$rel" == "api-docs.html" || "$rel" == "api-playground.html" || "$rel" == "dev-tools.html" || "$rel" == "dashboard.html" ]]; then
            priority="0.9"
            freq="weekly"
        elif [[ "$rel" == blog/* ]]; then
            priority="0.5"
            freq="monthly"
        elif [[ "$rel" == blog.html || "$rel" == "tools.html" ]]; then
            priority="0.8"
            freq="weekly"
        else
            priority="0.6"
            freq="monthly"
        fi
    fi
    
    # Skip duplicates
    if [ -n "${SEEN[$url]}" ]; then
        continue
    fi
    SEEN[$url]=1
    
    echo "  <url><loc>$url</loc><changefreq>$freq</changefreq><priority>$priority</priority></url>" >> "$SITEMAP"
done

# Add feed.xml
echo "  <url><loc>$DOMAIN/feed.xml</loc><changefreq>daily</changefreq><priority>0.7</priority></url>" >> "$SITEMAP"

# Close
echo "</urlset>" >> "$SITEMAP"

echo "Done. $(grep -c '<loc>' "$SITEMAP") unique URLs written."
