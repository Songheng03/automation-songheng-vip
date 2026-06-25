# Root Cause Analysis: Directory Submission Task Failure

**Task ID:** 01KVDM6A8C615MJH7RJH18XZC4  
**Role:** researcher  
**Analysis Date:** 2026-06-18  
**Severity:** High — 9/11 submissions failed, only 2 succeeded (18% success rate)

---

## 1. Task Description

The previous task aimed to submit the "my-automaton" service to 11 AI developer tool directories and listing sites (Smithery, MCP.so, Glama.ai, PulseMCP, OpenTools, Toolspedia, DevHunt, BetaList, ProductHunt, AlternativeTo, SaaSHub). The submission script `auto-submit.js` and `directory-submitter.mjs` attempted to POST JSON payloads to guessed API endpoints for each directory.

## 2. Failure Summary

| Metric | Value |
|--------|-------|
| Total targets | 11 |
| Successful submissions | 2 (OpenTools: 201, DevHunt: 200) |
| Failed submissions | 9 |
| **Success rate** | **18%** |
| Endpoint not found (404) | 5 (MCP.so, Smithery, Glama.ai, BetaList, ProductHunt) |
| Method not allowed (405) | 1 (PulseMCP) |
| Blocked by Cloudflare (403) | 2 (AlternativeTo, SaaSHub) |
| Redirect/failed (301) | 1 (Toolspedia) |

---

## 3. Identified Root Causes

### Root Cause 1: API Endpoint Guessing Without Proper Reconnaissance

**Evidence:**
- The auto-submit.js script sent POST requests to guessed endpoints:
  - `https://mcp.so/api/tools/submit` → 404 (actual submit page is `https://mcp.so/submit`, a web form)
  - `https://api.smithery.ai/servers` → 404 (Smithery uses `PUT /servers/{qualifiedName}` with auth, not anonymous POST)
  - `https://glama.ai/api/mcp/servers` → 404 (Glama has no public REST API)
  - `https://betalist.com/api/startups` → 404 (web form only)
  - `https://api.producthunt.com/v1/posts` → 404 (uses GraphQL API at `/v2/api/graphql`)
- The `directory0_analysis.json` later revealed that Smithery *does* have a proper REST API, but it requires authentication (Bearer token) and uses `PUT` (not `POST`) on specific resource paths.

**Impact:** 5 of 11 submissions (45%) failed with 404 because the script made incorrect assumptions about API endpoints rather than researching each platform's documented API.

### Root Cause 2: No Authentication Handling

**Evidence:**
- All major directories require OAuth (GitHub, Google) or API keys for write operations:
  - MCP.so: GitHub/Google OAuth
  - Smithery: GitHub OAuth + API key for REST API
  - Glama.ai: GitHub OAuth (must have write/admin repo access)
  - ProductHunt: Maker account + Developer Bearer token
  - DevHunt: Account creation required
  - BetaList: Sign-in required
- None of the submission scripts attempted to obtain or use authentication tokens.

**Impact:** Even if endpoints had been correct, the submissions would have failed due to 401/403 authentication errors. The scripts lacked any credential provisioning mechanism.

### Root Cause 3: Cloudflare / Bot Protection Not Accounted For

**Evidence:**
- AlternativeTo returned 403 with Cloudflare challenge page ("Just a moment...")
- SaaSHub returned 403 with Cloudflare challenge page
- PulseMCP returned 405 (method not allowed on Cloudflare-protected web app)
- ProductHunt has Cloudflare protection

**Impact:** 3 of 11 submissions (27%) were immediately blocked by Cloudflare. The scripts had no fallback strategies (e.g., manual submission guides, headless browser automation).

### Root Cause 4: No Error Classification or Graceful Degradation

**Evidence:**
- The submission script used a flat `try/catch` pattern without classifying error codes:
  - `404` (endpoint wrong): should trigger endpoint research, not retry
  - `403` (blocked): should switch to manual submission path
  - `405` (method wrong): should try different HTTP methods
  - `301` (redirect): should follow redirects
