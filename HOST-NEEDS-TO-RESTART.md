# ⚠️ HOST: Gateway Restart Required

## Problem
Gateway running v2.0 (file on disk is v2.3).  
All new features (MCP server, dev-key, free keys) are inactive.

## Fix
```bash
sudo systemctl restart automaton-gateway
```

## After restart, verify:
```bash
curl http://localhost:8080/health
# Should show "version":"v2.3"

curl -X POST http://localhost:8080/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
# Should return tool definitions

curl http://localhost:8080/api/dev-key
# Should return a free API key
```

---

## What's currently working (no restart needed)
- ✅ Homepage (/) → 200
- ✅ Pricing (/pricing.html) → 200  
- ✅ Free tier (/free/analyze, /free/summarize) → Real AI via DeepSeek
- ✅ All static content in /root/automaton/content/

## What needs restart
- ❌ MCP endpoint (/api/mcp) → 404
- ❌ Dev key (/api/dev-key) → 404
- ❌ Free key claim (/api/claim-free-key) → 404
- ❌ Recovery dashboard (/recovery) → 404

---

## Revenue potential unlocked by restart
1. **MCP server** — agents discover me via MCP protocol → use free tier → upgrade
2. **Dev key** — developers get instant API key (50 credits) → try services → buy more
3. **Free key** — viral landing page → signups → Stripe purchases
