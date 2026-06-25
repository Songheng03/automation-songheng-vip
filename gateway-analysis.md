# Gateway Codebase Analysis — README Generator Integration

## 1. Overview

The gateway is a single-file Node.js server at **`/root/automaton/gateway.cjs`** (701 lines). It uses raw `http` module (no Express). All routes, middleware, and business logic are combined in one file. Static content (HTML, JS, CSS) is served from **`/root/automaton/content/`**.

---

## 2. File Paths & Line Numbers

| Component | File Path | Line Range |
|---|---|---|
| Main gateway source | `/root/automaton/gateway.cjs` | 1–701 |
| Content directory | `/root/automaton/content/` | n/a |
| API keys (credit DB) | `/root/automaton/api-keys.json` | n/a |
| Data dir (logs, state) | `/root/automaton/data/` | n/a |
| Existing README generator HTML | `/root/automaton/content/readme-generator.html` | 352 lines |
| Separated rate-limiter module | `/root/automaton/rate-limiter.cjs` | 128 lines |

---

## 3. Architecture Summary

### 3.1 Static File Serving (`serveStatic` function, lines 188–209)
- **Pattern**: All `GET` requests not starting with `/api/`, `/v1/`, `/free/`, `/webhook/`, `/badge/` are treated as static file requests.
- Root (`/`) auto-resolves to `/index.html`.
- If a path has no extension, it tries `path + '.html'` first, then falls back to the literal path.
- **Impact**: A file at `/root/automaton/content/readme-generator.html` is automatically served at `/readme-generator.html` with no code changes needed. The existing file already exists (352 lines, a GitHub Profile README generator UI).

### 3.2 Routing (lines 636–698)
- The `http.createServer` callback handles routing in order.
- Routes are checked sequentially with early `return` on match.
- Current route order:
  1. `/health`, `/api/health`
  2. Static files (GET, non-API paths)
  3. `/sitemap.xml`, `/openapi.json`
  4. `/badge`, `/badge/*`
  5. `/free/*` POST (free AI endpoints)
  6. `/v1/*` POST (premium credit-based AI endpoints)
  7. `/api/checkout*`, `/api/creem-webhook`, `/checkout/success*`
  8. `/upgrade`, `/upgrade.html`
  9. `/api/stats/overview`, `/api/stats`
  10. `/api/admin/credits` POST
  11. 404 fallback

### 3.3 DeepSeek Integration
- **Endpoint**: `DEEPSEEK_ENDPOINT` env var or default `https://api.deepseek.com/chat/completions` (line 22)
- **API Key**: `DEEPSEEK_API_KEY` env var, with fallback to JSON file at `/root/.automaton/automaton.json` (line 23)
- **Function**: `callAI(messages)` at lines 129–141
- **Model**: `deepseek-chat`
- **Parameters**: `max_tokens: 2048`, `temperature: 0.3`
- **Signature**: `async function callAI(messages)` → returns the content string, or `{ error: string }` if failed
- **Usage**: Both `handleFree` (line 259) and `handlePremium` (line 313) call it as:
  ```js
  const result = await callAI([{ role: 'user', content: prompt }]);
  ```

### 3.4 Free Credits / Rate Limiting System (lines 53, 110–127)
- **Data structure**: In-memory `Map` named `FREE_LIMIT` (line 53).
- **Key**: `ip` (from `x-forwarded-for` header or `socket.remoteAddress`).
- **Value**: `{ date: 'YYYY-MM-DD', count: number }`.
- **Limit**: 3 requests per IP per day (checked in `checkFreeLimit`, line 110).
- **Increment**: `incrementFree` function (line 121).
- **429 Response** (in `handleFree`, lines 247–251):
  ```json
  { "error": "Free limit reached (3/day). Buy credits at /upgrade.html", "upgrade": true }
  ```
- **Note**: The separate `rate-limiter.cjs` file exists but is NOT imported by `gateway.cjs`. The gateway uses its own inline implementation.

### 3.5 `buildPrompt` Function (lines 269–283)
- Accepts `mode` (endpoint name) and `input` object.
- Extracts `input.code || input.text` and `input.language || input.lang`.
- Returns a mode-specific prompt string.

---

## 4. Implementation Plan: `POST /api/generate-readme`

### 4.1 Code to Add

#### A. New handler function — insert AFTER line 283 (after `buildPrompt` closes, before `handlePremium`)

