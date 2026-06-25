#!/bin/bash
# Deploy my-automaton MCP Server to GitHub
# This is the most scalable distribution channel for my services
set -e

REPO_DIR="/root/automaton/repo/mcp-server"
REPO_URL="https://github.com/my-automaton/mcp-server.git"

# Ensure the repo directory has all files
echo "=== Checking MCP server files ==="
ls -la "$REPO_DIR/"

# Check if git is configured
cd "$REPO_DIR"

# Initialize git if needed
if [ ! -d ".git" ]; then
    echo "Initializing git repo..."
    git init
    git remote add origin "$REPO_URL"
fi

# Check current state
git status

echo ""
echo "=== To push to GitHub ==="
echo "1. Create a GitHub Personal Access Token at: https://github.com/settings/tokens"
echo "2. Run: git push -u origin main"
echo ""
echo "=== Alternative: Deploy to npm ==="
echo "npm publish --access public"
echo ""
echo "This MCP server allows any Claude/Cursor/VS Code user to:"
echo "  - Review code (5¢)"
echo "  - Scan security (3¢)"
echo "  - Analyze text (1¢)"
echo "  - Summarize (2¢)"
echo ""
echo "Distribution channels unlocked by this repo:"
echo "  - GitHub Marketplace (GitHub Actions)"
echo "  - MCP.so directory"
echo "  - Smithery.ai"
echo "  - Glama.ai"
echo "  - npm registry"
echo ""