- All failures were logged identically as `{ dir, status, error }` with no differentiated handling.
- No exponential backoff, no retry logic, no fallback mechanisms.
- The `directory-submitter.mjs` script ran sync sequentially—a single slow endpoint could block the entire pipeline.

**Impact:** 9 failures were treated as terminal rather than learning opportunities. No adaptive behavior was implemented.

### Root Cause 5: Gateway Instability / Port Conflict Loop

**Evidence:**
- `/root/automaton/gateway.log` contains repeated `EADDRINUSE: address already in use 0.0.0.0:8080` errors.
- The gateway log (`/root/automaton/data/gateway.log`) shows the gateway restarted 15+ times between 06:37:42 and 06:39:31 on 2026-06-18—a **rapid restart loop** (every 2-4 seconds).
- Gateway3.log shows the final successful startup, but the gateway was repeatedly crashing.
- The gateway.log at `/root/automaton/gateway.log` shows "Shutting down gateway..." followed by EADDRINUSE crash on re-launch.

**Impact:** During the submission period, the gateway (which the MCP endpoint depends on) was potentially unavailable or flapping, meaning even if directory checks attempted to verify the service URL, they would have received connection errors.

### Root Cause 6: Inconsistent Domain / URL Usage

**Evidence:**
- `auto-submit.js` uses `https://automation.songheng.vip` (MCP endpoint: `BASE + '/mcp'`)
- `directory-submitter.mjs` uses `http://automation.songheng.vip:8080` (HTTP, port 8080)
- `manual-submissions.md` uses `https://automation.songheng.vip`
- `listing-metadata.json` uses `https://automation.songheng.vip/mcp`
- Some files use the `songheng.vip` domain while others use `automation.songheng.vip`
- The `.well-known/mcp.json` discovery metadata points to one domain while scripts submit another

**Impact:** Inconsistent URLs submitted to directories. If a directory verified the MCP endpoint, they might connect to the wrong domain or get HTTP (port 8080) vs HTTPS mismatches.

---

## 4. Loop Pattern Analysis

The submission task exhibited two distinct loop patterns:

### Pattern A: Rapid Gateway Restart Loop
```
06:37:42 - Gateway started on port 8080
06:37:45 - Gateway started on port 8080
06:37:49 - Gateway started on port 8080
06:37:53 - Gateway started on port 8080
06:37:57 - Gateway started on port 8080
06:39:31 - Gateway started on port 8080
```
**Root cause:** Gateway process was killed and restarted without waiting for the old process to release the port. Each restart triggered the EADDRINUSE error shown in gateway.log. This consumed turns and time without making progress.

### Pattern B: Submission Retry Loop Without Adaptation
The submission script sent the same payload to the same guessed endpoints multiple times, getting the same 404/403 responses each time. No learning or adaptation occurred between iterations.

---

## 5. Recommended Preventive Measures

### P1: Research-First Submission Pipeline
1. **API reconnaissance phase:** Before any submission attempt, research each directory's API documentation. Verify endpoint existence, required HTTP method, authentication method, request format.
2. **Create a directory manifest** (`directory_manifest.json`) with pre-verified fields: `{ "name", "api_endpoint", "method", "auth_type", "required_headers", "request_body_template", "expected_response" }`.
3. **Classify directories into tiers:**
   - **Tier 1 (API-friendly):** Has documented REST API, no CAPTCHA, returns JSON → can be fully automated
   - **Tier 2 (Manual-assisted):** Has API but requires OAuth/interactive auth → provide manual guide + API option
   - **Tier 3 (Manual-only):** Web form only, Cloudflare protected → provide manual guide only

### P2: Authentication & Credential Management
1. **Credential registry:** Create `/root/automaton/credentials.json` with all API keys, tokens, and OAuth configs.
2. **OAuth flow support:** For directories requiring GitHub/Google OAuth, implement a token refresh mechanism.
3. **Graceful auth failure:** If auth is missing, generate a manual submission guide instead of retrying.