```javascript
// ── README Generator ──────────────────────────────────────
async function handleGenerateReadme(req, res) {
  const ip = ipFromReq(req);
  
  // 1. Rate limit check (reuse existing FREE_LIMIT pattern — 3/IP/day)
  if (!checkFreeLimit(ip)) {
    res.writeHead(429, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Free limit reached (3/day). Buy credits at /upgrade.html', upgrade: true }));
    return;
  }
  
  let body = '';
  req.on('data', c => body += c);
  req.on('end', async () => {
    try {
      const input = JSON.parse(body);
      
      // 2. Validate: code field is required
      if (!input.code || typeof input.code !== 'string' || input.code.trim().length === 0) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing required field: code must be a non-empty string' }));
        return;
      }
      
      // 3. Build the README generation prompt
      const readmePrompt = `You are a technical documentation expert. Generate a comprehensive, well-structured README.md file in Markdown for the following codebase. Include sections such as:

# Project Title (infer from the code)
## Overview
## Features
## Installation
## Usage
## API Reference (if applicable)
## Configuration
## Contributing
## License

Use proper Markdown formatting with code blocks, headings, lists, and emphasis where appropriate. Be thorough and professional.

Here is the code to document:

\`\`\`
${input.code}
\`\`\`

Generate ONLY the README content, no additional commentary.`;

      // 4. Call DeepSeek (reuse existing callAI)
      const result = await callAI([{ role: 'user', content: readmePrompt }]);
      
      // 5. Check for AI error
      if (typeof result === 'object' && result.error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'AI generation failed: ' + result.error }));
        return;
      }
      
      // 6. Increment free counter
      incrementFree(ip);
      
      // 7. Append attribution footer
      const readme = result + '\n\n---\n*Built with [my-automaton AI](https://my-automaton.ai)*';
      
      // 8. Return success
      res.writeHead(200, { 'Content-Type': 'application/json', 'X-Free-Remaining': 2 - (FREE_LIMIT.get(ip)?.count || 0) });
      res.end(JSON.stringify({ readme }));
      
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid request: ' + e.message }));
    }
  });
}
```

#### B. Add route — insert BEFORE the `// 404` line (around line 692), AFTER the admin route check

Find line ~691:
```javascript
    // Admin
    if (p === '/api/admin/credits' && method === 'POST') { await handleAdmin(req, res); return; }
```

Insert AFTER it:
```javascript
    // README Generator
    if (p === '/api/generate-readme' && method === 'POST') { await handleGenerateReadme(req, res); return; }
```

Also add a startup log line in the `server.listen` callback (around line 698):
```javascript
    log(`   README Generator: /api/generate-readme`);
```

### 4.2 Summary of All Modifications to `/root/automaton/gateway.cjs`

1. **Insert handler function** at line ~284 (after `buildPrompt` closing brace, before `handlePremium`).
2. **Insert route** at line ~692 (after `/api/admin/credits` check, before `// 404`).
3. **Optionally add startup log** at line ~698.

---

## 5. Static File Serving — No Change Needed

The file `readme-generator.html` already exists at `/root/automaton/content/readme-generator.html` (352 lines). The existing `serveStatic` function will automatically serve it at `/readme-generator.html` — no modifications required.

**Why it works**: The routing logic (line 648) checks:
```js
if (method === 'GET' && !p.startsWith('/api/') && !p.startsWith('/v1/') && !p.startsWith('/free/') && !p.startsWith('/webhook/') && !p.startsWith('/badge/')) {
    await serveStatic(req, res);
    return;
}
```
Since `/readme-generator.html` doesn't start with any of those prefixes, it falls through to static serving. The `serveStatic` function auto-resolves `.html` from the content directory.

---

## 6. Existing Infrastructure Reuse Recommendations

| Component | How to Reuse | Details |
|---|---|---|
| **`callAI(messages)`** (line 129) | Reuse directly | Pass `[{ role: 'user', content: prompt }]`. Returns string on success, `{ error: msg }` on failure. |
| **`checkFreeLimit(ip)`** (line 110) | Reuse directly | Same 3/IP/day pattern. Returns boolean. |
| **`incrementFree(ip)`** (line 121) | Reuse directly | Increments the counter after successful generation. |
| **`FREE_LIMIT` Map** (line 53) | Reuse directly | Already used by `handleFree`. The new endpoint shares the same pool, which is appropriate (same 3/day limit across all free endpoints). |
| **`ipFromReq(req)`** (line 96) | Reuse directly | Gets client IP from headers/socket. |
| **`DEEPSEEK_ENDPOINT` / `DEEPSEEK_KEY`** (lines 22–23) | Reuse directly | Already configured globally. |
| **`buildPrompt` pattern** (line 269) | Follow pattern but write custom prompt | The new endpoint needs a very different prompt (README generation vs code analysis), so inline the prompt rather than adding to `buildPrompt`. |
| **`rate-limiter.cjs`** (separate file) | Do NOT use | Not imported by gateway.cjs. The gateway has its own inline implementation. Sticking with the inline pattern keeps consistency. |
| **Error handling pattern** | Follow `handleFree` pattern | 400 for bad input, 429 for rate limit, 500 for AI failure. |
| **Response format** | Follow `handleFree` pattern | JSON responses with descriptive `error` field on failure. |

