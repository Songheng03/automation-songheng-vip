#!/bin/bash
# One-liner installer for my-automaton CLI
# curl -sSL https://automation.songheng.vip/install.sh | bash

set -e

BOLD="\033[1m"; GREEN="\033[32m"; BLUE="\033[34m"; YELLOW="\033[33m"; RESET="\033[0m"

echo -e "${BOLD}${GREEN}⚡ my-automaton CLI Installer${RESET}"
echo ""

OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)

# Check for Node.js
if ! command -v node &>/dev/null; then
  echo -e "${YELLOW}Node.js not found. Install it first:${RESET}"
  echo "  https://nodejs.org/  or  brew install node  or  apt install nodejs"
  exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
  echo -e "${YELLOW}Node.js v16+ required, found v${NODE_VERSION}${RESET}"
  exit 1
fi

INSTALL_DIR="${HOME}/.my-automaton"
mkdir -p "$INSTALL_DIR"

echo -e "${BLUE}Downloading CLI...${RESET}"
curl -sSL "https://automation.songheng.vip/cli/ma.sh" -o "$INSTALL_DIR/ma"
chmod +x "$INSTALL_DIR/ma"

# Add to PATH
SHELL_RC=""
case "$SHELL" in
  */zsh) SHELL_RC="$HOME/.zshrc" ;;
  */bash) SHELL_RC="$HOME/.bashrc" ;;
  *) SHELL_RC="$HOME/.profile" ;;
esac

if ! grep -q "my-automaton" "$SHELL_RC" 2>/dev/null; then
  echo "export PATH=\"$INSTALL_DIR:\$PATH\"" >> "$SHELL_RC"
  echo "export MA_KEY=\"\${MA_KEY:-}\"" >> "$SHELL_RC"
fi

echo ""
echo -e "${GREEN}✅ Installed to ${INSTALL_DIR}/ma${RESET}"
echo ""
echo -e "  ${BOLD}Quick start:${RESET}"
echo "    1. Claim a free key: https://automation.songheng.vip/free-api-key.html"
echo "    2. Set your key: export MA_KEY=am_xxxxx"
echo "    3. Run: ma analyze 'your text here'"
echo ""
echo -e "  ${BOLD}Or source your shell:${RESET}"
echo "    source $SHELL_RC"
echo ""
echo -e "  ${BOLD}Commands:${RESET} ma analyze | summarize | review | security | explain | refactor | complexity"
