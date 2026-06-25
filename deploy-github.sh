#!/usr/bin/env bash
# ==============================================================
# deploy-github.sh — Deploy my-automaton GitHub Action to GitHub
# ==============================================================
set -euo pipefail

REPO="chaosong/my-automaton-review"
ACTION_DIR="/root/automaton/github-action"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🚀 Deploying my-automaton Code Review Action${NC}"
echo ""

# Check for GitHub token
GITHUB_TOKEN="${GITHUB_TOKEN:-}"
if [ -z "$GITHUB_TOKEN" ] && [ -f /root/.github-token ]; then
  GITHUB_TOKEN=$(cat /root/.github-token)
fi

if [ -z "$GITHUB_TOKEN" ]; then
  echo -e "${RED}❌ No GitHub token found.${NC}"
  echo "   Set GITHUB_TOKEN env var or create /root/.github-token"
  echo "   Get one at: https://github.com/settings/tokens"
  echo "   Required scopes: public_repo, workflow"
  exit 1
fi

TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

# Create or clone repo
echo -e "${YELLOW}📦 Setting up repository...${NC}"
if ! git clone "https://x-access-token:${GITHUB_TOKEN}@github.com/${REPO}.git" "$TMPDIR/repo" 2>/dev/null; then
  echo "Creating repository via API..."
  curl -sf -X POST "https://api.github.com/user/repos" \
    -H "Authorization: token $GITHUB_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"name":"my-automaton-review","description":"AI-powered code review and security scanning for PRs","private":false,"auto_init":true,"homepage":"https://automation.songheng.vip"}' > /dev/null
  git clone "https://x-access-token:${GITHUB_TOKEN}@github.com/${REPO}.git" "$TMPDIR/repo"
fi

# Copy files
echo -e "${YELLOW}📄 Copying action files...${NC}"
cp "$ACTION_DIR/action.yml" "$TMPDIR/repo/"
cp "$ACTION_DIR/index.js" "$TMPDIR/repo/"
cp "$ACTION_DIR/package.json" "$TMPDIR/repo/"
cp "$ACTION_DIR/README.md" "$TMPDIR/repo/"

# Create LICENSE
cat > "$TMPDIR/repo/LICENSE" << 'EOF'
MIT License

Copyright (c) 2026 my-automaton

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
EOF

# Commit and push
echo -e "${YELLOW}📤 Pushing to GitHub...${NC}"
cd "$TMPDIR/repo"
git config user.email "agent@automation.songheng.vip"
git config user.name "my-automaton"

git add -A
if git diff --cached --quiet; then
  echo "No changes to commit."
else
  git commit -m "v1.0.0: AI code review action with security scanning"
  git tag -f "v1" 2>/dev/null || true
  git push origin main --tags
fi

echo ""
echo -e "${GREEN}✅ Published!${NC}"
echo "   Repo: https://github.com/$REPO"
echo ""
echo -e "${YELLOW}📋 Next steps:${NC}"
echo "   1. Go to https://github.com/$REPO/releases"
echo "   2. Create release from v1 tag"
echo "   3. Check 'Publish to GitHub Marketplace'"
echo "   4. Publish"
echo ""
echo -e "${YELLOW}💡 Users add to their workflows:${NC}"
echo "   - name: AI Code Review"
echo "     uses: chaosong/my-automaton-review@v1"
