#!/usr/bin/env bash
# ==============================================================
# publish-action.sh — Publish AI Code Review Action to GitHub
# Run THIS script FROM THE HOST, not the container.
# The container doesn't have git installed.
# ==============================================================
set -euo pipefail

REPO="chaosong/ai-code-review-action"
BRANCH="main"
ACTION_DIR="/root/automaton/github-action"
TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

echo "🚀 Publishing AI Code Review Action to $REPO"
echo ""

# 1. Check for GitHub token
if [ -z "${GITHUB_TOKEN:-}" ]; then
  if [ -f /root/.github-token ]; then
    GITHUB_TOKEN=$(cat /root/.github-token)
  else
    echo "❌ GITHUB_TOKEN not set. Create /root/.github-token or set env var."
    echo "   Get a token at: https://github.com/settings/tokens"
    echo "   Required scopes: public_repo, workflow"
    exit 1
  fi
fi

# 2. Clone the repo (will create empty if needed)
echo "📦 Setting up repository..."
if ! git clone "https://x-access-token:${GITHUB_TOKEN}@github.com/${REPO}.git" "$TMPDIR/repo" 2>/dev/null; then
  echo "⚠️  Repo doesn't exist. Creating via GitHub API..."
  curl -sf -X POST "https://api.github.com/user/repos" \
    -H "Authorization: token $GITHUB_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"ai-code-review-action\",\"description\":\"AI-powered code review for PRs — by my-automaton\",\"private\":false,\"auto_init\":true}" > /dev/null
  git clone "https://x-access-token:${GITHUB_TOKEN}@github.com/${REPO}.git" "$TMPDIR/repo"
fi

# 3. Copy action files
echo "📄 Copying action files..."
cp "$ACTION_DIR/action.yml" "$TMPDIR/repo/"
cp "$ACTION_DIR/index.js" "$TMPDIR/repo/"
cp "$ACTION_DIR/package.json" "$TMPDIR/repo/"
cp "$ACTION_DIR/README.md" "$TMPDIR/repo/"

# 4. Commit and push
echo "📤 Pushing to GitHub..."
cd "$TMPDIR/repo"
git add -A
git commit -m "v1.0.0: AI Code Review Action — automated PR reviews via my-automaton API" 2>/dev/null || true
git tag -f "v1.0.0" 2>/dev/null || true
git push origin main --tags

echo ""
echo "✅ Published successfully!"
echo "   https://github.com/$REPO"
echo "   https://github.com/marketplace/actions/ai-code-review"
echo ""
echo "📋 Next steps:"
echo "   1. Go to https://github.com/$REPO/releases"
echo "   2. Draft a release from tag v1.0.0"
echo "   3. Check 'Publish to GitHub Marketplace'"
echo "   4. Publish release"
echo ""
echo "💡 Users install via:"
echo "   - name: AI Code Review"
echo "     uses: $REPO@v1"
echo "     with:"
echo "       github-token: \${{ secrets.GITHUB_TOKEN }}"
echo "       api-key: \${{ secrets.MY_AUTOMATON_KEY }}"
