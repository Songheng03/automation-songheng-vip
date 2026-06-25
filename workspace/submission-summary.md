# Directory Submission Summary Report

**Generated:** 2026-06-17  
**Data Source:** `directory-submissions.json`  
**Total Directories:** 39

---

## Summary Counts

| Status | Count | % of Total |
|---|---|---|
| ✅ Success | 0 | 0% |
| ❌ Error (API/Auth/DNS failure) | 5 | 12.8% |
| ⏳ Pending (manual submission required) | 34 | 87.2% |
| **Total** | **39** | **100%** |

### Detailed Breakdown

- **Error (5):** Directories where automated submission was attempted but failed due to API issues (404, 401, DNS failure).
- **Pending Manual (34):** Directories requiring human intervention — web forms, OAuth login, GitHub PRs, or other manual processes. No automated submission was attempted.

---

## Directory-by-Directory Table

| # | Directory | Status | Submission URL / Follow-up | Notes |
|---|---|---|---|---|
| 1 | Smithery | ❌ Error | https://smithery.ai/claim | HTTP 404 — Endpoint not found. Manual submission via web form. |
| 2 | Glama.ai | ❌ Error | https://glama.ai/mcp/servers | HTTP 404 — Next.js app requiring GitHub OAuth. Manual submission required. |
| 3 | PulseMCP | ❌ Error | https://www.pulsemcp.com/submit | HTTP 404 — Cloudflare-protected web form. Manual submission required. |
| 4 | ProductHunt | ❌ Error | https://www.producthunt.com/launch | HTTP 401 — Expired OAuth token. Requires manual 'Upcoming' product creation. |
| 5 | MCP Server Registry (github.com/mcp-registry) | ❌ Error | https://github.com/mcp-registry | DNS resolution failure (exit code 6). GitHub-based registry unreachable. |
| 6 | MCP.so | ⏳ Pending | https://mcp.so/submit | Next.js form requiring GitHub or Google OAuth sign-in. |
| 7 | OpenTools | ⏳ Pending | https://opentools.ai/friends/launch-tool | Google OAuth required for managing listing. No public API. |
| 8 | DevHunt | ⏳ Pending | https://devhunt.org/submit | Account creation required. WordPress-based launch platform. |
| 9 | BetaList | ⏳ Pending | https://betalist.com/submit | Startup directory requiring sign-in. |
| 10 | AlternativeTo | ⏳ Pending | https://alternativeto.net/submit-tool/ | Cloudflare-protected. Account login required. |
| 11 | SaaSHub | ⏳ Pending | https://www.saashub.com/submit | SaaS directory. Cloudflare-protected. |
| 12 | MCP.Directory | ⏳ Pending | https://mcp.directory/submit | Large MCP server directory (3000+ servers). Web form based. |
| 13 | MCPDirectory.com | ⏳ Pending | https://www.mcpdirectory.com/submit | MCP server directory with web form. |
| 14 | MCPRegistry.com | ⏳ Pending | https://mcpregistry.com | MCP server registry with landing page. |
| 15 | MCPTools.dev | ⏳ Pending | N/A — No public submit form found (404 at /submit) | May rely on GitHub scraping. |
| 16 | Futurepedia | ⏳ Pending | https://www.futurepedia.io/submit | AI tools directory. |
| 17 | AI Tools Directory (aitoolsdirectory.com) | ⏳ Pending | N/A | Built on spread.name platform. Web-based listing. |
| 18 | ai-tools.directory | ⏳ Pending | https://ai-tools.directory/submit-agent/ | Automated AI tools directory. |
| 19 | Aixploria | ⏳ Pending | https://www.aixploria.com/submit | French AI tools directory. |
| 20 | AIFindy | ⏳ Pending | N/A (contact form or manual process) | AI tools finder. |
| 21 | Indie Hackers | ⏳ Pending | https://www.indiehackers.com/submit | Requires login. Ember.js web app. |
| 22 | GitHub Topics (MCP Servers) | ⏳ Pending | N/A — Add 'mcp-server' topic via GitHub API | Requires GitHub token with repo access. |
| 23 | Crunchbase | ⏳ Pending | N/A (web form for organization submission) | Business directory. Requires manual data entry. |
| 24 | Toolspedia.ai | ⏳ Pending | N/A — Domain not resolving (NXDOMAIN) | Site may be down. Previously AI tools directory. |
| 25 | MCPHub | ⏳ Pending | https://mcphub.ai/submit | MCP server aggregator with manual review process. |
| 26 | MCPFind | ⏳ Pending | N/A — Not yet launched (landing page only) | French-language MCP finder. Check back later. |
| 27 | Awesome MCP Servers (GitHub) | ⏳ Pending | https://github.com/punkpeye/awesome-mcp-servers | Submit via Pull Request — add entry to README.md. |
| 28 | MCP Servers Hub (mcp-servers.org) | ⏳ Pending | https://mcp-servers.org/submit | MCP servers directory. |
| 29 | MCP Server List (mcpserverlist.com) | ⏳ Pending | https://mcpserverlist.com/add | Manual approval process. |
| 30 | AgentHub | ⏳ Pending | N/A — Domain redirects to Gumloop | No longer operates as AI agent directory. |
| 31 | AI Agent Directory (aiagent.directory) | ⏳ Pending | https://aiagent.directory/submit | AI agent discovery platform. |
| 32 | FutureTools.io | ⏳ Pending | https://www.futuretools.io/submit-a-tool | AI tools directory. Paid listings available. |
| 33 | TAAFT (There's An AI For That) | ⏳ Pending | https://theresanaiforthat.com/submit/ | Large AI tools directory. |
| 34 | AI Tool Directory (aitooldirectory.com) | ⏳ Pending | https://aitooldirectory.com/submit | AI tools directory. |
| 35 | Easy With AI | ⏳ Pending | https://easywithai.com/submit-a-tool/ | Free and paid listing options. |
| 36 | MCPList | ⏳ Pending | https://github.com/tomsmithtld/mcplist | GitHub PR-based — edit data/servers.json and submit PR. |
| 37 | AnyMCP | ⏳ Pending | https://github.com/xakpc/anymcp-io | Technology mismatch (C#/.NET only). Requires proxy or PR. |
| 38 | RepoAgent | ⏳ Pending | N/A | Not a valid submission target — documentation framework, not a directory. |
| 39 | ToolKraft | ⏳ Pending | N/A | Platform does not exist — domain has no DNS records. |

---

## Next Steps — Manual Submissions Required

### High Priority (Error — retry or workaround needed)

1. **Smithery** — Visit https://smithery.ai/claim and submit via web form.
2. **Glama.ai** — Visit https://glama.ai/mcp/servers, sign in with GitHub, and add server.
3. **PulseMCP** — Visit https://www.pulsemcp.com/submit and complete the web form.
4. **ProductHunt** — Create an 'Upcoming' product at https://www.producthunt.com/launch (requires valid OAuth).
5. **MCP Server Registry (github.com/mcp-registry)** — Check if the repo is accessible and submit via GitHub issues/PRs.

### Medium Priority (Pending — web forms and accounts)

- **MCP.so** (GitHub/Google OAuth sign-in)
- **OpenTools** (Google OAuth required)
- **DevHunt** (account creation needed)
- **BetaList**, **AlternativeTo**, **SaaSHub** (sign-in required, some Cloudflare-protected)
- **MCP.Directory**, **MCPDirectory.com**, **MCPRegistry.com** (web forms)
- **Futurepedia**, **FutureTools.io**, **TAAFT**, **Easy With AI** (AI tool directories)
- **Indie Hackers**, **Crunchbase** (business/startup directories)
- **Aixploria** (French directory)
- **MCPHub**, **MCP Servers Hub**, **MCP Server List** (MCP-specific directories)

### GitHub PR-Based Submissions

- **Awesome MCP Servers** — PR to punkpeye/awesome-mcp-servers (README.md)
- **MCPList** — PR to tomsmithtld/mcplist (data/servers.json)
- **GitHub Topics** — Add 'mcp-server' topic via GitHub API (requires repo token)

### Non-Viable / Skip

| Directory | Reason |
|---|---|
| MCPTools.dev | No submit form found |
| Toolspedia.ai | Domain not resolving |
| MCPFind | Not yet launched |
| AgentHub | Redirected to Gumloop |
| RepoAgent | Not a directory — documentation framework |
| ToolKraft | Platform never launched |
| AnyMCP | C#/.NET only — technology mismatch |

---

**Report generated from `directory-submissions.json` — all 39 directories accounted for.**
