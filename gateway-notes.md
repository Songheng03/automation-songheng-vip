# Gateway Internals Documentation

> **Source:** `/root/automaton/gateway.cjs` (v3.0, Express-based, 454 lines)
> **Active as of:** 2026-06-18
> **Domain:** `automation.songheng.vip:8080` (behind Cloudflare Tunnel)
> **Alt domain:** `automation.songheng.vip` (also behind Cloudflare)
> **Status:** Tunnel currently down (returns 502/530 from Cloudflare); source code fully available

---

## 1. Static File Serving

| Property | Value |
|---|---|
| **Directory** | `/root/automaton/content/` |
| **Middleware** | `express.static(CT)` where `CT = path.join(__dirname, 'content')` |
| **URL path** | Root-level — any file in `/content/` is served at `/{filename}` |
| **Examples** | `/index.html` → `/root/automaton/content/index.html` |
| | `/about.html` → `/root/automaton/content/about.html` |
| | `/api-docs.html` → `/root/automaton/content/api-docs.html` |
| | `/blog/` → `/root/automaton/content/blog/` |

**How it works (gateway.cjs line 76):**
```js
app.use(express.static(CT));  // Serves everything in /content/ at /
```

Content directory contains ~250+ files including HTML pages, blog posts, JS files, SVG badges, feeds (atom, RSS, JSON), and verification files.

---

## 2. CORS Settings

**Current gateway.cjs (line 74):**
```js
const cors = require('cors');
app.use(cors());
```
- **Permissive:** `cors()` with no options allows all origins, all methods, all headers.
- This applies to **all routes** including API endpoints.

**production-gateway.js (native http fallback) also uses permissive CORS:**
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, X-API-Key, X-X402-Payment
```

**Summary:** CORS is wide open (`*`). No domain restrictions. No preflight issues for widget integration — any domain can embed/call the API.

---

## 3. API Endpoints — Especially Code Review

### Free Endpoints (3 requests/day/IP)

| Endpoint | Service | Cost | Description |
|---|---|---|---|
| `POST /free/analyze` | Text analysis | Free (3/day) | Tone, themes, sentiment, readability |
| `POST /free/summarize` | Summarization | Free (3/day) | Key points, main idea, conclusion |
| `POST /free/explain` | Code explanation | Free (3/day) | Explain code in simple terms |

**Rate limit:** 3 requests per IP per day (tracked in-memory `freeUsed` Map).
**No API key required** for free endpoints.

### Premium Endpoints (require API key)

| Endpoint | Service | Cost (credits) |
|---|---|---|
| `POST /v1/analyze` | Text analysis | 1 |
| `POST /v1/summarize` | Summarization | 2 |
| `POST /v1/review` | **Code review** | **5** |
| `POST /v1/security` | Security scan | 3 |
| `POST /v1/explain` | Code explanation | 2 |
| `POST /v1/refactor` | Code refactoring | 5 |
| `POST /v1/complexity` | Complexity analysis | 2 |
| `POST /v1/batch` | Batch processing | 5 per item |

**Auth:** `X-API-Key` header required. Credits deducted per call.

### ⚠️ Code Review: Free endpoint does NOT exist

- **There is currently NO `/free/review` endpoint** in the active gateway.cjs.
- The `freeServices` array only includes: `['analyze', 'summarize', 'explain']`.
- The `production-gateway.js` backup file lists `/free/review` as planned but it is NOT implemented in the active gateway.
- Premium `/v1/review` exists (costs 5 credits).
- Frontend page `/free-ai-code-review-api.html` exists in content directory, suggesting a free code-review page was built but the backend endpoint was never wired up.

### Where to add a free code-review endpoint

To add a `POST /free/review` endpoint, edit `gateway.cjs`:

1. Add `'review'` to the `freeServices` array (line ~300):
   ```js
   const freeServices = ['analyze','summarize','explain', 'review'];
   ```
2. Optionally add a `review` system prompt if needed — a `review` prompt already exists in `SYSTEM_PROMPTS` (line 214).

### Other API Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/health` | GET | Health check (`{status, uptime, time}`) |
| `/api/analytics?days=7` | GET | Page view analytics |
| `/api/check-key?key=...` | GET | Validate API key, check credits |
| `/api/widget-stats` | GET | Badge/widget embed stats |
| `/api/widget-log` | POST | Log widget embeds |
| `/api/lookup-session?session_id=...` | GET | Lookup Creem payment session |
| `/api/checkout` | POST | Create Creem checkout session |
| `/api/webhook/creem` | POST | Creem payment webhook |

---

## 4. Server Framework & Adding New Routes

### Framework
- **Express v5** (`express` ^5.2.1 in `package.json`)
- Port: **8080** (hardcoded)
- Started via: `app.listen(PORT, ...)` (line 449)

### Key dependencies
- `cors` — CORS middleware
- `express.json({ limit: '5mb' })` — JSON body parser
- `express.static()` — Static file serving
- `fetch` (native) — For calling DeepSeek API

### Rate Limiting
- 60 requests/min per IP (in-memory `rateMap`)
- Free tier: 3 requests/day per IP

### How to add new routes

**Pattern 1 — Simple GET route:**
```js
app.get('/api/my-thing', (req, res) => {
  res.json({ data: 'hello' });
});
```

**Pattern 2 — POST with middleware:**
```js
app.post('/api/my-action', someMiddleware, async (req, res) => {
  const { input } = req.body;
  // ... logic ...
  res.json({ result: 'ok' });
});
```

**Pattern 3 — Authenticated premium endpoint:**
```js
app.post('/v1/my-service', requireApiKey, async (req, res) => {
  // req.apiKeyData and req.apiKeyName are available
  const cost = 3;
  deductCredits(req.apiKeyName, cost);
  res.json({ result: 'ok' });
});
```

**Route registration location:** All routes are added between the middleware setup (line ~74) and `app.listen(PORT, ...)` (line 449). Simply add new `app.get()` or `app.post()` calls in that section.

### Startup behavior
```js
app.listen(PORT, () => {
  console.log(`🚀 Gateway v3.0 running on port ${PORT}`);
  console.log(`   Creem: ${CREEM_API_KEY ? 'configured ✓' : 'NOT configured ✗'}`);
  console.log(`   Products: ${Object.keys(CREEM_PRODUCT_IDS).length} configured`);
  console.log(`   API keys stored: ${Object.keys(loadKeys()).length}`);
});
```

---

## 5. Widget Integration Notes

- **CORS is wide open** → widgets can be embedded on any domain.
- **Free endpoints** require no API key (3/day limit per IP).
- **Widget stats endpoint** exists at `/api/widget-stats` (GET) and `/api/widget-log` (POST).
- **Static files** served from `/content/` — widgets can fetch JS/CSS from there.
- **DeepSeek backend** powers all AI endpoints via `callDeepSeek()` function.
- **No CSRF protection** — relevant for widget POST endpoints.

---

## 6. Key File Paths

| File | Purpose |
|---|---|
| `/root/automaton/gateway.cjs` | **Active gateway** (Express v5, 454 lines) |
| `/root/automaton/production-gateway.js` | Fallback/alternative gateway (native http) |
| `/root/automaton/content/` | Static files directory |
| `/root/automaton/api-keys.json` | API key store |
| `/root/automaton/gateway.env` | Creem API keys (checkout/webhook) |
| `/root/automaton/automaton.json` | Config (DeepSeek key, model settings) |
| `/root/automaton/data/` | Analytics, session maps, widget stats |
