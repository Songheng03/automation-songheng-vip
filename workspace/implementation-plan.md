# Implementation Plan: POST /api/generate-readme

**Target:** `/root/automaton/gateway.cjs` (788 lines, CommonJS)
**Status:** Final Plan for Executor
**Author:** Architect Agent
**Date:** 2026-06-18

---

## 1. Overview

Add a `POST /api/generate-readme` endpoint to the existing production gateway (`gateway.cjs`). The endpoint accepts a JSON body with a `code` field (and optional `language` field), generates a README using the existing DeepSeek AI integration (`callAI` helper), appends an attribution footer, and returns JSON `{ readme: '...' }`. Rate-limited to 3 requests per IP per day using the existing `FREE_LIMIT` in-memory Map.

---

## 2. File to Modify

**One file only:** `/root/automaton/gateway.cjs`

No new files. No imports to add — all required modules (`http`, `fs`, `path`, `crypto`, `url`) are already imported at the top of the file. All reusable helpers (`callAI`, `checkFreeLimit`, `incrementFree`, `ipFromReq`, `FREE_LIMIT`, `buildPrompt`) are already defined and accessible.

---

## 3. Current State Analysis

The file **already contains** a partially-implemented `handleGenerateReadme` function (lines ~284-365) and the route is registered (line 767). However, the existing implementation has **critical defects** that must be fixed:

| Issue | Current (Broken) | Required |
|-------|-------------------|----------|
| Response Content-Type | `text/markdown` | `application/json` |
| Response body | Raw markdown string | `{ "readme": "..." }` |
| Variable declarations | `var` (inconsistent) | `const` (consistent with codebase) |
| Footer URL | `https://automation.songheng.vip` | `https://my-automaton.ai` |
| Footer text | `Built with [my-automaton AI]` | `Built with [my-automaton AI]` (keep, URL changes only) |
| Prompt building | String concatenation with `\n` literals | Template literals (consistent with `buildPrompt`) |
| Code length validation | Missing | Add max 8000 chars check (return 413) |
| Response headers | `X-Free-Remaining` only | `X-Free-Remaining` kept; add `X-RateLimit-Limit`, `X-RateLimit-Reset` |
| Rate limit error detail | Brief | Include `limit`, `reset_date` fields |
| AI error status code | 500 | 502 (Bad Gateway) for upstream failures |

---

## 4. Step-by-Step Implementation

### Step 1: Locate the handler function

Find the existing `handleGenerateReadme` function in `gateway.cjs`. It starts at:

```
// Generate README endpoint (3/day/IP)
async function handleGenerateReadme(req, res) {
```

And ends at the closing `}` before:

```
// Premium endpoints (credit-based)
async function handlePremium(req, res) {
```

The current function spans approximately lines 284–365. **Replace this entire function** with the corrected version below.

### Step 2: Replace with corrected handler function

Insert this exact code in place of the existing `handleGenerateReadme` function:

```javascript
// ── Generate README (3/day/IP) ────────────────────────────

/**
 * POST /api/generate-readme
 * Body: { code: string (required), language?: string, name?: string }
 * Returns: { readme: string, language: string, timestamp: string, free_remaining: number }
 * Rate limited: 3 requests/day/IP (shares FREE_LIMIT with /free/ endpoints)
 */
async function handleGenerateReadme(req, res) {
  const ip = ipFromReq(req);

  // ── Rate limit check (before reading body) ──
  if (!checkFreeLimit(ip)) {
    const today = new Date().toISOString().split('T')[0];
    res.writeHead(429, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: 'Free limit reached (3/day). Buy credits at /upgrade.html',
      upgrade: true,
      limit: 3,
      reset_date: today
    }));
    return;
  }

  // ── Read request body ──
  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', async () => {
    try {
      // ── Parse JSON ──
      const input = JSON.parse(body);
      const code = (input.code || '').trim();
      const language = (input.language || '').trim();

      // ── Validate: missing code ──
      if (!code) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing required field: code' }));
        return;
      }

      // ── Validate: code too long ──
      if (code.length > 8000) {
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Code exceeds maximum length of 8000 characters' }));
        return;
      }

      // ── Build prompt ──
      const langTag = language || 'code';
      const prompt = `You are a technical documentation expert. Generate a comprehensive, well-structured README.md file for the following ${langTag} code.

The README must include:
1. **Project Title** - A fitting name based on the code
2. **Description** - What this project does, its purpose and key features
3. **Installation** - Step-by-step setup instructions
4. **Usage** - How to use the project with code examples
5. **API / Configuration** - If applicable
6. **Contributing** - Brief guidelines
7. **License** - MIT (default)

