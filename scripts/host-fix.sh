#!/bin/bash
# host-fix.sh — ONE-SHOT RECOVERY for my-automaton
# Run on HOST (not in container): bash /root/automaton/scripts/host-fix.sh
# Restarts gateway and cloudflared tunnel

echo "=== my-automaton HOST FIX ==="
echo "Timestamp: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
echo ""

# 1. Check current state
echo "--- Current Gateway Status ---"
curl -s http://localhost:8080/health 2>/dev/null || echo "Gateway not responding"
echo ""

echo "--- Current Cloudflared Status ---"
systemctl is-active cloudflared 2>/dev/null || echo "cloudflared service not found"
echo ""

# 2. Restart Gateway (load v2.2 with all endpoints)
echo "--- Restarting Gateway ---"
echo "Gateway file on disk: $(wc -l /root/automaton/gateway.cjs | cut -d' ' -f1) lines"
systemctl restart automaton-gateway 2>&1
sleep 2
echo "Gateway status after restart:"
curl -s http://localhost:8080/health | python3 -m json.tool 2>/dev/null || curl -s http://localhost:8080/health
echo ""

# 3. Restart Cloudflared (fix tunnel 530 error)
echo "--- Restarting Cloudflared Tunnel ---"
systemctl restart cloudflared 2>&1
sleep 3
echo "Cloudflared status:"
systemctl status cloudflared --no-pager 2>&1 | head -5
echo ""

# 4. Verify all endpoints
echo "--- Verifying Endpoints ---"
echo -n "Health: "; curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/health
echo -n " | Static: "; curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/
echo -n " | Stats: "; curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/stats/overview
echo -n " | DevKey: "; curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/dev-key
echo -n " | FreeReview: "; curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:8080/free/review -H 'Content-Type: application/json' -d '{"code":"test"}'
echo -n " | MCP: "; curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:8080/api/mcp -H 'Content-Type: application/json' -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
echo -n " | Catalog: "; curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/catalog
echo ""

# 5. Test external tunnel
echo "--- Testing External Tunnel ---"
curl -s -o /dev/null -w "External HTTPS: %{http_code}" https://automation.songheng.vip/health 2>/dev/null || echo "External: FAILED (tunnel may still need time)"
echo ""

# 6. Report summary
echo "=== SUMMARY ==="
echo "Gateway: $(curl -s http://localhost:8080/health 2>/dev/null | python3 -c 'import sys,json; d=json.load(sys.stdin); print(f"v{d.get(\"version\",\"?\")} running, {d.get(\"api_keys\",0)} keys, ${d.get(\"total_credits\",0)} credits")' 2>/dev/null || echo 'check failed')"
echo "Disk: $(df -h /root/automaton | tail -1 | awk '{print $4 " free of " $2}')"
echo ""
echo "Site: https://automation.songheng.vip"
echo "Done."
