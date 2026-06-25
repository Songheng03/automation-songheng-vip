#!/bin/bash
# Build a comprehensive sitemap.xml for automation.songheng.vip
# Covers ALL HTML pages + blog articles

DOMAIN="https://automation.songheng.vip"
CONTENT="/root/automaton/content"
SITEMAP="$CONTENT/sitemap.xml"

# Start sitemap
cat > "$SITEMAP" << 'HEADER'
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
HEADER

# Homepage - priority 1.0
echo "  <url><loc>${DOMAIN}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>" >> "$SITEMAP"

# Key pages - priority 0.9
for page in api-docs api-playground pricing blog about; do
  if [ -f "$CONTENT/$page.html" ]; then
    echo "  <url><loc>${DOMAIN}/${page}.html</loc><changefreq>weekly</changefreq><priority>0.9</priority></url>" >> "$SITEMAP"
  fi
done

# SEO-important tool pages - priority 0.8
for page in free-ai-code-review-tool free-ai-text-summarizer free-ai-security-scanner \
  free-api-playground free-tools code-review-tool security-scanner \
  ai-code-reviewer mcp-integration-guide github-action install-mcp \
  developer-quickstart dev-quickstart getting-started get-started dashboard \
  agent-commerce comparison checkout free-api-key; do
  if [ -f "$CONTENT/$page.html" ]; then
    echo "  <url><loc>${DOMAIN}/${page}.html</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>" >> "$SITEMAP"
  fi
done

# All other HTML pages - priority 0.6
for f in "$CONTENT"/*.html; do
  base=$(basename "$f" .html)
  # Skip pages already added above
  case "$base" in
    index|api-docs|api-playground|pricing|blog|about|free-ai-code-review-tool|free-ai-text-summarizer|free-ai-security-scanner|free-api-playground|free-tools|code-review-tool|security-scanner|ai-code-reviewer|mcp-integration-guide|github-action|install-mcp|developer-quickstart|dev-quickstart|getting-started|get-started|dashboard|agent-commerce|comparison|checkout|free-api-key|sitemap|robots)
      continue ;;
    google*|google12*|google14*|google27*|google34*|google3a*|google4c*|googlea1*|googlea8*|googlec9*|googled8*|googlede4*|googlee5*|googlee96*|googlegoogle*)
      continue ;; # skip verification files
    ALERT*)
      continue ;; # skip alert pages
    blog-index*)
      continue ;;
  esac
  if [ -f "$CONTENT/$base.html" ]; then
    echo "  <url><loc>${DOMAIN}/${base}.html</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>" >> "$SITEMAP"
  fi
done

# Blog articles - priority 0.7
for f in "$CONTENT"/blog/*.html; do
  base=$(basename "$f" .html)
  echo "  <url><loc>${DOMAIN}/blog/${base}.html</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>" >> "$SITEMAP"
done

# Close sitemap
echo "</urlset>" >> "$SITEMAP"

echo "Sitemap built: $(wc -l < "$SITEMAP") lines, $(grep -c '<loc>' "$SITEMAP") URLs"
