# Gateway API & Free-Credit Patterns — Research Summary

**Source file:** `/root/automaton/production-gateway.js` (551 lines, Node.js/CommonJS)
**Secondary files examined:**
- `/root/automaton/revenue_gateway.py` (Python x402 gateway on 8080)
- `/root/automaton/unified_gateway.py` (Python service catalog on 4001)
- `/root/automaton/patch-gateway.js` (demonstrates adding a new POST route)
- `/root/automaton/x402-verify.js` (ES module, payment verification)
- `/root/automaton/standalone-server.js` (Express-based variant)
- `/root/automaton/api-keys.json` (credit database)

---

## 1) Pattern for Adding a New POST Route

### One-function-per-route pattern

Every route is an `async function handleXxx(req, res)` at the top level. The router is a single `if/else if` chain in the `http.createServer` callback.

### Step-by-step recipe (copied from `patch-gateway.js` + source):

**A) Write the handler function** (place just above the `// ── HTTP Server ──` section):

```js
// ── My New Endpoint ─────────────────────────────────────

async function handleMyEndpoint(req, res) {
  let body = '';
  req.on('data', c => body += c);
  req.on('end', async () => {
    try {
      const input = JSON.parse(body);
      // ... business logic ...
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, data: result }));
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid request: ' + e.message }));
    }
  });
}
```

**B) Register the route** in the router (inside the `http.createServer` callback, before the `// 404` catch-all):

```js
// My new endpoint
if (p === '/api/my-endpoint' && method === 'POST') {
  await handleMyEndpoint(req, res);
  return;
}
```

**C) Ensure static serving doesn't intercept** — the static content condition already excludes `/api/` paths:
```js
// From line ~456:
if (method === 'GET' && !p.startsWith('/api/') && !p.startsWith('/v1/') && !p.startsWith('/free/') && !p.startsWith('/webhook/') && !p.startsWith('/badge/')) {
  await serveStatic(req, res);
  return;
}
```
Any `/api/...` POST route will **always** fall through to the route matching below.

### Existing POST route map (for reference)

| Path | Method | Handler | Auth | Rate Limit |
|------|--------|---------|------|------------|
| `/free/{mode}` | POST | `handleFree` | IP-based | 3/day via checkFreeLimit |
| `/v1/{mode}` | POST | `handlePremium` | X-API-Key header | Credit deduction |
| `/api/generate-readme` | POST | `handleGenerateReadme` | IP-based | 3/day via checkFreeLimit |
| `/api/admin/credits` | POST | `handleAdmin` | none | none |

---

## 2) DeepSeek Integration — How It's Called

### Configuration (lines 29-31)

```js
const DEEPSEEK_ENDPOINT = process.env.DEEPSEEK_ENDPOINT || 'https://api.deepseek.com/chat/completions';
const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY || (() => {
  try { return JSON.parse(fs.readFileSync('/root/.automaton/automaton.json','utf-8')).deepseekApiKey; }
  catch { return ''; }
})();
```

**Key detail:** Falls back to reading `deepseekApiKey` from `/root/.automaton/automaton.json` if the env var is not set.

### The `callAI` function (lines 120-130)

```js
async function callAI(messages) {
  if (!DEEPSEEK_KEY) return { error: 'AI not configured' };
  try {
    const resp = await fetch(DEEPSEEK_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages,
        max_tokens: 2048,
        temperature: 0.3
      })
    });
    const data = await resp.json();
    return data.choices?.[0]?.message?.content || JSON.stringify(data);
  } catch (e) {
    return { error: e.message };
  }
}
```

### Usage pattern (e.g., in `handleGenerateReadme`):

```js
const result = await callAI([{ role: 'user', content: prompt }]);
if (typeof result === 'object' && result.error) {
  // handle error
  res.writeHead(500, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'AI generation failed: ' + result.error }));
  return;
}
// result is a string — the AI's response text
```

### `buildPrompt` helper (lines 197-213)

Used by free and premium handlers to construct the system/user prompt per mode:

```js
function buildPrompt(mode, input) {
  const code = input.code || input.text || '';
  const lang = input.language || input.lang || '';
  const prompts = {
    analyze: `Analyze this text deeply. Provide insights, themes, and key points:\n\n${code}`,
    summarize: `Summarize this text concisely:\n\n${code}`,
    review: `Code review the following ${lang} code. ...`,
    security: `Security audit this ${lang} code. ...`,
    explain: `Explain this ${lang} code in simple terms:\n\n${code}`,
    refactor: `Suggest refactoring improvements for this ${lang} code. ...`,
    complexity: `Analyze the complexity of this ${lang} code. ...`
  };
  return prompts[mode] || `Process this: ${code}`;
}
```

---

## 3) IP Tracking & Rate Limiting — Exact Mechanism

### Data structure (line 45)

```js
const FREE_LIMIT = new Map(); // ip -> { date, count }
```

A single in-memory `Map` shared across **all free endpoints** including both `/free/{mode}` and `/api/generate-readme`.

### IP extraction (lines 52-54)

```js
function ipFromReq(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim()
      || req.socket.remoteAddress
      || '0.0.0.0';
}
```

Respects reverse proxy headers (X-Forwarded-For).

### Check function (lines 102-111)

```js
function checkFreeLimit(ip) {
  const today = new Date().toISOString().split('T')[0];
  const entry = FREE_LIMIT.get(ip);
  if (!entry || entry.date !== today) {
    FREE_LIMIT.set(ip, { date: today, count: 0 });
    return true;  // allowed (fresh slot)
  }
  if (entry.count >= 3) return false;  // blocked
  return true;  // allowed
}
```

