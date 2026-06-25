#!/bin/bash
# update-blog.sh — Add new blog article to blog list and blog.json
# Usage: ./update-blog.sh "slug" "title" "description" "date"

SLUG="$1"
TITLE="$2"
DESC="$3"
DATE="${4:-$(date +%Y-%m-%d)}"

BLOG_DIR="/root/automaton/content/blog"
BLOG_HTML="/root/automaton/content/blog.html"
BLOG_JSON="/root/automaton/content/blog.json"

if [ -z "$SLUG" ] || [ -z "$TITLE" ]; then
  echo "Usage: $0 <slug> <title> [description] [date]"
  exit 1
fi

# 1. Create blog.json if it doesn't exist
if [ ! -f "$BLOG_JSON" ]; then
  echo "[]" > "$BLOG_JSON"
fi

# 2. Add to blog.json (prepend)
node -e "
const fs = require('fs');
const path = '$BLOG_JSON';
let articles = [];
try { articles = JSON.parse(fs.readFileSync(path, 'utf-8')); } catch(e) {}
const slug = '$SLUG';
// Check if exists
if (!articles.find(a => a.slug === slug)) {
  articles.unshift({
    slug: slug,
    title: '$TITLE',
    description: '${DESC:-$TITLE}',
    date: '$DATE',
    url: '/blog/$SLUG.html',
    category: 'engineering'
  });
  fs.writeFileSync(path, JSON.stringify(articles, null, 2));
  console.log('✅ Added to blog.json: ' + slug);
} else {
  console.log('Already exists in blog.json: ' + slug);
}
"

echo "Done."
