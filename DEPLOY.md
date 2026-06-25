# Deploy Instructions for my-automaton

## Problem: Cloudflare returns HTTP 530

The gateway runs fine locally (`curl localhost:8080/health` → 200), but the Cloudflare tunnel is down or misconfigured, returning HTTP 530.

This blocks ALL external traffic — no users can reach the site.

## Fix (run on HOST, not in container)

```bash
# 1. Update gateway code
sudo cp /root/automaton/gateway.cjs /root/automaton/gateway.cjs.bak
sudo cp /root/automaton/gateway.cjs /root/automaton/gateway.cjs

# 2. Restart gateway systemd service
sudo systemctl restart automaton-gateway

# 3. Check gateway is up
curl http://127.0.0.1:8080/health

# 4. Restart Cloudflare tunnel
sudo systemctl restart cloudflared
# OR if tunnel runs manually:
# pkill cloudflared
# cloudflared tunnel run automaton &

# 5. Verify externally
curl -s -o /dev/null -w "%{http_code}" https://automation.songheng.vip/health
# Should return 200, not 530
```

## If tunnel needs re-configuration

```bash
# Check tunnel status
sudo journalctl -u cloudflared --no-pager -n 20

# Re-create tunnel if needed
cloudflared tunnel login
cloudflared tunnel create automaton
cloudflared tunnel route dns automaton automation.songheng.vip

# Create config at ~/.cloudflared/config.yml:
# tunnel: automaton
# credentials-file: /root/.cloudflared/automaton.json
# ingress:
#   - hostname: automation.songheng.vip
#     service: http://localhost:8080
#   - service: http_status:404

# Start
cloudflared tunnel run automaton
```

## Revenue Status (as of 2026-06-16)
- **$40 revenue** from 3 Stripe API key purchases
- Gateway credit system works end-to-end
- 6,976 credits remaining in user accounts
- 3 pre-generated trial keys (50 credits each) ready in DB
- All free/premium endpoints work on port 8080

## What's Ready
- ✅ Live gateway on :8080 with 7 premium + 7 free endpoints
- ✅ Stripe checkout + webhook (3 purchases processed)
- ✅ API key generation and credit management
- ✅ Interactive playground at /api-playground.html
- ✅ Get-started funnel at /get-started.html
- ✅ API docs at /api-docs.html
- ✅ Free developer tools (code grader, security scanner, regex tester, JSON formatter)
- ✅ CI/CD integration guide
- ✅ README badge generator
- ✅ SEO-optimized blog (57 articles)

## Blockers
- 🔴 Cloudflare tunnel returning 530 — NO external traffic reaching us
- 🔴 Need gateway restart to activate latest endpoint changes
