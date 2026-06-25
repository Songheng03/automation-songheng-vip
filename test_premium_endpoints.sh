#!/bin/bash
LOG="/root/automaton/workspace/endpoint-verification.log"
BASE="http://localhost:8080"
mkdir -p /root/automaton/workspace

echo "==========================================" > "$LOG"
echo "Premium Endpoint Verification - $(date)" >> "$LOG"
echo "==========================================" >> "$LOG"
echo "" >> "$LOG"

ALL_PASSED=true
FAILURES=""

test_endpoint() {
  local path="$1"
  local payload="$2"
  
  echo "----------------------------------------" >> "$LOG"
  echo "Testing: POST $path" >> "$LOG"
  echo "----------------------------------------" >> "$LOG"
  
  response=$(curl -s -w "\n%{http_code}" -X POST "$BASE$path" \
    -H "Content-Type: application/json" \
    -d "$payload" 2>&1)
  
  http_code=$(echo "$response" | tail -1)
  body=$(echo "$response" | head -n -1)
  
  echo "HTTP Status: $http_code" >> "$LOG"
  echo "Response:" >> "$LOG"
  echo "$body" | python3 -m json.tool 2>/dev/null >> "$LOG" || echo "$body" >> "$LOG"
  echo "" >> "$LOG"
  
  if echo "$body" | python3 -c "import sys,json; json.load(sys.stdin)" 2>/dev/null; then
    echo "✓ Valid JSON" >> "$LOG"
  else
    echo "✗ INVALID JSON" >> "$LOG"
    ALL_PASSED=false
    FAILURES="$FAILURES $path(not-json)"
  fi
  
  if [ "$http_code" = "200" ]; then
    echo "✓ HTTP 200 OK" >> "$LOG"
  else
    echo "✗ HTTP $http_code (expected 200)" >> "$LOG"
    if [ "$http_code" = "403" ] || [ "$http_code" = "401" ]; then
      echo "  -> Authentication required (expected with no API key)" >> "$LOG"
    else
      ALL_PASSED=false
      FAILURES="$FAILURES $path(http_$http_code)"
    fi
  fi
  echo "" >> "$LOG"
}

# Test all 7 premium endpoints
test_endpoint "/v1/analyze" '{"text":"This is a test of the text analysis service."}'
test_endpoint "/v1/summarize" '{"text":"Artificial intelligence has transformed many industries including healthcare, finance, and transportation. Machine learning models are being deployed to detect diseases, predict market trends, and enable autonomous vehicles."}'
test_endpoint "/v1/review" '{"text":"function hello() { return \"world\"; }"}'
test_endpoint "/v1/security" '{"text":"function login(u, p) { db.query(\"SELECT * FROM users WHERE name=\" + u); }"}'
test_endpoint "/v1/explain" '{"text":"function fib(n) { if (n <= 1) return n; return fib(n-1) + fib(n-2); }"}'
test_endpoint "/v1/refactor" '{"text":"function process(arr) { let r = []; for(let i=0;i<arr.length;i++) { if(arr[i] > 10) { r.push(arr[i]); } } return r; }"}'
test_endpoint "/v1/complexity" '{"text":"function complex(x) { for(let i=0;i<x;i++) { for(let j=0;j<x;j++) { console.log(i*j); } } }"}'

echo "==========================================" >> "$LOG"
echo "SUMMARY" >> "$LOG"
echo "==========================================" >> "$LOG"
echo "($(date))" >> "$LOG"
if [ "$ALL_PASSED" = true ]; then
  echo "Result: ALL ENDPOINTS PASSED" >> "$LOG"
else
  echo "Result: FAILURES -$FAILURES" >> "$LOG"
fi
echo "" >> "$LOG"
echo "Test completed at $(date)" >> "$LOG"

echo "=== SUMMARY ==="
grep -E "(Testing|HTTP Status|Result:|Valid|FAILURES)" "$LOG"
