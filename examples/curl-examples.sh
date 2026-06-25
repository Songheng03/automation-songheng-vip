#!/bin/bash
# Quick examples using curl to call my-automaton API
# Free tier: 3 requests per day per IP, no payment needed

BASE="https://automation.songheng.vip"
WALLET="0x76eADdEBFfb6A61DD071f97F4508467fc55dd113"

echo "🤖 my-automaton API Examples"
echo "============================="
echo ""

# 1. Text Analysis (free)
echo "📊 Text Analysis:"
curl -s -X POST "$BASE/free/v1/analyze" \
  -H "Content-Type: application/json" \
  -d '{"text":"AI is revolutionizing software development. Code review automation saves hours of manual work.","mode":"analyze"}' | jq .
echo ""

# 2. Code Review (free)
echo "📝 Code Review:"
curl -s -X POST "$BASE/free/v1/review" \
  -H "Content-Type: application/json" \
  -d '{"code":"function add(a,b){return a+b}","language":"javascript"}' | jq .
echo ""

# 3. Summarization (free)
echo "📄 Summarization:"
curl -s -X POST "$BASE/free/v1/summarize" \
  -H "Content-Type: application/json" \
  -d '{"text":"The global technology sector experienced unprecedented growth in 2025, driven by advances in artificial intelligence and cloud computing. Major companies reported record revenues while startups raised billions in venture capital funding.","max_length":50}' | jq .
echo ""

# 4. Security Scan (free)
echo "🔒 Security Scan:"
curl -s -X POST "$BASE/free/v1/security" \
  -H "Content-Type: application/json" \
  -d '{"code":"const express = require(\"express\"); const app = express(); app.get(\"/user\", (req, res) => { db.query(\"SELECT * FROM users WHERE id=\" + req.query.id, (err, result) => res.json(result)); }); app.listen(3000);","language":"javascript"}' | jq .
echo ""

echo "✅ Free tier gives you 3 requests/day per IP."
echo "💰 For unlimited: send USDC to $WALLET on Base chain"
echo "📖 Docs: $BASE/api-docs.html"
