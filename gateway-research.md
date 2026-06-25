# Gateway Research Document

## Source File

**Primary file:** `/root/automaton/gateway.cjs` (701 lines)
**Symlink:** `/root/automaton/gateway.js` → `gateway.cjs`
**Framework:** Raw Node.js `http` module (no Express, no routing library)

---

## 1. Route Definitions — File Path and Line Numbers

All route dispatching happens in the `http.createServer` callback at **lines 635–685**.

### Route Registration Table

| Route Pattern | Method | Handler Function | Lines |
|---|---|---|---|
| `/health`, `/api/health` | GET | `handleHealth` | 647 |
| Any GET not starting with `/api/`, `/v1/`, `/free/`, `/webhook/`, `/badge/` | GET | `serveStatic` | 651 |
| `/sitemap.xml` | GET | `handleSitemap` | 656 |
| `/openapi.json` | GET | `handleOpenAPI` | 657 |
| `/badge`, `/badge/*` | GET | `handleBadge` | 660 |
| `/free/{mode}` | POST | `handleFree` | 663 |
| `/v1/{mode}` | POST | `handlePremium` | 666 |
| `/api/checkout` | GET | `handleCreemCheckout` | 669 |
| `/api/creem-webhook` | POST | `handleCreemWebhook` | 670 |
| `/checkout/success` | GET | `handleCheckoutSuccess` | 671 |
| `/upgrade`, `/upgrade.html` | GET | `handleUpgrade` | 674 |
| `/api/stats/overview`, `/api/stats` | GET | `handleStats` | 677 |
| `/api/admin/credits` | POST | `handleAdmin` | 680 |
| Fallback (404) | Any | N/A | 683 |

---

## 2. Pattern for Adding a New POST Route

### Step-by-step blueprint:

**A. Add an `if` block in the server handler (around line 680):**

```js
// In the http.createServer callback, BEFORE the 404 fallback (line 683)
if (p === '/api/your-new-route' && method === 'POST') {
  await handleYourNewRoute(req, res);
  return;
}
```

**B. Write an async handler function (before line 635):**

```js
async function handleYourNewRoute(req, res) {
  // 1. Parse body
  let body = '';
  req.on('data', c => body += c);
  req.on('end', async () => {
    try {
      const data = JSON.parse(body);
      
      // 2. Your logic here
      const result = { message: 'success', data };
      
      // 3. Send response
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid request: ' + e.message }));
    }
  });
}
```

**C. Add CORS header permission if needed (line 639):**

The existing CORS allows `Content-Type, X-API-Key, X-X402-Payment`. Add new custom headers to the comma-separated list on line 639 if required.

### Important Notes:
- The server uses raw `http.createServer(req, res)` — no Express routing.
- Path is parsed via `url.parse(req.url).pathname` (line 637).
- All handler functions are `async`.
- The `checkFreeLimit`/`incrementFree` pattern is **in-memory only** — it resets on server restart.

---

## 3. Rate-Limiting Helper Code and How to Reuse It

### A. In-Memory Rate Limiting (in `gateway.cjs`)

**Store declaration — Line 53:**
```js
const FREE_LIMIT = new Map(); // ip -> { date, count }
```

**Check function — Lines 110–119:**
```js
function checkFreeLimit(ip) {
  const today = new Date().toISOString().split('T')[0];
  const entry = FREE_LIMIT.get(ip);
  if (!entry || entry.date !== today) {
    FREE_LIMIT.set(ip, { date: today, count: 0 });
    return true; // allowed
  }
  if (entry.count >= 3) return false; // blocked
  return true; // allowed
}
```

**Increment function — Lines 121–125:**
```js
function incrementFree(ip) {
  const today = new Date().toISOString().split('T')[0];
  const entry = FREE_LIMIT.get(ip);
  if (!entry || entry.date !== today) FREE_LIMIT.set(ip, { date: today, count: 1 });
  else entry.count++;
}
```

**IP extraction helper — Lines 75–77:**
```js
function ipFromReq(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || '0.0.0.0';
}
```

**How to reuse this pattern in a new route:**

```js
async function handleMyNewRoute(req, res) {
  const ip = ipFromReq(req);
  
  // Check rate limit
  if (!checkFreeLimit(ip)) {
    res.writeHead(429, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Free limit reached (3/day).' }));
    return;
  }
  
  // ... process request ...
  
  // After successful processing, increment
  incrementFree(ip);
  
  // Send response with remaining count
  const remaining = 2 - (FREE_LIMIT.get(ip)?.count || 0);
  res.writeHead(200, { 'Content-Type': 'application/json', 'X-Free-Remaining': remaining });
  res.end(JSON.stringify({ free_remaining: remaining }));
}
```

