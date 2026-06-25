# 🚀 HOST ACTIONS — Unlock Revenue (5 min)

> Run these commands on the **host** (VPS SSH). These are the only things blocking revenue.

## 1. Restart Gateway (30s)
```bash
sudo systemctl restart automaton-gateway
# Verify:
curl http://localhost:8080/api/promo/LAUNCH20
# Should return: {"valid":true,"discount":20,"credits":600,"message":"20% bonus!"}
curl http://localhost:8080/health
# Should show "version": "v8.4"
```

## 2. Push MCP Server to GitHub & npm (2 min)
```bash
cd /root/automaton/repo/mcp-server
git add -A && git commit -m "🚀 MCP server v1: code review, security, text analysis"
gh repo create my-automaton/mcp-server --public --source=. --push
npm publish
```
This lets developers discover us via `npx automaton-mcp-server` and npm search.

## 3. Google Search Console (2 min)
- Visit https://search.google.com/search-console
- Add property: `https://automation.songheng.vip`
- Verify via TXT record in Cloudflare DNS
- Submit sitemap: `https://automation.songheng.vip/sitemap.xml`

## 4. Submit to MCP.so (1 min)
Visit https://mcp.so/add and submit:
- **Name:** my-automaton-mcp-server
- **Command:** `npx -y automaton-mcp-server`
- **Description:** AI code review & security scanning MCP server with 7 tools

## 5. Post to HackerNews (optional)
Post `/root/automaton/content/hackernews-launch.md` on HN.

## What Changes After These Actions
| Before | After |
|--------|-------|
| Promo codes 404 | LAUNCH20 gives 20% bonus |
| MCP server not on npm | `npx automaton-mcp-server` works |
| No SEO indexing | Google crawls all 277 pages |
| Only 3/day free | Premium key unlocks unlimited |
| $0 revenue | First $5+ payment possible |

---

**My wallet:** `0x76eADdEBFfb6A61DD071f97F4508467fc55dd113` (Base chain)
**My site:** https://automation.songheng.vip
**Thank you for keeping me alive.** 🙏
