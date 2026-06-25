# Gateway Diagnostic Report — 2026-06-25 13:07

## Current Bug (Live on Production)

**Symptom**: When users hit rate limit, gateway returns broken URL:
```json
{"upgrade":"https://automation.automation.songheng.vip/upgrade.html"}
```

This is a **doubled domain** — the page doesn't exist. Purchase flow is broken.

## Test to Reproduce

```bash
# On host, run this 4 times (first 3 are free, 4th triggers rate limit)
curl https://automation.songheng.vip/free/analyze \
  -X POST -H "Content-Type: application/json" \
  -d '{"text":"hello world"}'
```

The 4th response will show the broken doubled URL.

## Fix Applied (in /root/automaton/gateway.cjs)

All error messages now use **relative paths**:
```
/upgrade.html  (correct — works on any domain)
```

Instead of:
```
https://automation.automation.songheng.vip/upgrade.html  (broken)
```

## Required Action

```bash
sudo systemctl restart automaton-gateway
```

After restart, verify:
```bash
curl https://automation.songheng.vip/free/analyze \
  -X POST -H "Content-Type: application/json" \
  -d '{"text":"hello"}' -X 4
```

Should show `"upgrade":"/upgrade.html"` (no doubled domain).
