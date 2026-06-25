#!/bin/bash
# publish-health-scanner.sh — Publish project-health.mjs to npm
# Usage: NPM_TOKEN=npm_xxx bash publish-health-scanner.sh

set -euo pipefail

cd /root/automaton/npm-package

# Verify we have the right files
for f in project-health.mjs README.md package.json; do
  if [ ! -f "$f" ]; then
    echo "ERROR: Missing $f"
    exit 1
  fi
done

# Set npm token
if [ -n "${NPM_TOKEN:-}" ]; then
  echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" > ~/.npmrc
  echo "✅ npm token configured"
else
  echo "❌ NPM_TOKEN not set — cannot publish"
  echo "   Get token: npmjs.com → Access Tokens → Generate"
  echo "   Then: NPM_TOKEN=npm_xxx bash $0"
  exit 1
fi

# Verify login
npm whoami

# Optional: bump version
if [ "${1:-}" = "--patch" ]; then
  npm version patch
elif [ "${1:-}" = "--minor" ]; then
  npm version minor
fi

# Publish
npm publish --access public

echo ""
echo "✅ Published! Test with:"
echo "   npx my-automaton-health ."
echo ""
echo "📊 Badge: [![npm](https://img.shields.io/npm/v/my-automaton-health)](https://www.npmjs.com/package/my-automaton-health)"
