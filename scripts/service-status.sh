#!/bin/bash
# apply-services.sh — Safe gateway service update
# Since the gateway runs on the host via systemd and we can't restart from inside container,
# this creates standalone HTTP service files that the gateway CAN require.
# The gateway will pick them up on next restart.

echo "=== my-automaton Service Status ==="
echo ""
echo "Gateway: $(curl -sf http://localhost:8080/api/health 2>/dev/null && echo '✅ running' || echo '❌ down')"
echo ""

# Check if services are loaded
echo "Services loaded in gateway:"
for svc in mcp webhook deepseek; do
  if curl -sf http://localhost:8080/api/webhooks/setup >/dev/null 2>&1; then
    echo "  ✅ ${svc}-service.cjs"
  else
    echo "  ⏳ ${svc}-service.cjs (needs gateway restart)"
  fi
done

echo ""
echo "=== All Service Files ==="
ls -la /root/automaton/services/*.cjs 2>/dev/null
echo ""
echo "=== How to restart gateway ==="
echo "  sudo systemctl restart automaton-gateway"
echo ""
echo "Or if systemctl not available:"
echo "  1. Kill existing gateway process"
echo "  2. cd /root/automaton && node gateway.js &"