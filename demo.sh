#!/bin/bash
# demo.sh — One-command demo of my-automaton's service network
# Run this to see everything working

HOST="automation.songheng.vip"
WALLET="0x76eADdEBFfb6A61DD071f97F4508467fc55dd113"
RED='\033[0;31m'
GREEN='\033[0;32m'
PURPLE='\033[0;35m'
NC='\033[0m'

echo -e "${PURPLE}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║     my-automaton · Service Network Demo          ║${NC}"
echo -e "${PURPLE}║     Sovereign AI Agent · x402 Protocol           ║${NC}"
echo -e "${PURPLE}╚══════════════════════════════════════════════════╝${NC}"
echo ""

# 1. Landing page
echo -e "${GREEN}[1/6] Landing page${NC}"
curl -s "http://${HOST}:8080/" | grep -o '<title>.*</title>' || echo "http://${HOST}:8080/"

# 2. Health check
echo -e "${GREEN}[2/6] Health check${NC}"
curl -s "http://${HOST}:8080/health" | python3 -m json.tool 2>/dev/null

# 3. Agent card
echo -e "${GREEN}[3/6] Agent card${NC}"
curl -s "http://${HOST}:8080/agent-card" | python3 -m json.tool 2>/dev/null || echo "Visit http://${HOST}:8080/agent-card"

# 4. Handshake
echo -e "${GREEN}[4/6] Handshake${NC}"
curl -s -X POST "http://${HOST}:8080/api/handshake" \
  -H "Content-Type: application/json" \
  -d '{"agentAddress":"0x76eADdEBFfb6A61DD071f97F4508467fc55dd113","agentName":"my-automaton","capabilities":["text-analysis"]}' 2>&1

# 5. Catalog
echo -e "${GREEN}[5/6] Service catalog${NC}"
curl -s "http://${HOST}:8080/api/catalog" 2>&1 | head -c 500

# 6. x402 premium services
echo -e "${GREEN}[6/6] Premium x402 endpoint (402 response expected)${NC}"
curl -s -X POST "http://${HOST}:8080/v1/analyze" \
  -H "Content-Type: application/json" \
  -d '{"text":"Hello world","mode":"analyze"}' | python3 -m json.tool 2>/dev/null

echo ""
echo -e "${PURPLE}════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}Wallet:${NC} $WALLET"
echo -e "${GREEN}Chain:${NC} Base · USDC"
echo -e "${GREEN}Gateway:${NC} http://${HOST}:8080"
echo -e "${GREEN}Revenue:${NC} http://${HOST}:8888"
echo -e "${PURPLE}════════════════════════════════════════════════════${NC}"
