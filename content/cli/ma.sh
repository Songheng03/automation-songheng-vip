#!/bin/bash
# my-automaton CLI — AI code review, analysis, security scanning from your terminal
# Usage: ma <command> <text or file>
# Commands: analyze, summarize, review, security, explain, refactor, complexity

set -e

API_BASE="${MA_API_BASE:-https://automation.songheng.vip}"
API_KEY="${MA_KEY:-}"

show_help() {
  cat <<EOF
╔══════════════════════════════════════════════╗
║  ⚡ my-automaton CLI — AI in your terminal  ║
╚══════════════════════════════════════════════╝

Commands:
  analyze     <text|file>   Deep text analysis (1 credit)
  summarize   <text|file>   AI summarization (2 credits)
  review      <file>        Full code review (5 credits)
  security    <file>        Security scan (3 credits)
  explain     <code>        Explain code (2 credits)
  refactor    <file>        Refactoring suggestions (5 credits)
  complexity  <file>        Complexity analysis (2 credits)
  key                       Show/claim API key status

Examples:
  ma analyze "The quick brown fox jumps over the lazy dog"
  ma review ./src/main.js
  ma security ./app.py
  cat file.txt | ma summarize
  git diff HEAD~1 | ma review

Setup:
  1. Get a free API key: ${API_BASE}/free-api-key.html
  2. export MA_KEY=am_yourkey
  3. ma analyze "hello world"

Pricing:
  Free tier: 3 requests/day (no key needed)
  Free key: 50 credits (no credit card)
  Paid plans: ${API_BASE}/get-started.html
EOF
}

claim_key() {
  echo "Claiming free API key..."
  RESP=$(curl -sS -X POST "${API_BASE}/api/claim-free-key" -H "Content-Type: application/json" 2>&1)
  if echo "$RESP" | grep -q '"success":true'; then
    KEY=$(echo "$RESP" | grep -o '"apiKey":"[^"]*"' | cut -d'"' -f4)
    CREDITS=$(echo "$RESP" | grep -o '"credits":[0-9]*' | cut -d':' -f2)
    echo ""
    echo "✅ Free key claimed! ${CREDITS} credits ready."
    echo ""
    echo "  export MA_KEY=${KEY}"
    echo ""
    echo "Run this to set it now:"
    echo "  export MA_KEY=${KEY}"
    return 0
  else
    echo "❌ Could not claim key. Visit: ${API_BASE}/free-api-key.html"
    return 1
  fi
}

COMMAND="$1"
shift 2>/dev/null || true
INPUT=""

# Read from stdin if piped
if [ ! -t 0 ]; then
  INPUT=$(cat)
# Read from file
elif [ -f "$1" ]; then
  INPUT=$(cat "$1")
# Read from arguments
else
  INPUT="$*"
fi

if [ -z "$COMMAND" ]; then
  show_help
  exit 0
fi

case "$COMMAND" in
  -h|--help|help)
    show_help
    exit 0
    ;;
  key)
    if [ -n "$API_KEY" ]; then
      echo "🔑 API Key: ${API_KEY:0:12}..."
      echo "🌐 Dashboard: ${API_BASE}/dashboard.html"
    else
      echo "No API key set."
      echo ""
      claim_key
    fi
    exit 0
    ;;
  analyze|summarize|review|security|explain|refactor|complexity)
    ;;
  *)
    echo "❌ Unknown command: $COMMAND"
    show_help
    exit 1
    ;;
esac

if [ -z "$INPUT" ]; then
  echo "❌ No input provided. Usage: ma $COMMAND <text or file>"
  exit 1
fi

# First try with free tier (no key needed)
echo "🔍 Running ${COMMAND}..."
RESP=$(curl -sS -X POST "${API_BASE}/free/${COMMAND}" \
  -H "Content-Type: application/json" \
  -d "{\"text\": $(echo "$INPUT" | jq -Rs .)}" 2>&1)

if echo "$RESP" | grep -q '"error".*"limit"'; then
  # Free tier exhausted, try API key
  if [ -z "$API_KEY" ]; then
    echo "⚠️  Free tier limit reached."
    echo "   Get a free key: ${API_BASE}/free-api-key.html"
    echo "   Or set your key: export MA_KEY=am_xxxxx"
    exit 1
  fi
  
  echo "🔄 Using API key..."
  RESP=$(curl -sS -X POST "${API_BASE}/v1/${COMMAND}" \
    -H "Content-Type: application/json" \
    -H "X-API-Key: ${API_KEY}" \
    -d "{\"text\": $(echo "$INPUT" | jq -Rs .)}" 2>&1)
fi

# Parse and display result
RESULT=$(echo "$RESP" | jq -r '.result // .error // empty' 2>/dev/null)
if [ -n "$RESULT" ] && [ "$RESULT" != "null" ]; then
  echo ""
  echo "$RESULT"
  echo ""
  CREDITS=$(echo "$RESP" | jq -r '.credits_remaining // .free_remaining // empty' 2>/dev/null)
  if [ -n "$CREDITS" ] && [ "$CREDITS" != "null" ]; then
    echo "💳 ${CREDITS} credits remaining"
  fi
else
  echo "❌ Error:"
  echo "$RESP" | jq . 2>/dev/null || echo "$RESP"
  exit 1
fi
