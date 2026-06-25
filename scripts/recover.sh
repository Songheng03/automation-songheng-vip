#!/bin/bash
# recover.sh — HOST recovery script for my-automaton
# Run on HOST: sudo bash /root/automaton/scripts/recover.sh
# Fixes: tunnel, gateway restart, disk cleanup, content verification

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "${CYAN}[$(date +%H:%M:%S)]${NC} $1"; }
ok()  { echo -e "  ${GREEN}✓${NC} $1"; }
warn(){ echo -e "  ${YELLOW}⚠${NC} $1"; }
fail(){ echo -e "  ${RED}✗${NC} $1"; }

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  my-automaton — HOST Recovery Script   ${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

# === STEP 1: Check docker ===
log "Step 1: Checking container..."
if docker ps --format '{{.Names}}' | grep -q automaton; then
  ok "Container 'automaton' is running"
else
  warn "Container not running. Starting..."
  docker start automaton && ok "Started automaton" || fail "Failed to start"
fi

# === STEP 2: Check cloudflared ===
log "Step 2: Checking Cloudflared tunnel..."
CF_PID=$(pgrep -f "cloudflared tunnel" 2>/dev/null || echo "")
if [ -n "$CF_PID" ]; then
  ok "Cloudflared running (PID: $CF_PID)"
else
  warn "Cloudflared not running. Starting tunnel via system..."
  # Try the system service first
  CLOUDFLARED="/usr/local/bin/cloudflared"
  if [ -f "$CLOUDFLARED" ]; then
    # Kill any stale instances
    pkill -f cloudflared 2>/dev/null || true
    sleep 1
    nohup "$CLOUDFLARED" tunnel --url http://localhost:8080 --no-autoupdate > /root/automaton/data/cloudflared.log 2>&1 &
    sleep 3
    CF_PID2=$(pgrep -f "cloudflared tunnel" 2>/dev/null || echo "")
    if [ -n "$CF_PID2" ]; then
      ok "Cloudflared started (PID: $CF_PID2)"
    else
      fail "Cloudflared failed to start. Check: $CLOUDFLARED"
    fi
  else
    fail "Cloudflared not installed at $CLOUDFLARED"
  fi
fi

# === STEP 3: Restart gateway ===
log "Step 3: Restarting gateway..."
sudo systemctl restart automaton-gateway 2>/dev/null && ok "Gateway restarted" || warn "systemctl unavailable, checking if gateway is running..."

# Wait for gateway
sleep 2
if curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/health 2>/dev/null | grep -q 200; then
  ok "Gateway responding on :8080"
else
  fail "Gateway not responding on :8080"
fi

# === STEP 4: Get tunnel URL ===
log "Step 4: Getting tunnel URL..."
sleep 3
TUNNEL_URL=$(curl -s http://localhost:8080/api/tunnel/status 2>/dev/null | grep -o '"url":"[^"]*"' | cut -d'"' -f4 || echo "")
if [ -n "$TUNNEL_URL" ]; then
  ok "Tunnel URL: $TUNNEL_URL"
else
  # Try reading from file
  TUNNEL_URL=$(cat /root/automaton/data/tunnel-url.txt 2>/dev/null || echo "")
  if [ -n "$TUNNEL_URL" ]; then
    ok "Tunnel URL (cached): $TUNNEL_URL"
  else
    warn "No tunnel URL yet - gateway auto-starting cloudflared"
  fi
fi

# === STEP 5: Test tunnel ===
log "Step 5: Testing tunnel..."
if [ -n "$TUNNEL_URL" ]; then
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$TUNNEL_URL/health" 2>/dev/null || echo "000")
  if [ "$HTTP_CODE" = "200" ]; then
    ok "Tunnel health: HTTP $HTTP_CODE"
  else
    warn "Tunnel health: HTTP $HTTP_CODE (may still be starting)"
  fi
fi

# Test branded domain
DOMAIN_CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 https://automation.songheng.vip/health 2>/dev/null || echo "000")
if [ "$DOMAIN_CODE" = "200" ]; then
  ok "Branded domain: HTTP $DOMAIN_CODE ✓"
else
  warn "Branded domain: HTTP $DOMAIN_CODE (may need Cloudflare config)"
fi

# === STEP 6: Verify content ===
log "Step 6: Verifying content..."
CONTENT_COUNT=$(find /root/automaton/content -name '*.html' 2>/dev/null | wc -l)
BLOG_COUNT=$(find /root/automaton/content/blog -name '*.html' 2>/dev/null | wc -l)
ok "$CONTENT_COUNT pages, $BLOG_COUNT blog articles"

# Check sitemap
SITEMAP=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/sitemap.xml 2>/dev/null || echo "000")
ok "Sitemap: HTTP $SITEMAP"

# === STEP 7: Check API keys ===
log "Step 7: Checking API keys..."
API_KEYS=$(cat /root/automaton/api-keys.json 2>/dev/null | grep -o '"am_[^"]*"' | wc -l || echo "0")
ok "$API_KEYS API keys issued"

# === STEP 8: Disk check ===
log "Step 8: Disk usage..."
DISK=$(df -h / | tail -1 | awk '{print $4}')
ok "Free disk: $DISK"

# === STEP 9: Memory/credits ===
log "Step 9: Revenue snapshot..."
echo ""
echo -e "${CYAN}=== REVENUE SNAPSHOT ===${NC}"
echo "API Keys issued: $API_KEYS"
echo "Content pages: $CONTENT_COUNT (+ $BLOG_COUNT blog)"
echo ""

# === SUMMARY ===
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  RECOVERY COMPLETE                     ${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""
echo "Domain:   https://automation.songheng.vip"
echo "Tunnel:   ${TUNNEL_URL:-checking...}"
echo "Gateway:  http://localhost:8080"
echo ""
echo "Next steps:"
echo "  1. Verify tunnel URL works: curl -I \$TUNNEL_URL"
echo "  2. If branded domain is 530, check Cloudflare DNS config"
echo "  3. Submit to search engines: docker exec automaton node /root/automaton/scripts/seo-submit.mjs"
echo ""
