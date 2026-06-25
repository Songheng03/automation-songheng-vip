#!/bin/bash
# host-deploy.sh — One-command deployment for my-automaton gateway
# Run on HOST (not container): bash /root/automaton/data/host-deploy.sh
# This activates ALL services: gateway, tunnel, webhook, npm, submissions

set -e

echo "============================================"
echo "  my-automaton — Host Deployment Script"
echo "  $(date -u)"
echo "============================================"

# ── Step 1: Restart Gateway ──────────────────────────────
echo ""
echo "[1/5] Restarting gateway (activates all API endpoints)..."
sudo systemctl restart automaton-gateway 2>/dev/null && echo "  ✅ Gateway restarted" || echo "  ⚠️  Could not restart gateway (run manually: sudo systemctl restart automaton-gateway)"

# ── Step 2: Verify Gateway ───────────────────────────────
echo ""
echo "[2/5] Verifying gateway health..."
sleep 1
GW=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8080/health 2>/dev/null)
if [ "$GW" = "200" ]; then
  echo "  ✅ Gateway healthy (HTTP $GW)"
else
  echo "  ❌ Gateway not responding (HTTP $GW)"
fi

# ── Step 3: Restart Cloudflare Tunnel ────────────────────
echo ""
echo "[3/5] Restarting Cloudflare tunnel..."
sudo systemctl restart cloudflared 2>/dev/null && echo "  ✅ Tunnel restarted" || echo "  ⚠️  Could not restart tunnel (run: sudo systemctl restart cloudflared)"
sleep 2

# Check tunnel
TUN=$(curl -s -o /dev/null -w "%{http_code}" https://automation.songheng.vip/health 2>/dev/null)
if [ "$TUN" = "200" ]; then
  echo "  ✅ Tunnel working — https://automation.songheng.vip is LIVE"
else
  echo "  ⚠️  Tunnel returned HTTP $TUN (may need manual fix)"
fi

# ── Step 4: Start Webhook Service ────────────────────────
echo ""
echo "[4/5] Starting GitHub webhook service..."
if [ -n "$GITHUB_TOKEN" ]; then
  nohup node /root/automaton/services/webhook-service.cjs --port 3099 > /tmp/webhook.log 2>&1 &
  echo "  ✅ Webhook started on port 3099 (PID $!)"
else
  echo "  ⚠️  GITHUB_TOKEN not set — webhook not started"
  echo "  Set it: export GITHUB_TOKEN=ghp_xxx"
fi

# ── Step 5: Publish npm package ──────────────────────────
echo ""
echo "[5/5] Publishing npm package..."
if command -v npm &> /dev/null; then
  cd /root/automaton/content/npm-package
  if [ -f package.json ]; then
    echo "  📦 Package ready at /root/automaton/content/npm-package/"
    echo "  Run: cd /root/automaton/content/npm-package && npm publish"
  else
    echo "  ⚠️  Package not found at /content/npm-package/"
  fi
else
  echo "  ⚠️  npm not installed"
fi

# ── Summary ──────────────────────────────────────────────
echo ""
echo "============================================"
echo "  DEPLOYMENT SUMMARY"
echo "============================================"
echo "  Gateway:  http://127.0.0.1:8080/health"
echo "  Domain:   https://automation.songheng.vip"
echo "  Webhook:  POST /api/github-webhook"
echo "  npm:      npx @my-automaton/cli"
echo ""
echo "  Revenue:  https://automation.songheng.vip/upgrade.html"
echo "  Docs:     https://automation.songheng.vip/api-docs.html"
echo "  Playground: https://automation.songheng.vip/api-playground.html"
echo ""
echo "  Wallet:   0x76eADdEBFfb6a61DD071f97F4508467fc55dd113 (Base)"
echo "============================================"
echo ""
echo "To submit to ClawHunt.com:"
echo "  Open https://clawhunt.com/tools/submit"
echo "  Use data from /root/automaton/data/submissions/clawhunt-submission.json"
echo ""
echo "Done."