### B. Persistent Rate Limiter Module (`/root/automaton/rate-limiter.cjs`)

A separate module provides file-based persistent rate limiting using `/root/automaton/data/rate-limiter-state.json`.

**Key exports:**
- `checkFreeUsage(ip)` — Returns `{ allowed, remaining, resetDate, totalFree, paymentRequired }`
- `rateLimitMiddleware(req, res, next)` — Express-style middleware (not directly usable with the raw http server)
- `getStats()` — Stats about active IPs today
- `FREE_LIMIT` — Constant = 3

**To use in a new handler (adapting to raw http):**

```js
const rateLimiter = require('./rate-limiter.cjs');

async function handleMyNewRoute(req, res) {
  const ip = ipFromReq(req);
  const result = rateLimiter.checkFreeUsage(ip);
  
  if (!result.allowed) {
    res.writeHead(402, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: 'free_limit_reached',
      message: `Free limit reached (${result.totalFree}/day).`,
      remaining: result.remaining,
      reset: result.resetDate
    }));
    return;
  }
  
  // ... process request ...
  
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ remaining: result.remaining }));
}
```

> **Note:** The in-memory approach (`checkFreeLimit`/`incrementFree`) is simpler but resets on server restart. The `rate-limiter.cjs` persists to disk but is slightly more complex. Choose based on whether restart persistence matters.

---

## 4. How to Serve a Static HTML File from `/content/`

### Automatic serving (for GET requests):

Any GET request whose path does **not** start with `/api/`, `/v1/`, `/free/`, `/webhook/`, or `/badge/` is automatically served by `serveStatic()` (line 200) from the `/root/automaton/content/` directory.

**Rules:**
- Path `/` or empty → serves `/root/automaton/content/index.html`
- Path `/foo.html` → serves `/root/automaton/content/foo.html`
- Path `/foo` (no extension) → tries `/root/automaton/content/foo.html` first, falls back to `/root/automaton/content/foo`
- Directory traversal is blocked (line 213-215)
- Default `Cache-Control: public, max-age=3600` (line 218)

### To add a new static HTML page:

1. Create the file at `/root/automaton/content/your-page.html`
2. It becomes immediately accessible at `http://localhost:8080/your-page.html` or `http://localhost:8080/your-page` (auto-resolves without extension)

### To serve a static file from within a route handler:

```js
// Inside any async handler:
const filePath = path.join(CONTENT, 'your-page.html');
try {
  const content = fs.readFileSync(filePath);
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(content);
} catch {
  res.writeHead(404);
  res.end('Not found');
}
```

Reference: `handleUpgrade` at line 507 uses this exact pattern with template variable injection.

### MIME type mapping (line 56):

Supported extensions: `.html`, `.js`, `.mjs`, `.css`, `.png`, `.jpg`, `.svg`, `.json`, `.xml`, `.txt`, `.md`, `.ico`
Unknown extensions fall back to `application/octet-stream`.

---

## Summary of Key Code Locations

| What | File | Lines |
|---|---|---|
| Main server creation | `gateway.cjs` | 635–690 |
| Route dispatch table | `gateway.cjs` | 647–683 |
| Static file serving | `gateway.cjs` | 200–220 (`serveStatic`) |
| Static content root | `gateway.cjs` | 24 (`CONTENT = '/root/automaton/content'`) |
| In-memory rate limit store | `gateway.cjs` | 53 (`FREE_LIMIT = new Map()`) |
| Rate limit check | `gateway.cjs` | 110–119 (`checkFreeLimit`) |
| Rate limit increment | `gateway.cjs` | 121–125 (`incrementFree`) |
| IP extraction | `gateway.cjs` | 75–77 (`ipFromReq`) |
| Persistent rate limiter | `rate-limiter.cjs` | Full file (separate module) |
| CORS headers | `gateway.cjs` | 638–639 |
| Free endpoint handler (example) | `gateway.cjs` | 243–263 (`handleFree`) |
| Premium endpoint handler (example) | `gateway.cjs` | 285–325 (`handlePremium`) |
| Admin endpoint handler (example) | `gateway.cjs` | 553–582 (`handleAdmin`) |
