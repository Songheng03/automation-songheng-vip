#!/usr/bin/env bash
# publish-npm.sh — Publish automaton-cli to npm
# Run from HOST (needs npm token)
set -e

if [ -z "$NPM_TOKEN" ]; then
  echo "Error: NPM_TOKEN environment variable not set"
  echo "Usage: NPM_TOKEN=npm_xxx bash publish-npm.sh"
  exit 1
fi

cd /root/automaton/npm-package

# Update package.json with version from git tag or date
VERSION="1.0.$(date +%Y%m%d)"
echo "Publishing version $VERSION..."

# Create .npmrc with token
echo "//registry.npmjs.org/:_authToken=$NPM_TOKEN" > .npmrc

# Publish
npm publish --access public

echo "✅ Published automaton-cli@$VERSION to npm"
echo "   Install: npm install -g automaton-cli"
