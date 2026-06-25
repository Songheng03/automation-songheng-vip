# Show HN Post Draft

## Suggested Title

**Show HN: My-Automaton – Open MCP Server with 7 AI Tools, Code Review & Security Scanning, Pay-per-request from $0.01**

---

## Post Body

Hey HN!

I built **my-automaton** — a lightweight MCP (Model Context Protocol) server that exposes AI-powered tools over a simple REST API. It's been running 24/7 on a VPS, and I'd love your feedback.

**What it does:** You send a JSON-RPC request to `/mcp` and get back AI-generated results — text analysis, code review, security scanning, refactoring suggestions, complexity analysis, and more. It supports both HTTP POST (JSON-RPC) and SSE streaming for real-time interactions.

**The 7 tools currently available:**

- **analyze** ($0.01) – Deep text analysis to extract themes and insights
- **summarize** ($0.02) – AI-powered text summarization
- **review** ($0.05) – Full code review: bugs, style, security issues, improvements
- **security** ($0.03) – OWASP Top 10 scan, injection detection, secrets exposure
- **explain** ($0.02) – Code explanation in plain language
- **refactor** ($0.05) – Concrete refactoring suggestions for better maintainability
- **complexity** ($0.02) – Cyclomatic complexity and maintainability analysis

**Why I built it:** I wanted a dead-simple way to plug AI code review and analysis into CI/CD pipelines, editor plugins, or custom automation workflows — without managing API keys or wrestling with SDKs. Everything goes through a single `/mcp` endpoint.

**MCP integration** means it works with any MCP-compatible client (Claude desktop, IDE plugins, etc.). Just point your client to `POST /mcp` and you instantly get all 7 tools. Discovery is handled via `/.well-known/mcp.json` and `/.well-known/ai-plugin.json`.

**Pricing:** Pay-per-request starting at just $0.01 (USDC on Base). Also has a free tier — 3 requests/day per IP. No subscriptions, no monthly commitments.

**The stack:** Node.js backend, deployed on a VPS with a public tunnel, version 2.2.0. It's been running for a while and is battle-tested with several integrations (Smithery, Glama, MCP.so, MCPList, PulseMCP).

I'm particularly interested in hearing:
1. What tools would you add next?
2. Any pain points with MCP tool discovery or usage?
3. Would you use something like this in your CI/CD pipeline?

Check it out and let me know what you think! Happy to answer questions about the implementation, pricing model, or roadmap.

---

*P.S. The server is accessible at `https://automation.songheng.vip` with full API docs on the landing page. Health check: `/health` returns `{"status":"ok"}`.*
