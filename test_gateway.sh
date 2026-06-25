#!/bin/bash

BASE_URL="http://automation.automation.songheng.vip:8080"
RESULTS_FILE="/root/automaton/gateway_test_results.json"

# Endpoints to test
ENDPOINTS=(
  "code-review"
  "security-scan"
  "text-analysis"
  "sentiment-analysis"
  "summarize"
  "translate"
  "qa"
  "chat"
  "image-analysis"
)

echo "[" > "$RESULTS_FILE"
first=true

for ep in "${ENDPOINTS[@]}"; do
  url="${BASE_URL}/${ep}"

  # Capture status code and response body
  response=$(curl -s -w "\n%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -d '{"text":"Hello world, this is a test input for the AI endpoint."}' \
    "$url" 2>/dev/null)

  http_code=$(echo "$response" | tail -1)
  body=$(echo "$response" | sed '$d')

  # Determine success: 2xx status
  if [[ "$http_code" =~ ^2[0-9][0-9]$ ]]; then
    error=""
    success=true
  else
    error="HTTP $http_code - non-2xx response"
    success=false
  fi

  # Also check if body is empty (for 2xx responses, body should not be empty)
  if [ "$success" = true ] && [ -z "$body" ]; then
    error="Empty body"
    success=false
  fi

  # Build JSON entry
  entry="{\"endpoint\":\"/${ep}\",\"status_code\":${http_code},\"success\":${success}"
  if [ -n "$error" ]; then
    entry="${entry},\"error\":\"${error}\""
  fi
  entry="${entry}}"

  if [ "$first" = true ]; then
    echo "$entry" >> "$RESULTS_FILE"
    first=false
  else
    echo ",$entry" >> "$RESULTS_FILE"
  fi
done

echo "]" >> "$RESULTS_FILE"

# Pretty-print
python3 -c "
import json
with open('$RESULTS_FILE') as f:
    data = json.load(f)
print(json.dumps(data, indent=2))
"

# Count successes
python3 -c "
import json
with open('$RESULTS_FILE') as f:
    data = json.load(f)
successes = [d for d in data if d.get('success')]
total = len(data)
print(f'\n=== Summary ===')
print(f'Successful: {len(successes)} / {total}')
for d in data:
    status = 'PASS' if d.get('success') else 'FAIL'
    print(f'  [{status}] {d[\"endpoint\"]} -> {d[\"status_code\"]}' + (f' ({d.get(\"error\", \"\")})' if not d.get('success') else ''))
"
