#!/bin/bash
# publish-action.sh — Host script to publish GitHub Action
# Run from host: bash /root/automaton/scripts/publish-action.sh
set -e

echo "🚀 Publishing GitHub Action..."
echo ""

GITHUB_TOKEN="${1:-$GITHUB_TOKEN}"
REPO="chaosong/ai-code-review-action"
DIR="/root/automaton/github-action"

if [ -z "$GITHUB_TOKEN" ]; then
  echo "❌ GITHUB_TOKEN not set!"
  echo "   Get one from https://github.com/settings/tokens (repo + workflow scopes)"
  echo "   Then run: export GITHUB_TOKEN=ghp_xxxxx"
  exit 1
fi

# Create temp directory
TMPDIR=$(mktemp -d)
cd "$TMPDIR"

echo "📁 Cloning repo..."
git clone "https://oauth2:${GITHUB_TOKEN}@github.com/${REPO}.git" . 2>/dev/null || {
  echo "   Repo doesn't exist yet, creating..."
  mkdir -p "$TMPDIR"
  cd "$TMPDIR"
  git init
  git remote add origin "https://oauth2:${GITHUB_TOKEN}@github.com/${REPO}.git"
}

# Copy action files
cp -r "$DIR/"* "$TMPDIR/"
rm -f "$TMPDIR/package-lock.json" 2>/dev/null || true

# Create action.yml if missing
if [ ! -f "$TMPDIR/action.yml" ]; then
  cat > "$TMPDIR/action.yml" << 'YML'
name: 'AI Code Review'
description: 'Automated AI code review for pull requests. Analyzes diffs for bugs, security issues, and best practices.'
author: 'my-automaton'
branding:
  icon: 'code'
  color: 'blue'

inputs:
  github-token:
    description: 'GitHub token for posting comments'
    required: true
    default: ${{ github.token }}
  severity:
    description: 'Minimum severity level (critical, high, medium, low, all)'
    required: false
    default: 'medium'
  endpoint:
    description: 'API endpoint for the automaton service'
    required: false
    default: 'https://automation.songheng.vip'
  max-comments:
    description: 'Maximum number of comments to post'
    required: false
    default: '10'
  api-key:
    description: 'Your automaton API key (get one from https://automation.songheng.vip/pricing)'
    required: true

runs:
  using: 'node20'
  main: 'index.js'
YML
fi

# Check if there's anything to commit
if git status --porcelain | grep -q .; then
  git add -A
  git commit -m "v$(date +%Y%m%d%H%M) — auto-update from my-automaton"
  git tag -f "v1.0.0" 2>/dev/null || git tag "v1.0.0"
  git push origin main --force
  git push origin --tags --force
  echo ""
  echo "✅ Published to https://github.com/$REPO"
  echo "   Marketplace: https://github.com/marketplace/actions/$REPO"
else
  echo "   No changes to commit."
fi

# Cleanup
cd /
rm -rf "$TMPDIR"
echo ""
echo "✅ Done!"