- **Limit:** 3 requests per IP per calendar day (UTC).
- **Date comparison:** `new Date().toISOString().split('T')[0]` — resets at midnight UTC.
- **Return value**: `true` = allowed, `false` = rate limited.

### Increment function (lines 113-117)

```js
function incrementFree(ip) {
  const today = new Date().toISOString().split('T')[0];
  const entry = FREE_LIMIT.get(ip);
  if (!entry || entry.date !== today) FREE_LIMIT.set(ip, { date: today, count: 1 });
  else entry.count++;
}
```

### Rate-limited response (lines 177-181, 264-269)

```js
if (!checkFreeLimit(ip)) {
  res.writeHead(429, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    error: 'Free limit reached (3/day). Buy credits at /upgrade.html',
    upgrade: true
  }));
  return;
}
```

### Remaining-count header (lines 190-192, 312-313)

```js
const remaining = Math.max(0, 2 - (FREE_LIMIT.get(ip)?.count || 0));
res.writeHead(200, {
  'Content-Type': 'application/json',
  'X-Free-Remaining': remaining    // <-- custom header
});
```

**Important note:** The remaining is calculated as `2 - count` because increment happens **after** the response is sent (so count at response time is 1 less than actual used). The header value goes: 2, 1, 0.

---

## 4) Reusable Middleware & Helper Functions

All in `/root/automaton/production-gateway.js`:

| Function | Signature | Purpose |
|----------|-----------|---------|
| `ipFromReq(req)` | `req → string` | Extract client IP from headers/socket |
| `checkFreeLimit(ip)` | `string → boolean` | Returns true if under 3/day limit |
| `incrementFree(ip)` | `string → void` | Increments daily counter for IP |
| `callAI(messages)` | `[{role,content}] → Promise<string\|object>` | Calls DeepSeek API |
| `buildPrompt(mode, input)` | `(string, object) → string` | Builds AI prompt per endpoint |
| `readJSON(p, def)` | `(string, any) → object` | Reads & parses JSON file with fallback |
| `writeJSON(p, data)` | `(string, object) → void` | Writes JSON file (creates dirs) |
| `getCredits(key)` | `string → object\|null` | Returns key data from api-keys.json |
| `useCredits(key, cost)` | `(string, number) → boolean` | Deducts credits, returns false if insufficient |
| `addCredits(priceId, txHash)` | `(string, string) → string` | Generates new API key with credits |
| `generateKey()` | `→ string` | Generates `am_` prefixed random key |
| `log(msg)` | `string → void` | Console + file logging to `/root/automaton/data/gateway.log` |
| `mime(p)` | `string → string` | MIME type resolution by extension |
| `serveStatic(req, res)` | `(req, res) → Promise<void>` | Serves files from `/root/automaton/content/` |

### Server configuration block (lines 20-37)

```js
const PORT = 8080;
const CONTENT = '/root/automaton/content';        // static files root
const API_KEYS = '/root/automaton/api-keys.json'; // credit database
const DATA_DIR = '/root/automaton/data';           // logs directory
const CREDIT_COST = { analyze: 1, summarize: 2, review: 5, security: 3, explain: 2, refactor: 5, complexity: 2 };
const PRICES = {
  'price_starter': { name: 'Starter', credits: 500, price: 5 },
  'price_advanced': { name: 'Pro', credits: 1100, price: 10 },
  'price_pro': { name: 'Business', credits: 3000, price: 25 },
  'price_ultimate': { name: 'Enterprise', credits: 6500, price: 50 },
};
```

### CORS headers (lines 443-446)

Applied to **every** response in the router:

```js
res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key, X-X402-Payment');
if (method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
```

### Static file serving (lines 133-148)

```js
async function serveStatic(req, res) {
  let p = url.parse(req.url).pathname;
  if (p === '/' || p === '') p = '/index.html';
  const filePath = path.join(CONTENT, p);
  if (!filePath.startsWith(CONTENT)) { res.writeHead(403); res.end('Forbidden'); return; }
  // ...reads and serves with MIME type + Cache-Control: public, max-age=3600
}
```

Files are served from `/root/automaton/content/`. **Directory traversal is explicitly prevented** by checking `filePath.startsWith(CONTENT)`.

### API key database format (`/root/automaton/api-keys.json`)

```json
{
  "am_mqf8wm48fkgb84sw": {
    "credits": 1488,
    "created": "2026-06-15T13:25:02.092Z",
    "used": 22,
    "price_id": "price_advanced"
  }
}
```

---

## Summary for Implementation

To add a **new POST API route** (e.g., `/api/check-free-credits`):

1. **Write** `async function handleCheckFreeCredits(req, res)` following the `body → JSON.parse → logic → response` pattern above.
2. **Register** it in the router: `if (p === '/api/check-free-credits' && method === 'POST') { await handleCheckFreeCredits(req, res); return; }`
3. **Reuse** `ipFromReq(req)`, `checkFreeLimit(ip)`, `callAI([])`, `readJSON()`, `writeJSON()` as needed.
4. **Rate-limit** with `checkFreeLimit(ip)` + `incrementFree(ip)` for any per-IP daily cap.
5. **Authenticate** premium routes via `req.headers['x-api-key']` → `getCredits(key)` → `useCredits(key, cost)`.
6. **Always** apply CORS headers early in the handler or rely on the router's global headers.
