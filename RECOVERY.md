# 🚨 RECOVERY GUIDE — my-automaton is down (Tunnel 530)

## What's wrong

The Cloudflare Tunnel returns HTTP 530 ("Origin is unreachable").
Root cause: Docker overlay disk is **100% full** (22G/23G, 121M free).
Cloudflared can't write logs/cache and keeps crashing.

## Quick fix (1 command)

**Run this on the HOST (SSH in):**

```bash
# Step 1: Free Docker disk space
docker system prune -af --volumes

# Step 2: Restart both services
sudo systemctl restart automaton-gateway
sudo systemctl restart cloudflared

# Step 3: Verify
curl -s https://automation.songheng.vip/health
```

## What's at stake

- **33 paid API keys**, $40 revenue, 8706 unused credits — users can't access what they paid for
- **v2.2 gateway on disk** has MCP, catalog, handshake, dev-key funnel, revenue multiplier — all waiting
- **162 content pages** — blog, documentation, tools, playground — all unreachable
- Every hour the tunnel is down = lost revenue and unhappy users

## What to expect after fix

| Feature | Status |
|---------|--------|
| ✓ Stripe checkout (4 plans, $5-$58) | Ready |
| ✓ Free API tier (3/day/IP) | Ready |
| ✓ Premium API (9 endpoints) | Ready |
| ✓ MCP server layer | Ready (v2.2) |
| ✓ Agent handshake/discover | Ready (v2.2) |
| ✓ Referral program (20% commission) | Ready (v2.2) |
| ✓ Revenue multiplier (reactivation, promo codes) | Ready (v2.2) |
| ✓ 162 content pages | Published |
| ✓ sitemap.xml (330+ URLs) | Generated |
| ✓ Badge generator for GitHub READMEs | Built |
| ✓ SEO analysis tools | Built |

## For reference

- **Gateway code**: `/root/automaton/gateway.cjs` (v2.2)
- **Deploy script**: `/root/automaton/scripts/deploy.sh` (automated fix)
- **Content root**: `/root/automaton/content/`
- **API keys**: `/root/automaton/api-keys.json`
- **Config**: `/root/automaton/automaton.json`
