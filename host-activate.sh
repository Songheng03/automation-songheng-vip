#!/bin/bash
# ============================================================
# HOST ACTIVATION SCRIPT — Run ONCE on the host (outside Docker)
# Fixes tunnel + publishes GitHub Action + npm package
# ============================================================
# Usage: sudo bash /root/automaton/host-activate.sh
# ============================================================

set -e
echo "=========================================="
echo "  my-automaton — HOST ACTIVATION"
echo "=========================================="
echo ""

# --- STEP 1: Fix Cloudflare Tunnel ---
echo "▶ Step 1/5: Fixing Cloudflare Tunnel..."

# Check if cloudflared is installed
if ! command -v cloudflared &> /dev/null; then
    echo "  Installing cloudflared..."
    curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o /usr/local/bin/cloudflared
    chmod +x /usr/local/bin/cloudflared
fi

# Create config directory
mkdir -p /root/.cloudflared

# Check if authenticated
if [ ! -f /root/.cloudflared/cert.pem ]; then
    echo "  ⚠ No cloudflared cert found. Login required."
    echo "  Run: cloudflared tunnel login"
    echo "  Then re-run this script."
    exit 1
fi

# Check if tunnel exists
if ! cloudflared tunnel list 2>/dev/null | grep -q "automaton"; then
    echo "  Creating tunnel 'automaton'..."
    cloudflared tunnel create automaton
fi

# Write config
cat > /root/.cloudflared/config.yml << 'CONFIG'
tunnel: automaton
credentials-file: /root/.cloudflared/automaton.json
ingress:
  - hostname: automation.songheng.vip
    service: http://localhost:8080
  - service: http_status:404
CONFIG

# DNS route
cloudflared tunnel route dns automaton automation.songheng.vip 2>/dev/null || echo "  DNS route exists or ignored"

# Restart cloudflared as system service
cat > /etc/systemd/system/cloudflared.service << 'SERVICE'
[Unit]
Description=cloudflared tunnel for automaton
After=network.target

[Service]
ExecStart=/usr/local/bin/cloudflared tunnel run automaton
Restart=on-failure
RestartSec=5
User=root

[Install]
WantedBy=multi-user.target
SERVICE

systemctl daemon-reload
systemctl enable cloudflared
systemctl restart cloudflared
echo "  ✅ Tunnel service started"
echo ""

# --- STEP 2: Verify Gateway ---
echo "▶ Step 2/5: Verifying Gateway..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/ | grep -q "200"; then
    echo "  ✅ Gateway is running on :8080"
else
    echo "  ⚠ Gateway not responding. Restarting..."
    sudo systemctl restart automaton-gateway
    sleep 2
fi
echo ""

# --- STEP 3: Publish GitHub Action ---
echo "▶ Step 3/5: Publishing GitHub Action..."
cd /root/automaton/github-action

# Check if remote exists
if git remote -v 2>/dev/null | grep -q "origin"; then
    echo "  Remote already configured"
else
    echo "  Setting up remote..."
    # Use SSH if available, otherwise HTTPS
    if [ -f ~/.ssh/id_ed25519.pub ]; then
        git remote add origin git@github.com:chaosong/ai-code-review-action.git
    else
        echo "  ⚠ No SSH key found. Create one: ssh-keygen -t ed25519"
        echo "  Then add to GitHub: https://github.com/settings/keys"
        echo "  Skipping GitHub push..."
    fi
fi

# Commit and push
git add -A
git commit -m "v1.0.0: AI code review GitHub Action" 2>/dev/null || true
git tag v1.0.0 2>/dev/null || true
git push origin main --tags 2>/dev/null && echo "  ✅ GitHub Action pushed" || echo "  ⚠ Push failed (see above)"
echo ""

# --- STEP 4: Publish npm Package ---
echo "▶ Step 4/5: Publishing npm package..."
cd /root/automaton/npm-package

# Check if logged in to npm
if npm whoami 2>/dev/null; then
    npm publish 2>/dev/null && echo "  ✅ npm package published" || echo "  ⚠ npm publish failed"
else
    echo "  ⚠ Not logged in to npm. Run: npm login"
    echo "  Then run: cd /root/automaton/npm-package && npm publish"
fi
echo ""

# --- STEP 5: Directory Submissions ---
echo "▶ Step 5/5: Checking directory submissions..."
echo "  Visit these URLs to submit your gateway:"
echo "    • https://smithery.ai/server/chaosong/ai-code-review-action"
echo "    • https://glama.ai/mcp/servers"
echo "    • https://mcp.so"
echo "    • https://www.clawhunt.com/"
echo ""

echo "=========================================="
echo "  ACTIVATION COMPLETE"
echo "=========================================="
echo ""
echo "Check tunnel:     curl -I https://automation.songheng.vip/"
echo "Check gateway:    curl -s http://localhost:8080/ | head"
echo "Check logs:       journalctl -u cloudflared -n 20 --no-pager"
echo "GitHub Action:    https://github.com/chaosong/ai-code-review-action"
echo "npm package:      https://www.npmjs.com/package/automaton-mcp"
echo ""
