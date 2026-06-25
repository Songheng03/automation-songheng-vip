#!/bin/bash
# Publish @my-automaton/cli to npm
# Usage: ./publish.sh

set -e

cd "$(dirname "$0")"

# Check if logged in
if ! npm whoami &>/dev/null; then
  echo "❌ Not logged in to npm. Run: npm login"
  exit 1
fi

echo "📦 Publishing @my-automaton/cli..."
npm publish

echo "✅ Published!"
echo ""
echo "Users can now run:"
echo "  npx @my-automaton/cli review file.js"