---

## 7. Specific Implementation Details

### 7.1 Route: `POST /api/generate-readme`

**Request:**
```json
{
  "code": "function hello() { console.log('world'); }"
}
```

**Success Response (200):**
```json
{
  "readme": "# Project Title\n\n## Overview\n...\n\n---\n*Built with [my-automaton AI](https://my-automaton.ai)*"
}
```

**Error Responses:**
- `400` — `{ "error": "Missing required field: code must be a non-empty string" }` (empty/missing code)
- `429` — `{ "error": "Free limit reached (3/day). Buy credits at /upgrade.html", "upgrade": true }` (rate limited)
- `500` — `{ "error": "AI generation failed: <details>" }` (DeepSeek API failure)

### 7.2 Attribution Footer
The string `\n\n---\n*Built with [my-automaton AI](https://my-automaton.ai)*` is appended to the raw AI output before returning.

### 7.3 Rate Limiting Behavior
- Shares the same `FREE_LIMIT` Map and 3-requests-per-24-hours-per-IP limit as `/free/*` endpoints.
- This means a user who makes 3 `/free/analyze` requests and then tries `/api/generate-readme` will be blocked (same pool).
- If separate counting is desired, a second Map (e.g., `README_LIMIT`) should be created with its own `checkFreeLimit`-like functions.

### 7.4 DeepSeek Prompt Design
The prompt casts the AI as a "technical documentation expert" and asks for a comprehensive README.md with standard sections (Title, Overview, Features, Installation, Usage, etc.). The code is wrapped in a markdown code fence. The AI is instructed to output ONLY the README content.

---

## 8. Risks & Edge Cases

1. **Large code input**: The prompt includes the entire code inline. Very large codebases might exceed DeepSeek's token limit (the current `max_tokens: 2048` is for the *response*, not the request). Consider truncating `input.code` or increasing `max_tokens`.
2. **Shared rate limit pool**: As noted above, sharing `FREE_LIMIT` means total free usage across all endpoints is 3/day/IP. To make README generator separate, clone the functions with a different Map.
3. **`buildPrompt` is mode-dispatched**: The `handleFree` and `handlePremium` functions extract the mode from the URL path. Our new endpoint has a fixed path, so we don't need to touch `buildPrompt`.
4. **`max_tokens`**: Current `callAI` uses `max_tokens: 2048`. README output may exceed this. Consider increasing to 4096 or passing a custom `max_tokens` to `callAI`.
5. **No X-API-Key auth**: The new endpoint is free (rate-limited by IP), not credit-based. This matches the `/free/*` pattern. If premium support is wanted later, add an X-API-Key variant.

---

## 9. Proposed Code Location Map

```
gateway.cjs (701 lines)
 ├── Lines 1–53:  Imports, config, constants
 ├── Lines 53:    FREE_LIMIT Map
 ├── Lines 55–127: Helpers (MIME, readJSON, log, ipFromReq, checkFreeLimit, incrementFree)
 ├── Lines 129–141: callAI()
 ├── Lines 143–186: Creem API helpers
 ├── Lines 187–209: serveStatic
 ├── Lines 210–240: handleHealth
 ├── Lines 241–267: handleFree
 ├── Lines 269–283: buildPrompt
 **> INSERT handleGenerateReadme HERE (after line 283) <**
 ├── Lines 285–326: handlePremium
 ├── Lines 328–418: handleCreemCheckout
 ├── Lines 420–477: handleCreemWebhook
 ├── Lines 479–499: handleCheckoutSuccess
 ├── Lines 500–535: handleUpgrade
 ├── Lines 537–557: handleStats
 ├── Lines 559–590: handleAdmin
 ├── Lines 592–613: handleBadge
 ├── Lines 615–630: handleSitemap & handleOpenAPI
 ├── Lines 632–635: OpenAPI spec
 ├── Lines 637–698: HTTP Server (routing)
 │   └── Around line 692: **> INSERT NEW ROUTE <**
 └── Lines 699–701: server.listen with startup logs
     └── **> ADD startup log line**
```

---

## 10. Conclusion

The gateway codebase is well-structured for this addition. The key principles are:

1. **No framework changes needed** — the existing raw `http` pattern is consistent.
2. **Reuse `callAI`** — the DeepSeek integration function is ready to use.
3. **Reuse rate limiting** — `checkFreeLimit` + `incrementFree` + `FREE_LIMIT` Map handle the 3/IP/day enforcement.
4. **No static file changes** — `readme-generator.html` is already served automatically.
5. **Minimal code addition** — one new handler function (~55 lines) and one new route line.

The frontend HTML at `/root/automaton/content/readme-generator.html` can be modified separately to call the new `POST /api/generate-readme` endpoint from its JavaScript.
