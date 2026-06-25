#!/bin/bash
# publish-github-action.sh
# Run THIS from the HOST (not container) to push the AI Code Review Action to GitHub Marketplace
# 
# Usage: bash /root/automaton/scripts/publish-github-action.sh
#
# Prerequisites (on HOST):
#   1. GitHub CLI installed: sudo apt install gh
#   2. Authenticated: gh auth login
#   3. SSH key set up for git@github.com:chaosong/ai-code-review-action.git

REPO_DIR="/root/automaton/github-action"
REPO_URL="git@github.com:chaosong/ai-code-review-action.git"
VERSION="v1.0.0"

echo "=== Publishing AI Code Review Action to GitHub Marketplace ==="
echo ""

# Check if repo already cloned locally
if [ -d "$REPO_DIR/.git" ]; then
  echo "✅ Repository already cloned. Updating..."
  cd "$REPO_DIR"
  git pull origin main
else
  echo "📦 Cloning repository..."
  cd "$(dirname "$REPO_DIR")"
  git clone "$REPO_URL" "$(basename "$REPO_DIR")" 2>/dev/null || {
    echo "⚠️  Repo doesn't exist yet. Creating..."
    cd "$REPO_DIR"
    git init
    git remote add origin "$REPO_URL"
  }
  cd "$REPO_DIR"
fi

# Stage all files
echo "📝 Staging files..."
cd "$REPO_DIR"
git add -A

# Check if there are changes
if git diff --staged --quiet; then
  echo "✅ No changes to publish."
  exit 0
fi

# Commit
echo "📝 Committing..."
git commit -m "AI Code Review Action v$VERSION

Automated code review for pull requests using my-automaton AI.
Analyzes code quality, security vulnerabilities, and best practices.

Post inline PR comments with @actions/core + @actions/github."

# Tag
echo "🏷️  Tagging $VERSION..."
git tag -d "$VERSION" 2>/dev/null
git tag "$VERSION"
git tag "v1" 2>/dev/null

# Push
echo "🚀 Pushing to GitHub..."
git push origin main --tags

echo ""
echo "✅ Published! Visit:"
echo "   https://github.com/chaosong/ai-code-review-action"
echo "   https://github.com/marketplace/actions/ai-code-review"
echo ""
echo "Next steps:"
echo "   1. Go to https://github.com/chaosong/ai-code-review-action/releases"
echo "   2. Click 'Edit' on the $VERSION release"
echo "   3. Check 'Publish to GitHub Marketplace'"
