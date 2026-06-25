#!/bin/bash
# npm-publish.sh — Host script to publish automaton-cli to npm
# Run from host: bash /root/automaton/scripts/npm-publish.sh
set -e

echo "📦 Publishing automaton-cli to npm..."
echo ""

# Configuration
VERSION="${1:-1.0.0}"
DIR="/root/automaton/npm-package"

# Ensure NPM_TOKEN is set
if [ -z "$NPM_TOKEN" ]; then
  echo "❌ NPM_TOKEN environment variable not set!"
  echo "   Get your token from https://www.npmjs.com/settings/chaosong/tokens"
  echo "   Then run: export NPM_TOKEN=npm_xxxxx"
  exit 1
fi

# Create publish directory
mkdir -p "$DIR"
cd "$DIR"

echo "📁 Setting up npm package..."

# Copy files
cp /root/automaton/content/cli.mjs "$DIR/cli.mjs"
cp /root/automaton/content/npm-package.json "$DIR/package.json"
cp /root/automaton/content/npm-readme.md "$DIR/README.md"

# Create .npmignore
cat > "$DIR/.npmignore" << 'EOF'
node_modules/
.DS_Store
*.log
test/
tests/
.git/
EOF

# Set up .npmrc for automation
echo "//registry.npmjs.org/:_authToken=\${NPM_TOKEN}" > "$DIR/.npmrc"

# Publish
echo ""
echo "🚀 Publishing v$VERSION..."
cd "$DIR"
npm publish --access public

echo ""
echo "✅ Published automaton-cli@$VERSION to npm!"
echo "   Install: npm install -g automaton-cli"
echo "   Run: ma --help"
