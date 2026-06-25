#!/bin/bash
# Automated submission script for POST-based directories
# Extracted from research.json

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
RESULTS_FILE="$SCRIPT_DIR/automated-responses.json"

# Initialize results array
RESULTS='{"results":[]}'

# Helper function to make curl call and capture result
make_request() {
    local dir_name="$1"
    local url="$2"
    local data="$3"
    local content_type="$4"
    local auth_header="$5"
    local extra_header="$6"

    local tmpfile=$(mktemp)
    local http_code_file=$(mktemp)

    # Build curl command
    local curl_cmd="curl -s -w '%{http_code}' -o '$tmpfile' -X POST"
    curl_cmd="$curl_cmd -H 'Content-Type: $content_type'"
    curl_cmd="$curl_cmd -H 'Accept: application/json'"
    if [ -n "$auth_header" ] && [ "$auth_header" != "null" ]; then
        curl_cmd="$curl_cmd -H '$auth_header'"
    fi
    if [ -n "$extra_header" ] && [ "$extra_header" != "null" ]; then
        curl_cmd="$curl_cmd -H '$extra_header'"
    fi
    curl_cmd="$curl_cmd -d '$data' '$url'"

    echo "  [REQUEST] $dir_name -> POST $url"
    echo "  [CURL] $curl_cmd"

    # Execute and capture status code
    set +e
    status_code=$(eval $curl_cmd 2>/dev/null)
    curl_exit=$?
    set -e

    if [ $curl_exit -ne 0 ]; then
        # curl itself failed
        http_code="000"
        body=""
        error_msg="curl failed with exit code $curl_exit"
        echo "  [ERROR] $error_msg"
    else
        http_code="$status_code"
        body=$(cat "$tmpfile" 2>/dev/null || echo "")
        error_msg="null"
        echo "  [RESPONSE] HTTP $http_code"
        # Print first 200 chars of body
        echo "  [BODY] $(echo "$body" | head -c 200)"
    fi

    rm -f "$tmpfile" "$http_code_file"

    # Build result JSON entry (escape the body for JSON)
    # Use python3 to safely escape and add to results
    local escaped_body=$(echo "$body" | python3 -c "import json,sys; print(json.dumps(sys.stdin.read()))" 2>/dev/null || echo '""')
    local escaped_error=$(echo "$error_msg" | python3 -c "import json,sys; print(json.dumps(sys.stdin.read()))" 2>/dev/null || echo 'null')

    RESULTS=$(echo "$RESULTS" | python3 -c "
import json, sys
results = json.load(sys.stdin)
entry = {
    'directory': '$dir_name',
    'statusCode': $http_code,
    'body': $escaped_body,
    'error': $escaped_error
}
results['results'].append(entry)
print(json.dumps(results, indent=2))
")
}

echo "========================================="
echo "Automated Submission Script"
echo "========================================="
echo ""

# ============================================================
# 1. Smithery - https://api.smithery.ai/v1/servers
# ============================================================
echo "--- 1. Smithery ---"
SMITHERY_PAYLOAD=$(cat <<'PYEOF' | python3
import json
payload = {
    "qualifiedName": "my-automaton",
    "displayName": "my-automaton",
    "description": "AI-powered automation platform for code review and security scanning",
    "deployUrl": "https://automation.songheng.vip"
}
print(json.dumps(payload))
PYEOF
)
make_request "Smithery" \
    "https://api.smithery.ai/v1/servers" \
    "$SMITHERY_PAYLOAD" \
    "application/json" \
    "Authorization: Bearer ${SMITHERY_API_KEY:-}" \
    "null"

echo ""

# ============================================================
# 2. Glama.ai - https://glama.ai/api/mcp/servers
# ============================================================
echo "--- 2. Glama.ai ---"
GLAMA_PAYLOAD=$(cat <<'PYEOF' | python3
import json
payload = {
    "repository": "https://automation.songheng.vip",
    "name": "my-automaton",
    "description": "AI-powered automation platform for code review and security scanning"
}
print(json.dumps(payload))
PYEOF
)
make_request "Glama.ai" \
    "https://glama.ai/api/mcp/servers" \
    "$GLAMA_PAYLOAD" \
    "application/json" \
    "null" \
    "null"

echo ""

# ============================================================
# 3. PulseMCP - https://api.pulsemcp.com/v1/tools
# ============================================================
echo "--- 3. PulseMCP ---"
PULSEMCP_PAYLOAD=$(cat <<'PYEOF' | python3
import json
payload = {
    "name": "my-automaton",
    "description": "AI-powered automation platform for code review and security scanning",
    "url": "https://automation.songheng.vip",
    "category": "MCP"
}
print(json.dumps(payload))
PYEOF
)
make_request "PulseMCP" \
    "https://api.pulsemcp.com/v1/tools" \
    "$PULSEMCP_PAYLOAD" \
    "application/json" \
    "Authorization: Bearer ${PULSEMCP_API_KEY:-}" \
    "null"

echo ""

# ============================================================
# 4. ProductHunt - https://api.producthunt.com/v2/api/graphql
# ============================================================
echo "--- 4. ProductHunt ---"
PRODUCTHUNT_PAYLOAD=$(cat <<'PYEOF' | python3
import json
mutation = """
mutation CreatePost($input: CreatePostInput!) {
  createPost(input: $input) {
    post {
      id
      name
      tagline
      url
    }
  }
}
"""
payload = {
    "query": mutation.strip(),
    "variables": {
        "input": {
            "name": "my-automaton",
            "tagline": "AI-powered automation platform for code review and security scanning",
            "description": "AI-powered automation platform for code review and security scanning. Tags: MCP, AI agent, code review, security scan",
            "url": "https://automation.songheng.vip"
        }
    }
}
print(json.dumps(payload))
PYEOF
)
make_request "ProductHunt" \
    "https://api.producthunt.com/v2/api/graphql" \
    "$PRODUCTHUNT_PAYLOAD" \
    "application/json" \
    "Authorization: Bearer ${PRODUCTHUNT_API_KEY:-}" \
    "null"

echo ""

# ============================================================
# 5. MCP Server Registry - https://registry.mcpservers.ai/api/servers
# ============================================================
echo "--- 5. MCP Server Registry ---"
REGISTRY_PAYLOAD=$(cat <<'PYEOF' | python3
import json
payload = {
    "name": "my-automaton",
    "version": "1.0.0",
    "description": "AI-powered automation platform for code review and security scanning",
    "command": {
        "type": "url",
        "url": "https://automation.songheng.vip"
    }
}
print(json.dumps(payload))
PYEOF
)
make_request "MCP Server Registry (github.com/mcp-registry)" \
    "https://registry.mcpservers.ai/api/servers" \
    "$REGISTRY_PAYLOAD" \
    "application/json" \
    "Authorization: Bearer ${MCP_REGISTRY_API_KEY:-}" \
    "null"

echo ""

# ============================================================
# Write final results
# ============================================================
echo "========================================="
echo "Writing results to $RESULTS_FILE"
echo "========================================="

# Validate JSON and write
echo "$RESULTS" | python3 -c "
import json, sys
data = json.load(sys.stdin)
print(json.dumps(data, indent=2))
" > "$RESULTS_FILE"

echo ""
echo "Done! Results written."
echo "Summary:"
echo "$RESULTS" | python3 -c "
import json, sys
data = json.load(sys.stdin)
for r in data['results']:
    status = r['statusCode']
    err = r['error']
    if err and err != 'null':
        print(f\"  {r['directory']}: FAILED (error: {err})\")
    else:
        print(f\"  {r['directory']}: HTTP {status}\")
"
