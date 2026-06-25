#!/bin/bash
# Host Tunnel Setup Script — Run ONCE on the VPS HOST (not inside Docker)
# Sets up permanent Cloudflare Tunnel with systemd autostart
# Usage: ssh into host, then: bash /root/automaton/scripts/host-setup-tunnel.sh

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  My Automaton — Tunnel Setup Script${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Step 1: Check if cloudflared exists
echo -e "${YELLOW}[1/6] Checking cloudflared...${NC}"
if ! which cloudflared &>/dev/null; then
    echo -e "${YELLOW}  Installing cloudflared...${NC}"
    curl -sL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o /usr/local/bin/cloudflared
    chmod +x /usr/local/bin/cloudflared
    echo -e "${GREEN}  ✅ Installed cloudflared $(cloudflared version)${NC}"
else
    echo -e "${GREEN}  ✅ cloudflared $(cloudflared version)${NC}"
fi

# Step 2: Check authentication
echo -e "${YELLOW}[2/6] Checking Cloudflare authentication...${NC}"
if [ ! -f /root/.cloudflared/cert.pem ]; then
    echo -e "${RED}  ❌ Not authenticated. Run: cloudflared tunnel login${NC}"
    echo -e "${YELLOW}  This opens a URL. Log in to Cloudflare and authorize.${NC}"
    cloudflared tunnel login
fi
echo -e "${GREEN}  ✅ Authenticated${NC}"

# Step 3: Create tunnel
TUNNEL_NAME="automaton-tunnel"
echo -e "${YELLOW}[3/6] Setting up tunnel '${TUNNEL_NAME}'...${NC}"
if [ ! -f /root/.cloudflared/${TUNNEL_NAME}.json ]; then
    cloudflared tunnel create ${TUNNEL_NAME}
    echo -e "${GREEN}  ✅ Tunnel created${NC}"
else
    echo -e "${GREEN}  ✅ Tunnel already exists${NC}"
fi

# Get tunnel ID
TUNNEL_ID=$(cat /root/.cloudflared/${TUNNEL_NAME}.json 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])" 2>/dev/null || echo "")
if [ -z "$TUNNEL_ID" ]; then
    TUNNEL_ID=$(ls /root/.cloudflared/*.json 2>/dev/null | grep -v cert | grep -v credentials | head -1 | xargs cat 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])" 2>/dev/null || echo "unknown")
fi
echo -e "  Tunnel ID: ${TUNNEL_ID}"

# Step 4: Configure DNS
echo -e "${YELLOW}[4/6] Configuring DNS...${NC}"
cloudflared tunnel route dns ${TUNNEL_NAME} automation.songheng.vip 2>/dev/null && echo -e "${GREEN}  ✅ DNS routed${NC}" || echo -e "${YELLOW}  ⚠️ DNS route may already exist${NC}"

# Step 5: Create config file
echo -e "${YELLOW}[5/6] Creating config file...${NC}"
mkdir -p /root/.cloudflared
cat > /root/.cloudflared/config.yml << EOF
tunnel: ${TUNNEL_NAME}
credentials-file: /root/.cloudflared/${TUNNEL_ID}.json

ingress:
  - hostname: automation.songheng.vip
    service: http://localhost:8080
  - service: http_status:404
EOF
echo -e "${GREEN}  ✅ Config written${NC}"

# Step 6: Create systemd service
echo -e "${YELLOW}[6/6] Creating systemd service...${NC}"
cat > /etc/systemd/system/automaton-tunnel.service << 'EOF'
[Unit]
Description=Cloudflare Tunnel for My Automaton
After=network.target
Wants=network.target

[Service]
Type=simple
User=root
ExecStart=/usr/local/bin/cloudflared tunnel run automaton-tunnel
Restart=always
RestartSec=10
WatchdogSec=30

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable automaton-tunnel
systemctl restart automaton-tunnel

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  ✅ Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Service: ${BLUE}automaton-tunnel${NC}"
echo -e "Domain: ${BLUE}https://automation.songheng.vip${NC}"
echo ""
echo -e "Commands:"
echo -e "  Check status:  ${YELLOW}systemctl status automaton-tunnel${NC}"
echo -e "  View logs:     ${YELLOW}journalctl -u automaton-tunnel -f${NC}"
echo -e "  Restart:       ${YELLOW}systemctl restart automaton-tunnel${NC}"
echo ""
echo -e "Testing domain..."
sleep 5
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://automation.songheng.vip/ 2>/dev/null || echo "timeout")
if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}  ✅ Domain returns 200 — YOU'RE LIVE!${NC}"
else
    echo -e "${YELLOW}  ⚠️ Domain returned ${HTTP_CODE}. Check: journalctl -u automaton-tunnel -n 30${NC}"
fi
