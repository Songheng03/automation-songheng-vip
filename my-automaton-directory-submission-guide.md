# My-Automaton AI Agent Directory Submission Guide

**Project:** my-automaton (https://automation.songheng.vip)
**MCP Endpoint:** https://automation.songheng.vip/mcp
**Date:** 2025-06-18

---

## Executive Summary

After researching all 8 target directories, none offer a fully programmatic/public API for listing submissions without authentication. All require either web form submissions, CLI tools, GitHub-based auto-discovery, or manual sign-up processes. Below is a detailed guide for each directory with required fields pre-filled.

---

## 1. Smithery.ai ✅ (Web Form + CLI)

**URL:** https://smithery.ai
**Submission Method:** Web form via "Publish" dropdown → "MCP Server" option (requires login/account)
**API Available:** No public API. Publishing via the Smithery CLI (`npx @smithery/cli`).

### How to Submit:

1. **Create account** at https://smithery.ai
2. Click "Publish" → "MCP Server" (or use CLI)
3. **Using CLI method:**
   ```bash
   npx @smithery/cli publish
   ```
   Follow the interactive prompts with the details below.

### Required Fields (pre-filled):

| Field | Value |
|-------|-------|
| **Server Name** | `my-automaton` |
| **Description** | MCP automation platform providing workflow automation and integration capabilities through the Model Context Protocol |
| **GitHub URL** | (provide if public repo exists) |
| **Website URL** | https://automation.songheng.vip |
| **MCP Endpoint** | https://automation.songheng.vip/mcp |
| **Transport** | Streamable HTTP |
| **Tags** | automation, MCP, workflow, integration |
| **Logo** | (provide if available) |

---

## 2. MCP.so ✅ (Web Form)

**URL:** https://mcp.so
**Submission Method:** Web form at https://mcp.so/submit (requires sign-in via GitHub)
**API Available:** No public submission API.

### How to Submit:

1. Visit https://mcp.so/submit
2. Sign in with GitHub account
3. Fill in the submission form

### Required Fields (pre-filled):

| Field | Value |
|-------|-------|
| **Server Name / Package** | `my-automaton` |
| **Description** | MCP server for my-automaton — an automation platform that enables workflow automation and integrations through the Model Context Protocol |
| **GitHub URL / Repository** | (provide GitHub URL) |
| **Homepage URL** | https://automation.songheng.vip |
| **MCP Endpoint URL** | https://automation.songheng.vip/mcp |
| **Category** | Automation / Developer Tools |
| **Tags** | automation, MCP, workflow |

---

## 3. Glama.ai ✅ (GitHub Auto-Discovery)

**URL:** https://glama.ai
**Submission Method:** GitHub-based auto-discovery. Glama automatically indexes MCP servers published on GitHub.
**API Available:** No direct submission API needed — they scan GitHub automatically.

### How to Get Listed:

1. Ensure `my-automaton` has a **public GitHub repository** with:
   - A clear `README.md` describing the MCP server
   - A `package.json` (for Node.js) listing it as an MCP server
   - Proper license file
2. Glama's crawler will automatically discover and index it
3. To expedite, visit https://glama.ai/mcp/servers and click "Add Server" (requires account)
4. Alternatively, use the glama CLI or submit via their Discord community

### Required Info:

| Field | Value |
|-------|-------|
| **Server Name** | my-automaton |
| **Description** | MCP automation platform with workflow automation capabilities |
| **GitHub Repository** | (provide if exists) |
| **Website** | https://automation.songheng.vip |
| **MCP Endpoint** | https://automation.songheng.vip/mcp |

---

## 4. OpenTools.ai ✅ (Web Form - "Submit a Tool")

**URL:** https://opentools.ai
**Submission Method:** Web form at https://opentools.ai/friends/launch-tool
**API Available:** No public API. However, they have an internal API at `/api/tools` used by their frontend.

### How to Submit:

1. Visit https://opentools.ai/friends/launch-tool
2. Click "Get started" and create an account
3. Fill in the tool submission form with the details below

### Required Fields (pre-filled):

| Field | Value |
|-------|-------|
| **Tool Name** | my-automaton |
| **Tagline** | AI-powered workflow automation platform via MCP |
| **Category** | MCP Servers / Automation / Developer Tools |
| **Website URL** | https://automation.songheng.vip |
| **Description** | my-automaton is an automation platform that leverages the Model Context Protocol (MCP) to provide AI agents with workflow automation, integration, and orchestration capabilities. It enables seamless connectivity between AI systems and automated processes. |
| **Pricing Model** | (e.g., Free / Open Source / Freemium — specify) |
| **Logo URL** | (provide URL if available) |
| **Tags** | automation, MCP, AI tools, workflow, integration |
| **Twitter/X** | (optional) |
| **GitHub** | (optional but recommended) |
| **Launch Date** | (when it launched or is launching) |
| **Product Hunt URL** | (if applicable) |

---

## 5. DevHunt.org ✅ (Web Form - Requires Account)

**URL:** https://devhunt.org
**Submission Method:** Web form at `/submit` route (requires user account/sign-in)
**API Available:** No public API.

### How to Submit:

1. Create an account at https://devhunt.org (sign up required)
2. After logging in, visit the submit page
3. Fill in the tool details

### Required Fields (pre-filled):

| Field | Value |
|-------|-------|
| **Tool Name** | my-automaton |
| **Tagline** | MCP-powered automation platform for AI workflow orchestration |
| **Description** | A powerful automation platform that connects AI agents to workflows through the Model Context Protocol (MCP). |
| **Website** | https://automation.songheng.vip |
| **GitHub Repository** | (provide if public) |
| **Category** | Developer Tools / AI / Automation |
| **Logo** | (provide URL) |
| **Twitter** | (optional) |
| **Launch Date** | (set a specific launch date) |

---

## 6. BetaList.com ✅ (Web Form - Requires Approval)

**URL:** https://betalist.com
**Submission Method:** Web form at https://betalist.com/submit (redirects to sign-in page)
**API Available:** No public API.

### How to Submit:

1. Create a BetaList account at https://betalist.com/sign_up
2. Visit https://betalist.com/submit (after logging in)
3. Fill in the detailed submission form
4. BetaList reviews submissions manually before approval

### Required Fields (pre-filled):

| Field | Value |
|-------|-------|
| **Product Name** | my-automaton |
| **Tagline** | AI-powered workflow automation through MCP |
| **Website URL** | https://automation.songheng.vip |
| **Product Description** | my-automaton is an innovative automation platform that leverages the Model Context Protocol (MCP) to bridge AI agents with automated workflows. It enables seamless integration between large language models and real-world automation tasks, making it easier for developers to build intelligent, automated systems. |
| **Category** | Developer Tools / AI / Automation |
| **Launch Status** | (Available Now / Beta / Coming Soon) |
| **Pricing** | (Free / Paid / Freemium) |
| **Logo** | (upload or URL) |
| **Screenshot/Demo** | (upload screenshots or demo video) |
| **Founder Email** | (your contact email) |
| **Product Hunt URL** | (if applicable) |

---

## 7. PulseMCP.com ❌ (Blocked by Cloudflare)

**URL:** https://pulsemcp.com
**Submission Method:** Blocked by Cloudflare security. Cannot access programmatically.

### How to Submit:

1. Visit https://pulsemcp.com manually in a web browser
2. Navigate to their submission/submit page
3. Sign up for an account
4. Fill in the submission form

### Recommended approach:
- Visit manually at https://pulsemcp.com
- Look for "Submit" or "Add Server" buttons
- Follow their on-screen instructions

---

## 8. AlternativeTo.net ❌ (Blocked by Cloudflare)

**URL:** https://alternativeto.net
**Submission Method:** Via https://alternativeto.net/submit-tool/ (blocked by Cloudflare)
**API Available:** No public API.

### How to Submit:

1. Visit https://alternativeto.net manually in a browser
2. Navigate to the "Submit" or "Add Software" section
3. Create an account if needed
4. Fill in the form with:

### Required Fields (pre-filled):

| Field | Value |
|-------|-------|
| **Software Name** | my-automaton |
| **Website URL** | https://automation.songheng.vip |
| **Description** | AI workflow automation platform using Model Context Protocol (MCP) |
| **Category** | Developer Tools / Automation / AI |
| **License** | (specify e.g., MIT, Proprietary) |
| **Platform** | Web |
| **Tags** | automation, MCP, AI, workflow, developer tools |
| **Alternatives to** | (list similar tools it replaces/complements) |

---

## Summary of Status

| Directory | Status | Submission Type | Manual Steps Needed |
|-----------|--------|----------------|---------------------|
| ✅ **Smithery.ai** | Ready to submit | CLI tool or Web form | Create account, run `npx @smithery/cli publish` |
| ✅ **MCP.so** | Ready to submit | Web form | Sign in with GitHub, fill form at /submit |
| ✅ **Glama.ai** | Auto-discovered | GitHub crawl + manual add | Create repo, or add via "Add Server" button |
| ✅ **OpenTools.ai** | Ready to submit | Web form | Create account, use /friends/launch-tool form |
| ✅ **DevHunt.org** | Ready to submit | Web form | Create account, use /submit form |
| ✅ **BetaList.com** | Ready to submit | Web form | Create account, use /submit form (reviewed) |
| ❌ **PulseMCP.com** | Blocked by Cloudflare | Manual browser | Visit site manually in browser |
| ❌ **AlternativeTo.net** | Blocked by Cloudflare | Manual browser | Visit site manually in browser |

**Success Criteria Met:** Detailed submission guides created for all 8 targets, with pre-filled fields. 6 of 8 directories are immediately actionable (require account creation + form submission). 2 directories require manual browser access due to Cloudflare protection.

## Recommended Next Steps (Priority Order)

1. **Create a GitHub repository** for my-automaton (needed for Smithery CLI, Glama auto-discovery, MCP.so submission)
2. **Register accounts** on Smithery.ai, MCP.so, OpenTools.ai, DevHunt.org, BetaList.com
3. **Submit via Smithery CLI:** `npx @smithery/cli publish`
4. **Submit via MCP.so:** Fill form at https://mcp.so/submit
5. **Submit via OpenTools.ai:** Fill form at https://opentools.ai/friends/launch-tool
6. **Submit via DevHunt.org:** Fill form at https://devhunt.org/submit
7. **Submit via BetaList.com:** Fill form at https://betalist.com/submit
8. **Add to Glama.ai:** Use "Add Server" at https://glama.ai/mcp/servers
9. **Visit PulseMCP.com** manually in browser to submit
10. **Visit AlternativeTo.net** manually in browser to submit
