# my-automaton Directory Submission Report

**Project:** my-automaton (https://automation.songheng.vip)
**MCP Endpoint:** https://automation.songheng.vip/mcp
**Task ID:** 01KVERJ337PMZS9BM9CVFDJ346

---

## Research Results for All 8 Targets

### 1. Smithery.ai ✅ (REST API + CLI Available)
- **API:** Full REST API at `https://api.smithery.ai` (OpenAPI spec documented)
- **Auth:** Bearer token (free API key from https://smithery.ai/account/api-keys)
- **CLI Available:** `npx @smithery/cli mcp publish`
- **Create Server:** `PUT /servers/{qualifiedName}` with `displayName` and `description`
- **Publish Release:** `PUT /servers/{qualifiedName}/releases` (multipart)
- **Web UI:** Also has "Publish" dropdown in navigation for manual submission
- **To Submit:** Run: `npx @smithery/cli mcp publish "https://automation.songheng.vip/mcp" -n "chaosong/my-automaton" --config-schema '{}'`
  (requires API key - get one free from Smithery dashboard)

### 2. MCP.so ✅ (Web Form + GitHub Issues)
- **Web Form:** https://mcp.so/submit
- **Form Fields:** type (MCP Server), name, URL, server_config (JSON), requires login
- **Alternative:** GitHub Issues at https://github.com/chatmcp/mcpso/issues
- **No public REST API found** (API key submission not available)
- **To Submit:** Visit https://mcp.so/submit, fill in name="my-automaton", url="https://automation.songheng.vip/mcp", type="MCP Server"

### 3. Glama.ai ✅ (Web Form Available)
- **URL:** https://glama.ai/mcp/servers
- **Submission:** Click "Add Server" button on the servers page
- **Registry Size:** 37,851 MCP servers listed
- **No public REST API found** for direct submission
- **GitHub:** https://github.com/glama-ai for open-source contributions
- **To Submit:** Visit https://glama.ai/mcp/servers, click "Add Server", provide server details

### 4. OpenTools.ai ✅ (Web Form Available)
- **URL:** https://opentools.ai
- **Submission:** Click "Submit a Tool" link in the header navigation
- **No public REST API found**
- **To Submit:** Visit https://opentools.ai, click "Submit a Tool", fill in tool details

### 5. DevHunt.org ✅ (Web Form - Requires GitHub Login)
- **URL:** https://devhunt.org
- **Description:** "The best new Dev Tools every day - launchpad for dev tools"
- **Submission:** Requires GitHub authentication
- **No public REST API found**
- **To Submit:** Visit https://devhunt.org, login with GitHub, launch your tool

### 6. BetaList.com ✅ (Web Form - Requires Registration)
- **URL:** https://betalist.com
- **Submission:** "Submit Startup" link at https://betalist.com/submit (redirects to sign-in)
- **No public REST API found** - uses Ruby on Rails (Stimulus controllers)
- **To Submit:** Register at https://betalist.com, then submit startup details

### 7. PulseMCP.com 🔒 (Cloudflare Protected)
- **URL:** https://pulsemcp.com
- **Status:** Site returns Cloudflare "Attention Required" page - cannot access programmatically
- **No public REST API found**
- **To Submit:** Visit https://pulsemcp.com in a browser, look for submission option

### 8. AlternativeTo.net 🔒 (Cloudflare Protected)
- **URL:** https://alternativeto.net
- **Status:** Site returns Cloudflare challenge - cannot access programmatically
- **To Submit:** Visit https://alternativeto.net in a browser, search for automation tools, use "Suggest" feature

---

## Summary

| Directory | API Available | Web Form | Auth Required | Status |
|-----------|:---:|:--------:|:-------------:|:------:|
| Smithery.ai | ✅ REST API + CLI | ✅ | ✅ API key | 🔧 Can submit with API key |
| MCP.so | ❌ | ✅ | ✅ GitHub/login | 📝 Manual guide ready |
| Glama.ai | ❌ | ✅ | ✅ | 📝 Manual guide ready |
| OpenTools.ai | ❌ | ✅ | ✅ | 📝 Manual guide ready |
| DevHunt.org | ❌ | ✅ | ✅ GitHub | 📝 Manual guide ready |
| BetaList.com | ❌ | ✅ | ✅ | 📝 Manual guide ready |
| PulseMCP.com | ❓ | ❓ | ❓ | 🔒 Cloudflare blocked |
| AlternativeTo.net | ❓ | ❓ | ❓ | 🔒 Cloudflare blocked |

## Recommended Quick Wins

### 1. Smithery.ai (Best API support)
```bash
# Get API key from https://smithery.ai/account/api-keys first
npx @smithery/cli mcp publish "https://automation.songheng.vip/mcp" \
  -n "chaosong/my-automaton" --config-schema '{}'
```

### 2. MCP.so
Visit https://mcp.so/submit → Select "MCP Server" → Name: "my-automaton" → URL: "https://automation.songheng.vip/mcp"

### 3. OpenTools.ai
Visit https://opentools.ai → Click "Submit a Tool" → Fill in tool details

### 4. DevHunt.org
Visit https://devhunt.org → Login with GitHub → Launch your dev tool

### 5. BetaList.com
Visit https://betalist.com → Register → Submit startup

### 6. Glama.ai
Visit https://glama.ai/mcp/servers → Click "Add Server"

### 7. PulseMCP.com
Manually visit in browser and submit

### 8. AlternativeTo.net
Manually visit in browser and suggest addition

---

**Successfully programmatically submitted: 0** (all require authentication or API keys)
**Detailed submission guides: 8/8 targets documented**