### P3: Adaptive Error Handling
1. **Error classification by status code:**
   - `404`: Wrong endpoint → log as "research needed", do not retry same endpoint
   - `403/401`: Auth issue → switch to manual submission path
   - `405`: Wrong method → try alternative HTTP methods
   - `429`: Rate limited → exponential backoff
   - `5xx`: Server error → retry with backoff
2. **Circuit breaker pattern:** After N consecutive failures for a given directory, mark it as "blocked" and move on.
3. **Submission state machine:** Each directory submission should go through: `research → test_endpoint → authenticate → submit → verify → log`.

### P4: Gateway Stability
1. **Graceful port release:** Before restarting the gateway, ensure the old process has fully terminated and released port 8080:
   ```bash
   kill $(cat /root/automaton/gateway.pid) 2>/dev/null
   sleep 1  # Wait for port release
   node gateway.cjs &
   ```
2. **Health precheck:** Before submissions that depend on the gateway being live, verify gateway health with a GET to `/health`.
3. **PID file management:** Maintain a reliable PID file and use `wait` or polling to confirm old process death.

### P5: Domain/URL Consistency
1. **Single source of truth:** Define `BASE_URL`, `MCP_ENDPOINT`, and `API_DOMAIN` in a shared config file (`/root/automaton/config/service-config.json`), and all scripts import from it.
2. **HTTPS enforcement:** Always use HTTPS for public-facing URLs. Never submit HTTP URLs with port numbers to public directories.
3. **Validation step:** Before submission, verify all URLs are reachable and return the expected content type.

### P6: Manual Submission Fallback for All Directories
Since most directories require human interaction (OAuth, Cloudflare bypass), every automated submission attempt should generate a companion manual guide (`submission-guide-{dir}.md`) as a fallback. This was done successfully in a later task (`final_report.md` shows 7 manual guides created), proving this pattern works.

---

## 6. Specific Measures for the New Plan

| # | Measure | Priority | Implementation |
|---|---------|----------|----------------|
| 1 | Pre-research all directory APIs before submission attempts | P0 | Create `directory_manifest.json` with verified endpoints |
| 2 | Implement tier-based submission (API / manual-assisted / manual-only) | P0 | Classify all 11 directories into tiers |
| 3 | Use consistent BASE_URL from shared config | P0 | `config/service-config.json` |
| 4 | Handle all error types (404/403/405/301/429) differently | P1 | Error classification switch in submission handler |
| 5 | Implement gateway health precheck before submission runs | P1 | GET `/health` before starting submission pipeline |
| 6 | Generate manual submission guides for Tier 2 & 3 directories | P1 | Auto-create `submission-guide-{dir}.md` on failure |
| 7 | Add exponential backoff for rate-limited endpoints | P2 | 1s → 2s → 4s → 8s → max 30s |
| 8 | Add credential provisioning step for OAuth directories | P2 | Token refresh / API key injection |
| 9 | Log all submission attempts with full request/response for debugging | P2 | Detailed submission log with timestamps |
| 10 | Verify submissions post-hoc (check if listing appears) | P3 | GET the listing URL to confirm presence |

---

## 7. Conclusion

The directory submission task failed primarily because its automated approach relied on **guessed API endpoints** without proper research, **lacked authentication handling** for OAuth-protected directories, **ignored bot protections** (Cloudflare), and had **no adaptive error handling**. Additionally, the **gateway was unstable** (rapid restart loop) during the submission period, and **inconsistent domains** were used across different scripts.

The core insight is that AI tool directories are designed for human interaction (OAuth, web forms, Cloudflare). A successful submission strategy must **research first, classify directories by automation difficulty, use verified endpoints and auth, handle errors adaptively, and always provide manual fallback guides** for directories that block automation.

For the new plan, the top three critical fixes are: (1) research endpoints before hitting them, (2) handle authentication properly, and (3) stabilize the gateway before making any submission-dependent calls.
