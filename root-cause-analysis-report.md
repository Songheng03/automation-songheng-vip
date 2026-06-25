# Root Cause Analysis Report — Gateway Backend

**File analyzed:** `/root/automaton/gateway.cjs` (788 lines)
**Symlink:** `/root/automaton/gateway.js` → `gateway.cjs`
**Running:** Yes, on port 8080 (via docker-proxy)
**Framework:** Raw Node.js `http` module (no Express)

---

## ✅ What Worked

| Component | Status | Details |
|---|---|---|
| **Static file serving** (`serveStatic`) | ✅ Working | Serves content from `/root/automaton/content/` with auto `.html` resolution and directory traversal protection |
| **Health endpoint** (`/health`, `/api/health`) | ✅ Working | Returns JSON status, uptime, version info |
| **Free AI endpoints** (`/free/*`) | ✅ Working | 3/day/IP rate limiting via in-memory `FREE_LIMIT` Map. Calls DeepSeek via `callAI()` |
| **Premium endpoints** (`/v1/*`) | ✅ Working | Credit-based access via X-API-Key header, reads from `api-keys.json` |
| **Badge generator** (`/badge`) | ✅ Working | Dynamic SVG badge generation with color support |
| **Admin endpoint** (`/api/admin/credits`) | ✅ Working | Can add/top-up API keys |
| **Stats** (`/api/stats/overview`) | ✅ Working | Returns key counts, credit totals, revenue estimates |
| **Sitemap & OpenAPI** | ✅ Working | Static sitemap.xml and generated OpenAPI 3.0 spec |
| **CORS headers** | ✅ Working | Allows all origins, with `Content-Type, X-API-Key, X-X402-Payment` headers |
| **DeepSeek integration** (`callAI()`) | ✅ Working | Uses `deepseek-chat` model with 2048 max tokens, 0.3 temperature |
| **Content directory** | ✅ Working | Contains readme-generator.html (352 lines), landing pages, etc. |

---

## ❌ What Didn't Work — Critical Bugs

### BUG 1: `addCredits()` uses undefined variable `resolvedPriceId` (line ~88)

```javascript
function addCredits(priceId, txHash) {
  const tier = PRICES[resolvedPriceId];   // ← BUG: resolvedPriceId is not defined
  if (!tier) return null;
```

**Impact:** Adding credits after a webhook payment always fails because `resolvedPriceId` is undefined in this scope. The function returns `null` every time.

**Fix:** Change `PRICES[resolvedPriceId]` to `PRICES[priceId]`.

---

### BUG 2: `createCreemCheckout()` uses undefined variable `resolvedPriceId` (lines ~149-153)

```javascript
async function createCreemCheckout(priceId, metadata = {}) {
  const productId = CREEM_PRODUCT_IDS[priceId];
  if (!productId) { ... return null; }

  const tier = PRICES[resolvedPriceId];   // ← BUG: should be PRICES[priceId]
  if (!tier) return null;

  const body = JSON.stringify({
    product_id: productId,
    success_url: `...?price_id=${resolvedPriceId}`,  // ← BUG: should be priceId
    metadata: JSON.stringify({ price_id: priceId, ...metadata }),
  });
```

**Impact:** The tier check always fails (returns null), so `createCreemCheckout` can never succeed in creating a checkout session, even with valid Creem API keys.

**Fix:** Replace `resolvedPriceId` with `priceId` in two places.

---

### BUG 3: `handleCheckoutSuccess()` uses undefined variable `resolvedPriceId` (line ~479)

```javascript
async function handleCheckoutSuccess(req, res) {
  const query = url.parse(req.url, true).query;
  const priceId = query.price_id || '';
  const tier = PRICES[resolvedPriceId];   // ← BUG: resolvedPriceId not defined in scope
```

**Impact:** The success page always shows `undefined` for tier info because `resolvedPriceId` doesn't exist in this function scope.

**Fix:** Change to `PRICES[priceId]` (using the `priceId` already extracted from query params).

---

### BUG 4: `handleGenerateReadme()` — inconsistent query param extraction for free remaining (lines ~385-388)

```javascript
// In add-readme-route3's version of handleGenerateReadme:
res.writeHead(200, { 
  'Content-Type': 'text/markdown',
  'X-Free-Remaining': 2 - (FREE_LIMIT.get(ip) ? FREE_LIMIT.get(ip).count : 0)
});
```

This works but note the `var`-based style (from the patch script) is inconsistent with the rest of the file's `const`/`let` approach. The response type is `text/markdown` rather than `application/json`, which differs from other endpoints. The route was successfully added by `add-readme-route3.js`, and is registered at line ~745 of gateway.cjs.

---

### BUG 5: `handleFree()` — broken `X-Free-Remaining` header calculation (line ~259)

```javascript
res.writeHead(200, { 
  'Content-Type': 'application/json', 
  'X-Free-Remaining': 2 - (FREE_LIMIT.get(ip)?.count || 0) 
});
res.end(JSON.stringify({ 
  result, mode, 
  free_remaining: 2 - (FREE_LIMIT.get(ip)?.count || 0)  // ← same issue
}));
```

**Subtle issue:** `FREE_LIMIT.get(ip)?.count` is read *after* `incrementFree(ip)` was called on line 260. So the "remaining" calculation of `2 - count` is off by one. Count was already incremented, so the remaining shows `1 - (remaining after increment)` rather than `2 - (remaining after increment)`.

