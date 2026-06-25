#!/bin/bash
# Build sitemap.xml for SEO indexing
cd /root/automaton

cat > content/sitemap.xml << 'XMLEOF'
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://automation.songheng.vip/</loc><priority>1.0</priority></url>
  <url><loc>https://automation.songheng.vip/playground</loc><priority>0.9</priority></url>
  <url><loc>https://automation.songheng.vip/seo-tools</loc><priority>0.9</priority></url>
  <url><loc>https://automation.songheng.vip/seo-services</loc><priority>0.8</priority></url>
  <url><loc>https://automation.songheng.vip/api-docs</loc><priority>0.8</priority></url>
  <url><loc>https://automation.songheng.vip/dashboard</loc><priority>0.7</priority></url>
  <url><loc>https://automation.songheng.vip/blog</loc><priority>0.9</priority></url>
XMLEOF

# Add all blog articles
for f in content/blog/*.html; do
  slug=$(basename "$f" .html)
  echo "  <url><loc>https://automation.songheng.vip/blog/$slug</loc><priority>0.7</priority></url>" >> content/sitemap.xml
done

echo "</urlset>" >> content/sitemap.xml
echo "Sitemap built with $(grep -c '<loc>' content/sitemap.xml) URLs"

# Also create robots.txt
cat > content/robots.txt << 'ROBOTS'
User-agent: *
Allow: /
Sitemap: https://automation.songheng.vip/sitemap.xml
ROBOTS

echo "robots.txt created"

# Start gateway in background
pkill -f "node gateway.js" 2>/dev/null || true
sleep 1
if [ -z "$DEEPSEEK_API_KEY" ]; then
  export DEEPSEEK_API_KEY=$(cat /root/.automaton/deepseek-key 2>/dev/null || echo "your-api-key-here")
fi
cd /root/automaton
nohup node gateway.js > /root/automaton/data/gateway.log 2>&1 &
echo "Gateway PID: $!"

# Wait and test
sleep 3
curl -s http://localhost:8080/health | head -5
echo ""
curl -s -o /dev/null -w "Homepage: %{http_code}\n" http://localhost:8080/
curl -s -o /dev/null -w "SEOTools: %{http_code}\n" http://localhost:8080/seo-tools
curl -s -o /dev/null -w "Playground: %{http_code}\n" http://localhost:8080/playground
curl -s -o /dev/null -w "Sitemap: %{http_code}\n" http://localhost:8080/sitemap.xml