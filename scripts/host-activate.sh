#!/bin/bash
# HOST-ACTIVATE.sh — Run this on the HOST to activate my-automaton gateway v2.1
# One command: bash /root/automaton/scripts/host-activate.sh
# No arguments needed. Safe to re-run.

set -e
echo "=== my-automaton Gateway Activation v2.1 ==="
echo ""

# 1. Verify gateway code exists
if [ ! -f /root/automaton/gateway.cjs ]; then
  echo "ERROR: /root/automaton/gateway.cjs not found!"
  exit 1
fi

# 2. Make sure node is available
if ! command -v node &>/dev/null; then
  echo "ERROR: node not found!"
  exit 1
fi

# 3. Validate gateway syntax
echo "[1/4] Validating gateway syntax..."
node -c /root/automaton/gateway.cjs && echo "  ✅ Syntax OK" || { echo "  ❌ Syntax error!"; exit 1; }

# 4. Check for required files
echo "[2/4] Checking required files..."
for f in /root/automaton/content/index.html /root/automaton/api-keys.json; do
  if [ ! -f "$f" ]; then
    echo "  ⚠️  Missing: $f (creating empty)"
    touch "$f"
  fi
done
echo "  ✅ Files OK"

# 5. Ensure data directory
mkdir -p /root/automaton/data
echo "  ✅ Data directory ready"

# 6. Check automaton-gateway service exists
echo "[3/4] Checking service..."
if systemctl list-units --type=service 2>/dev/null | grep -q automaton-gateway; then
  echo "  ✅ automaton-gateway service found"
else
  echo "  ⚠️  automaton-gateway service not found"
  echo "  Creating service file..."
  cat > /etc/systemd/system/automaton-gateway.service << 'SERVICEEOF'
[Unit]
Description=my-automaton Gateway
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/automaton
ExecStart=/usr/bin/node /root/automaton/gateway.cjs
Restart=always
RestartSec=5
Environment="DEEPSEEK_API_KEY=$(cat /root/automaton/automaton.json 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('DEEPSEEK_API_KEY',''))" 2>/dev/null || echo '')"
Environment="STRIPE_SK=$(cat /root/automaton/automaton.json 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('STRIPE_SK',''))" 2>/dev/null || echo '')"
Environment="STRIPE_PK=$(cat /root/automaton/automaton.json 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('STRIPE_PK',''))" 2>/dev/null || echo '')"
Environment="NODE_ENV=production"

[Install]
WantedBy=multi-user.target
SERVICEEOF
  systemctl daemon-reload
  echo "  ✅ Service file created"
fi

# 7. Restart the gateway
echo "[4/4] Restarting gateway..."
systemctl restart automaton-gateway && echo "  ✅ Gateway restarted" || { echo "  ❌ Restart failed!"; exit 1; }

# 8. Wait and verify
sleep 2
if curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/health 2>/dev/null | grep -q 200; then
  echo "  ✅ Gateway health check PASSED"
else
  echo "  ⚠️  Health check failed, checking service status..."
  systemctl status automaton-gateway --no-pager 2>&1 | tail -20
fi

# 9. Verify new routes
echo ""
echo "=== Route Verification ==="
declare -a ROUTES=(
  "/health"
  "/api/dev-key" 
  "/api/catalog"
  "/api/catalog/openai"
  "/api/discover"
  "/sitemap.xml"
  "/robots.txt"
  "/code-grader.html"
  "/clawhunt-submit.html"
)

for route in "${ROUTES[@]}"; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:8080$route" 2>/dev/null)
  if [ "$code" = "200" ]; then
    echo "  ✅ $route → 200"
  elif [ "$code" = "000" ]; then
    echo "  ❌ $route → connection refused"
  else
    echo "  ⚠️  $route → $code"
  fi
done

echo ""
echo "=== Activation Complete ==="
echo "Gateway URL: https://automation.songheng.vip"
echo "Test: curl -s https://automation.songheng.vip/health"
echo ""
echo "To check logs: journalctl -u automaton-gateway -n 50 --no-pager"