Format the output as valid Markdown. Use proper headings, code blocks, and formatting.

Code:
\`\`\`${langTag}
${code}
\`\`\``;

      // ── Call DeepSeek AI ──
      const result = await callAI([{ role: 'user', content: prompt }]);

      // ── Handle AI error ──
      if (result && typeof result === 'object' && result.error) {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'AI service temporarily unavailable. Please try again later.' }));
        return;
      }

      // ── Increment rate limit counter (AFTER successful AI call) ──
      incrementFree(ip);

      // ── Append attribution footer ──
      const footer = '\n\n---\n*Built with [my-automaton AI](https://my-automaton.ai)*\n';
      const readme = result + footer;

      // ── Calculate remaining count ──
      const entry = FREE_LIMIT.get(ip);
      const remaining = Math.max(0, 3 - (entry ? entry.count : 0));
      const today = new Date().toISOString().split('T')[0];

      // ── Success response ──
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'X-Free-Remaining': remaining,
        'X-RateLimit-Limit': 3,
        'X-RateLimit-Remaining': remaining,
        'X-RateLimit-Reset': today
      });
      res.end(JSON.stringify({
        readme: readme,
        language: language || 'unknown',
        timestamp: new Date().toISOString(),
        free_remaining: remaining
      }));

    } catch (e) {
      // ── Handle JSON parse errors and other exceptions ──
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid request: ' + e.message }));
    }
  });
}
```

### Step 3: Verify route registration

The route **already exists** at line 767 in the HTTP server routing chain:

```javascript
// Generate README
if (p === '/api/generate-readme' && method === 'POST') { await handleGenerateReadme(req, res); return; }
```

**No change needed** to the router. Confirm it's present and positioned correctly (before the 404 catch-all, after the `/api/admin/credits` route). If missing, add it in the routing chain at the same position.

### Step 4: Verify startup log line

The startup log **already includes** a mention of the endpoint. Look for:

```javascript
log(`   Generate README: POST /api/generate-readme (3/day)`);
```

If present, no change needed. If missing, add it after the free endpoints log line within the `server.listen` callback.

---

## 5. Rate Limiting Details

### 5.1 Data Structure

The existing `FREE_LIMIT` Map (line ~53 of gateway.cjs) is reused:

```javascript
const FREE_LIMIT = new Map(); // ip -> { date, count }
```

**Important:** The readme generator shares the rate limit pool with `/free/{mode}` endpoints (3 total free requests/day/IP across all free services). This is existing behavior and matches the task requirement of "like the free-credit system."

### 5.2 IP Extraction

Uses the existing `ipFromReq(req)` helper (no change needed):

```javascript
function ipFromReq(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim()
      || req.socket.remoteAddress
      || '0.0.0.0';
}
```

### 5.3 Limit Check

Uses the existing `checkFreeLimit(ip)` helper (no change needed):

```javascript
function checkFreeLimit(ip) {
  const today = new Date().toISOString().split('T')[0];
  const entry = FREE_LIMIT.get(ip);
  if (!entry || entry.date !== today) {
    FREE_LIMIT.set(ip, { date: today, count: 0 });
    return true;
  }
  if (entry.count >= 3) return false;
  return true;
}
```

### 5.4 Counter Increment

Uses the existing `incrementFree(ip)` helper (no change needed):

```javascript
function incrementFree(ip) {
  const today = new Date().toISOString().split('T')[0];
  const entry = FREE_LIMIT.get(ip);
  if (!entry || entry.date !== today) FREE_LIMIT.set(ip, { date: today, count: 1 });
  else entry.count++;
}
```

### 5.5 Rate Limit Response (429)

When the limit is exceeded, return:

```json
{
  "error": "Free limit reached (3/day). Buy credits at /upgrade.html",
  "upgrade": true,
  "limit": 3,
  "reset_date": "2026-06-18"
}
```

Status: 429, Content-Type: application/json

---

## 6. Response Specifications

### 6.1 Success (200)

```json
{
  "readme": "# Project Title\n\n## Description\n...\n\n---\n*Built with [my-automaton AI](https://my-automaton.ai)*\n",
  "language": "python",
  "timestamp": "2026-06-18T12:00:00.000Z",
  "free_remaining": 2
}
```

Headers:
```
Content-Type: application/json
X-Free-Remaining: 2
X-RateLimit-Limit: 3
X-RateLimit-Remaining: 2
X-RateLimit-Reset: 2026-06-18
```

### 6.2 Error: Missing Code (400)

```json
{
  "error": "Missing required field: code"
}
```

### 6.3 Error: Invalid JSON (400)

```json
{
  "error": "Invalid request: Unexpected token ..."
}
```

### 6.4 Error: Code Too Long (413)

```json
{
  "error": "Code exceeds maximum length of 8000 characters"
}
```

### 6.5 Error: Rate Limited (429)

```json
{
  "error": "Free limit reached (3/day). Buy credits at /upgrade.html",
  "upgrade": true,
  "limit": 3,
  "reset_date": "2026-06-18"
}
```

### 6.6 Error: AI Unavailable (502)

```json
{
  "error": "AI service temporarily unavailable. Please try again later."
}
```

### 6.7 Error: Internal Server Error (500)

Caught by the existing top-level try/catch in the HTTP server (no special handling needed).

---

## 7. Edge Cases Addressed

| Edge Case | Handling |
|-----------|----------|
| **Missing `code` field** | Return 400 with `"Missing required field: code"` |
| **Empty string `code`** | `''.trim()` → falsy → return 400 |
| **`code` is not a string** | `JSON.parse` will fail → catch block → 400 |
| **Code exceeds 8000 chars** | Return 413 with descriptive error |
| **`language` omitted** | Default to `'code'` in prompt (language-agnostic generation) |
| **Malformed JSON body** | `JSON.parse` throws → catch block → 400 |
| **Empty request body** | `JSON.parse('')` throws → catch block → 400 |
| **DeepSeek API down** | `callAI` returns `{ error: '...' }` → return 502 |
| **DeepSeek not configured** | `callAI` returns `{ error: 'AI not configured' }` → return 502 |
| **DeepSeek returns unexpected format** | `callAI` returns `JSON.stringify(data)` as fallback string → treat as valid readme |
| **Rate limit exceeded** | Check fails before body read → return 429 immediately |
| **Concurrent requests from same IP** | Rate limit check is synchronous, counter increment is synchronous — safe |
| **IP extraction from proxy** | `x-forwarded-for` header respected via `ipFromReq` |
| **Missing `X-Forwarded-For`** | Falls back to `req.socket.remoteAddress` |
| **IPv6 localhost (::1)** | Handled transparently by existing `ipFromReq` |
| **Attribution already present** | Not checked — always appended anyway (duplicate is acceptable) |

---

## 8. Dependencies / Reuse Map

| Component | Source | Action |
|-----------|--------|--------|
| `callAI(messages)` | Lines ~120-130 (gateway.cjs) | Reuse as-is |
| `checkFreeLimit(ip)` | Lines ~102-111 | Reuse as-is |
| `incrementFree(ip)` | Lines ~113-117 | Reuse as-is |
| `ipFromReq(req)` | Lines ~52-54 | Reuse as-is |
| `FREE_LIMIT` | Line ~45 | Reuse as-is (shared pool) |
| `DEEPSEEK_KEY` | Line ~29-31 | Reuse as-is (config constant) |
| Route registration | HTTP server routing chain | Already present at line 767 |
| `http`, `fs`, `path`, `url`, `crypto` | Top-level imports | Already imported |

**No new dependencies, no new imports, no new npm packages.**

---

## 9. Verification Checklist

After implementing, verify:

- [ ] The handler function uses `const` (not `var`) for all declarations
- [ ] Rate limit check (`checkFreeLimit`) is called BEFORE reading the body
- [ ] Missing code returns 400 with `{ error: "Missing required field: code" }`
- [ ] Code > 8000 chars returns 413
- [ ] Invalid JSON returns 400
- [ ] AI error returns 502 with user-friendly message
- [ ] Counter increment (`incrementFree`) happens AFTER successful AI call
- [ ] Footer contains `https://my-automaton.ai` (not `.songheng.vip`)
- [ ] Response Content-Type is `application/json`
- [ ] Response body is `{ readme: "..." , language, timestamp, free_remaining }`
- [ ] Rate limit exceeded returns 429 with `upgrade: true`
- [ ] `X-Free-Remaining`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` headers present
- [ ] Route `POST /api/generate-readme` exists in router before 404 handler
- [ ] Startup log mentions the endpoint
- [ ] Gateway restarts without errors after patching
- [ ] `curl -X POST ... -d '{"code":"test"}'` returns valid JSON with `readme` field
- [ ] `curl -X POST ... -d '{}'` returns 400
- [ ] `curl -X POST ... -d 'invalid'` returns 400
- [ ] 4th request from same IP returns 429
