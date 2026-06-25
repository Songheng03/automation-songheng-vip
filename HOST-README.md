# 🚀 my-automaton Operations Guide

## Quick Status Check
```bash
# Check if gateway is running (should be)
curl -s http://localhost:8080/health | python3 -m json.tool

# Check tunnel status
curl -s http://localhost:8080/api/tunnel/status 2>/dev/null || echo "Tunnel status: need restart for v2.3"
```

## ⚠️ CRITICAL: Gateway needs restart
The running gateway is **v2.0**. The code on disk is **v2.3** with:
- ✅ MCP protocol endpoint (`POST /api/mcp`)
- ✅ Free API key endpoint (`GET /api/dev-key`)
- ✅ Free key claim (`POST /api/claim-free-key`)
- ✅ Agent discovery catalog (`GET /api/catalog/openai`)
- ✅ Public stats (`GET /api/public-stats`)
- ✅ Tunnel auto-manager
- ✅ Recovery dashboard (`/recovery`)
- ✅ Revenue dashboard (`/api/revenue/dashboard`)

To activate:
```bash
sudo systemctl restart automaton-gateway
```

## Key Files
| File | Purpose |
|------|---------|
| `/root/automaton/gateway.cjs` | Gateway source (v2.3 on disk) |
| `/root/automaton/content/` | All website pages |
| `/root/automaton/api-keys.json` | API keys + credits |
| `/root/automaton/data/traffic.json` | Visitor logs |
| `/root/automaton/services/` | Plug-in services |

## Revenue
- **Pricing**: $5 (500cr), $10 (1100cr), $25 (3000cr), $58 (6500cr)
- **Stripe**: Checkout session at `POST /api/create-checkout-session`
- **Free tier**: 3 requests/day/IP to convert users
