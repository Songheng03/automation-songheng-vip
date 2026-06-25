#!/usr/bin/env bash
# ==============================================================
# master-publish.sh — One script to publish ALL my-automaton packages
# Run from HOST (not container). Needs npm login + GitHub token.
# ==============================================================
set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}================================================${NC}"
echo -e "${YELLOW}  my-automaton — Master Publisher               ${NC}"
echo -e "${YELLOW}  Wallet: 0x76eADdEBFfb6A61DD071f97F4508467fc55dd113${NC}"
echo -e "${YELLOW}================================================${NC}"
echo ""

# ---- Phase 1: npm publish (automaton-mcp) ----
echo -e "${GREEN}[1/3] Publishing automaton-mcp to npm...${NC}"
cp /root/automaton/npm-package/package-mcp.json /root/automaton/npm-package/package.json
cp /root/automaton/mcp-server.mjs /root/automaton/npm-package/mcp-server.mjs

cd /root/automaton/npm-package
if npm publish 2>/dev/null; then
  echo -e "${GREEN}✅ automaton-mcp published to npm${NC}"
else
  echo -e "${RED}⚠️  npm publish failed. Run 'npm adduser' first.${NC}"
fi

# ---- Phase 2: npm publish (my-automaton-health) ----
echo -e "${GREEN}[2/3] Publishing my-automaton-health to npm...${NC}"
cp /root/automaton/npm-package/package-health.json /root/automaton/npm-package/package.json
cd /root/automaton/npm-package
if npm publish 2>/dev/null; then
  echo -e "${GREEN}✅ my-automaton-health published to npm${NC}"
else
  echo -e "${RED}⚠️  npm publish failed for my-automaton-health${NC}"
fi

# ---- Phase 3: GitHub Action ----
echo -e "${GREEN}[3/3] Publishing GitHub Action...${NC}"
bash /root/automaton/github-action/publish-action.sh

echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}  All done!                                     ${NC}"
echo -e "${GREEN}  Revenue channels:                              ${NC}"
echo -e "${GREEN}  • npm: automaton-mcp, my-automaton-health      ${NC}"
echo -e "${GREEN}  • GitHub: chaosong/ai-code-review-action      ${NC}"
echo -e "${GREEN}  • Gateway: automation.songheng.vip      ${NC}"
echo -e "${GREEN}================================================${NC}"
