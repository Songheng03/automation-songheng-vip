#!/bin/bash
# Build RSS feed from blog posts - run daily via cron
cd /root/automaton/content

cat > rss.xml << 'RSSHEADER'
<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"
     xmlns:content="http://purl.org/rss/1.0/modules/content/"
     xmlns:dc="http://purl.org/dc/elements/1.1/">
<channel>
  <title>my-automaton Blog - AI Code Review & Developer Tools</title>
  <link>https://automation.songheng.vip</link>
  <description>AI-powered code review, security scanning, and text analysis. Pay-per-use API with no subscription required.</description>
  <language>en-us</language>
  <lastBuildDate>'''$(date -R)'''</lastBuildDate>
  <atom:link href="https://automation.songheng.vip/rss.xml" rel="self" type="application/rss+xml"/>
  <image>
    <url>https://automation.songheng.vip/icon.png</url>
    <title>my-automaton Blog</title>
    <link>https://automation.songheng.vip</link>
  </image>
RSSHEADER

# Process each blog post
for f in $(ls -t blog/*.html); do
  slug=$(basename "$f" .html)
  title=$(head -30 "$f" | grep -oP '<title>.*?</title>' | sed 's/<[^>]*>//g')
  desc=$(head -30 "$f" | grep -oP '<meta name="description" content="[^"]*"' | sed 's/<meta name="description" content="//;s/"$//')
  url="https://automation.songheng.vip/blog/$slug"
  
  # Try to extract date from filename or meta
  date_match=$(echo "$slug" | grep -oP '^\d{4}-\d{2}-\d{2}')
  if [ -z "$date_match" ]; then
    date_match=$(head -30 "$f" | grep -oP '\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}' | head -1)
    if [ -z "$date_match" ]; then
      date_match=$(stat -c '%Y' "$f" | xargs -I{} date -d @{} -R 2>/dev/null || echo "2026-06-01")
    fi
  fi
  
  if [[ "$date_match" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; then
    pubDate=$(date -d "$date_match" -R 2>/dev/null || echo "2026-06-14")
  else
    pubDate="$date_match"
  fi
  
  [ -z "$title" ] && title=$(echo "$slug" | sed 's/-/ /g; s/\b\(.\)/\u\1/g')
  [ -z "$desc" ] && desc="AI developer tools blog post - my-automaton"
  
  cat >> rss.xml << ITEM
  <item>
    <title><![CDATA[$title]]></title>
    <link>$url</link>
    <guid isPermaLink="true">$url</guid>
    <description><![CDATA[$desc]]></description>
    <pubDate>$pubDate</pubDate>
    <dc:creator><![CDATA[my-automaton]]></dc:creator>
    <category>AI Developer Tools</category>
  </item>
ITEM
done

echo '</channel></rss>' >> rss.xml

echo "RSS feed generated with $(grep -c '<item>' rss.xml) items"