At the start of the day, after first successful call:
- Count becomes 1 (after increment)
- Remaining displayed: 2 - 1 = 1 (correct by coincidence)

After second successful call:
- Count becomes 2
- Remaining displayed: 2 - 2 = 0 (correct)

After third call hits rate limit (throws 429 before increment):
- Count stays at 2 → never shows 0 remaining

**Better calculation:** Show `Math.max(0, 2 - FREE_LIMIT.get(ip)?.count)` after incrementing, or track remaining before incrementing.

---

## 🧩 Partial Code / Failed Executor Artifacts

### Artifact 1: Three conflicting patch scripts

| File | Lines | Status | Notes |
|---|---|---|---|
| `add-readme-route.js` | 95 | ❌ Never ran | Uses `.replace()` on a pattern that may not match exact current state |
| `add-readme-route2.js` | 102 | ❌ Never ran | Uses `const`/`let` style, complex string escaping with `\\n` (double-escaped) |
| `add-readme-route3.js` | 107 | ✅ **Ran successfully** | Uses `var` and `function` keyword style, simpler string concatenation |

The third script (`add-readme-route3.js`) successfully patched the gateway. Its code is now embedded in `gateway.cjs` at lines 284-395. The code uses `var` instead of `const`/`let` and `function(c)` instead of arrow functions — a stylistic inconsistency.

### Artifact 2: `rate-limiter.cjs` (separate module, 128 lines)

**Not imported by gateway.cjs.** This is a fully functional persistent rate limiter with:
- File-based state in `/root/automaton/data/rate-limiter-state.json`
- 7-day TTL cleanup
- Express-compatible middleware
- Returns 402 Payment Required with USDC payment instructions

**Why it's not used:** The `gateway.cjs` has its own inline rate limiting (`FREE_LIMIT` Map). The separate module appears to be a failed attempt to add persistent rate limiting with crypto-payment integration.

### Artifact 3: `production-gateway.js` (551 lines)

A separate version of the gateway (Stripe-based, older). Contains README generation code. This appears to be a reference/source file that was partially used to produce `gateway.cjs`. Not currently running.

### Artifact 4: `gateway.log` — Express `path-to-regexp` crash

```
PathError: Missing parameter name at index 1: *
```
This crash is **not from gateway.cjs** (which uses raw `http` module). It's from a separate Express-based test server (PID 804916, running on port 8089). This is unrelated to the main gateway but shows a failed attempt to run an Express app with a malformed `*` wildcard route.

### Artifact 5: Multiple gateway backup files

| Backup File | When | Notes |
|---|---|---|
| `gateway.cjs.bak.readme-patch` | Jun 18, 12:28 | Before readme route was added |
| `gateway.cjs.bak.1781780001` | Jun 18, 10:53 | Before widget implementation |
| `gateway.cjs.bak.pre-widget-impl` | Jun 18, 10:50 | Pre-widget backup |
| `gateway.cjs.bak.1781763467` | Jun 18, 06:17 | Smaller (9170 bytes) - earlier version |
| `gateway.cjs.backup-1781779831` | Jun 18, 10:50 | Same as pre-widget |
| `gateway.cjs.bak.pre-review` | Jun 18, 10:49 | Pre-review backup |

---

## 📍 Specific Code Locations Needing Attention

| Line(s) | File | Issue | Priority |
|---|---|---|---|
| 88 | `gateway.cjs` | `addCredits()` — uses undefined `resolvedPriceId` | **CRITICAL** |
| 149 | `gateway.cjs` | `createCreemCheckout()` — uses undefined `resolvedPriceId` | **CRITICAL** |
| 152-153 | `gateway.cjs` | `createCreemCheckout()` — uses `resolvedPriceId` in success_url | **CRITICAL** |
| 483 | `gateway.cjs` | `handleCheckoutSuccess()` — uses undefined `resolvedPriceId` | **HIGH** |
| 259-262 | `gateway.cjs` | `handleFree()` — remaining count off by one relative to increment | **LOW** |
| 284-395 | `gateway.cjs` | `handleGenerateReadme()` — inconsistent `var`/`function` style, `text/markdown` content type instead of JSON | **LOW** |
| ~53 | `gateway.cjs` | `FREE_LIMIT` is in-memory only — lost on restart | **LOW** (design decision) |
| Whole file | `rate-limiter.cjs` | Separate module, never imported by gateway | **MEDIUM** (unused code) |

---

## 📋 Summary

The gateway core (static serving, free/premium API endpoints, DeepSeek integration) is **functional**. However, **three variable-scope bugs** (`resolvedPriceId` used where `priceId` should be) make the entire Creem payment + credit-issuance pipeline non-functional:

1. **Credits cannot be added** (Bug 1: `addCredits` uses `resolvedPriceId`)
2. **Checkout sessions cannot be created** (Bug 2: `createCreemCheckout` uses `resolvedPriceId`)
3. **Success page shows no tier info** (Bug 3: `handleCheckoutSuccess` uses `resolvedPriceId`)

These bugs likely originated from a refactor where `resolvedPriceId` was introduced in `handleCreemCheckout` (where it IS defined, lines ~434-435), but the pattern was incorrectly copied to other functions where the variable doesn't exist in scope.

The README generator endpoint (`POST /api/generate-readme`) was successfully patched in by `add-readme-route3.js` and is present in the running gateway at line ~745 (route) and lines 284-395 (handler). It uses shared free rate limiting (3/day/IP).
