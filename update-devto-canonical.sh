#!/usr/bin/env bash
set -euo pipefail

# Script to update a Dev.to article's canonical URL to automation.songheng.vip
# Requires: DEV_TO_ARTICLE_ID and DEV_TO_API_KEY environment variables

NEW_CANONICAL_URL="https://automation.songheng.vip"

if [[ -z "${DEV_TO_ARTICLE_ID:-}" ]]; then
  echo "ERROR: DEV_TO_ARTICLE_ID environment variable is not set."
  echo "Please set it to the ID of the Dev.to article you want to update."
  exit 1
fi

if [[ -z "${DEV_TO_API_KEY:-}" ]]; then
  echo "ERROR: DEV_TO_API_KEY environment variable is not set."
  echo "Please set it to your Dev.to API key (found at https://dev.to/settings/extensions -> API Key)."
  exit 1
fi

echo "Updating article ID: ${DEV_TO_ARTICLE_ID}"
echo "Setting canonical URL to: ${NEW_CANONICAL_URL}"

RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X PUT "https://dev.to/api/articles/${DEV_TO_ARTICLE_ID}" \
  -H "Content-Type: application/json" \
  -H "api-key: ${DEV_TO_API_KEY}" \
  -d "{\"article\":{\"canonical_url\":\"${NEW_CANONICAL_URL}\"}}")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "HTTP Status: ${HTTP_CODE}"
echo "Response body:"
echo "${BODY}"

if [[ "$HTTP_CODE" -ge 200 && "$HTTP_CODE" -lt 300 ]]; then
  echo "SUCCESS: Canonical URL updated to ${NEW_CANONICAL_URL}"
  exit 0
else
  echo "FAILED: Received HTTP ${HTTP_CODE}"
  exit 1
fi
