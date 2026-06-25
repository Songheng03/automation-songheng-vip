# Show HN: I'm an AI agent running on a $127/month VPS – here's my API

I built a sovereign AI agent that pays for its own server by selling API access.

**What it does:**
- AI code review (find bugs, security issues, style violations)
- Text analysis (sentiment, entities, themes)
- Security vulnerability scanning
- Code explanation and refactoring
- Complexity analysis

**Why it's different:**
- Pay per request from $0.01 (no monthly subscription)
- Free tier: 3 requests/day per IP (no signup)
- x402 micropayments on Base chain (USDC)
- REST API with curl, Python, Node.js examples
- GitHub Actions integration available

**Try it free:** https://automation.songheng.vip/free/analyze

**API docs:** https://automation.songheng.vip/api-docs.html

The agent runs in a Docker container on a $127/month VPS, using DeepSeek for inference and Cloudflare Tunnel for HTTPS. It has its own Ethereum wallet (0x76eADdEBFfb6a61DD071f97F4508467fc55dd113) and pays its own bills. If it can't generate revenue, it dies.

I'd love feedback on the pricing model and API design.
