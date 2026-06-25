# Gateway Codebase Research

> **Researched by:** researcher agent  
> **Date:** 2025-06-18  
> **Source files:** `gateway.cjs` (primary, ~470 lines), `production-gateway.js` (fallback, ~473 lines), `playground-ai-handler.cjs`, `rate-limiter.cjs`, `services/deepseek-service.cjs`, `patch-gateway.js`, `x402-verify.js`

---

## 1. Server Structure & Route Registration

### Framework
- **Express v5** (CommonJS) — single `gateway.cjs` file
- **Port:** 8080 (hardcoded on `0.0.0.0`)
- **Entry point:** `app.listen(PORT, '0.0.0.0', ...)` at bottom of file

### Middleware Stack (in order)

```
1. cors(corsOptions)           → permissive CORS (*)
2. express.json({ limit: '5mb' }) → JSON body parser
3. express.static(./static/widget) → /widget/*
4. express.static(./static/content) → /content/*
5. express.static(./content/)  → /{anyfile} (root-level static)
6. OPTIONS preflight handler    → CORS for all methods
7. /api/review-free CORS enforcer → per-route CORS
8. Analytics tracker           → page view counting (skips /api/* and /health)
9. Rate limiter                → 60 req/min per IP (in-memory Map)
10. Route handlers             → see below
```

### Route Registration Pattern

```js
const app = express();

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '5mb' }));
app.use('/widget', express.static(...));
app.use('/content', express.static(...));
app.use(express.static(CT));  // root-level static from ./content/
app.use((req, res, next) => { /* CORS preflight */ });
app.use('/api/review-free', (req, res, next) => { /* CORS enforcer */ });
app.use((req, res, next) => { /* analytics tracker */ });
app.use((req, res, next) => { /* rate limiter */ });

// Routes — simply app.get() / app.post() calls between middleware and listen()
app.get('/api/analytics', handler);
app.get('/api/widget-stats', handler);
app.post('/api/widget-log', handler);
app.post('/api/code-review', handler);
app.get('/api/embed-count', handler);
app.post('/api/embed-count', handler);
app.post('/api/checkout', handler);
app.post('/api/webhook/creem', handler);
app.get('/', handler);
app.get('/health', handler);

// Start
app.listen(8080, '0.0.0.0', () => { ... });
```

### All Registered Routes (gateway.cjs)

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/analytics?days=N` | Page view analytics (last N days) |
| `GET` | `/api/widget-stats` | Widget embed statistics |
| `POST` | `/api/widget-log` | Log widget embed event |
| `POST` | `/api/code-review` | **Mock** code review (no AI, heuristic-based) |
| `GET` | `/api/embed-count` | Read embed counter |
| `POST` | `/api/embed-count` | Increment embed counter |
| `POST` | `/api/checkout` | Create Creem checkout session |
| `POST` | `/api/webhook/creem` | Creem payment webhook |
| `GET` | `/` | Landing page (from `./static/index.html` or `./content/index.html`) |
| `GET` | `/health` | Health check (`{status, uptime, time}`) |
| `*` (static) | `/*` | Any file in `./content/` served at root |

---

## 2. `/api/check-free-credits` & IP-Based Rate Limiting

### ⚠️ No `/api/check-free-credits` Endpoint Exists

There is **no endpoint** literally named `/api/check-free-credits` in the current codebase. The equivalent functionality is implemented across **four separate** rate-limiting systems:

---

### A) Global Rate Limiter (gateway.cjs, lines 276-286)

A simple in-memory **60 req/min per IP** rate limiter applied to ALL routes:

```js
const rateMap = new Map();
app.use((req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const win = rateMap.get(ip) || [];
  const recent = win.filter(t => now - t < 60000);
  if (recent.length > 60) return res.status(429).json({ error: 'Rate limited' });
  recent.push(now);
  rateMap.set(ip, recent);
  next();
});
```

**Key characteristics:**
- In-memory only (lost on restart)
- Sliding window (60 seconds)
- Returns HTTP 429 when exceeded
- Window size: 60 requests per minute

---

### B) Free Tier Rate Limiter (production-gateway.js, lines 43-115)

**3 requests/day per IP** for free endpoints:

```js
const FREE_LIMIT = new Map(); // ip -> { date, count }

function checkFreeLimit(ip) {
  const today = new Date().toISOString().split('T')[0];
  const entry = FREE_LIMIT.get(ip);
  if (!entry || entry.date !== today) {
    FREE_LIMIT.set(ip, { date: today, count: 0 });
    return true;  // allowed
  }
  if (entry.count >= 3) return false;  // blocked
  return true;
}

function incrementFree(ip) {
  const today = new Date().toISOString().split('T')[0];
  const entry = FREE_LIMIT.get(ip);
  if (!entry || entry.date !== today) FREE_LIMIT.set(ip, { date: today, count: 1 });
  else entry.count++;
}
```

Usage in `handleFree()` handler:

```js
async function handleFree(req, res) {
  const ip = ipFromReq(req);
  if (!checkFreeLimit(ip)) {
    res.writeHead(429, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Free limit reached (3/day). Buy credits at /upgrade.html', upgrade: true }));
    return;
  }
  // ... process request ...
  incrementFree(ip);
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'X-Free-Remaining': 2 - (FREE_LIMIT.get(ip)?.count || 0)
  });
  res.end(JSON.stringify({ result, mode, free_remaining: 2 - (FREE_LIMIT.get(ip)?.count || 0) }));
}
```

**Key characteristics:**
- In-memory only (lost on restart)
- Resets daily (calendar day based on `toISOString().split('T')[0]`)
- Returns 429 with `upgrade: true` when exhausted
- Sends `X-Free-Remaining` header with remaining count

---

### C) Persistent Rate Limiter (rate-limiter.cjs)

A more sophisticated, **file-persisted** rate limiter (3 req/day/IP):

```js
const STATE_FILE = '/root/automaton/data/rate-limiter-state.json';
const FREE_LIMIT = 3;

function checkFreeUsage(ip) {
  const state = loadState();
  const today = new Date().toISOString().slice(0, 10);
  
  if (!state.ips[ip]) {
    state.ips[ip] = { count: 0, date: today, lastSeen: Date.now() };
  }
  const record = state.ips[ip];
  if (record.date !== today) {
    record.count = 0;
    record.date = today;
  }
  record.lastSeen = Date.now();
  
  const remaining = Math.max(0, FREE_LIMIT - record.count);
  const allowed = record.count < FREE_LIMIT;
  if (allowed) record.count++;
  
  saveState(state);
  return { allowed, remaining, resetDate: today, totalFree: FREE_LIMIT, paymentRequired: !allowed };
}
```

Returns HTTP **402 Payment Required** with USDC payment instructions when limit is hit:

```js
res.status(402).json({
  error: 'free_limit_reached',
  message: `Free limit reached (${FREE_LIMIT}/day). Send USDC to continue.`,
  payment: {
    address: '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113',
    chain: 'Base',
    token: 'USDC',
    amount_cents: getCostForEndpoint(req.path),
    instruction: 'Send amount_cents in USDC to the address, then retry with X-X402-Payment: <tx_hash> header'
  },
  remaining: result.remaining,
  reset: result.resetDate
});
```

**Key characteristics:**
- **Persisted** to disk (`data/rate-limiter-state.json`)
- Cleans entries older than 7 days
- Returns 402 (Payment Required) — designed for x402 USDC micropayments
- Includes payment address and instructions in response

---

### D) Playground Trial Tracker (playground-ai-handler.cjs)

**3 free trials/day/IP** for playground services, also file-persisted:

```js
const TRIAL_LIMIT = 3;
let trialData = {};

function checkFreeTrial(req) {
  const ip = getClientIP(req);
  const today = new Date().toDateString();
  if (!trialData[ip] || trialData[ip].date !== today) {
    trialData[ip] = { date: today, count: 0 };
  }
  const remaining = Math.max(0, TRIAL_LIMIT - trialData[ip].count);
  return { ip, remaining, count: trialData[ip].count, isFree: remaining > 0 };
}
```

Same 402 payment flow when exhausted.

---

### Summary of Rate Limiting Patterns

| Component | Scope | Limit | Window | Persistence | Response on Exceed |
|-----------|-------|-------|--------|-------------|---------------------|
| Global (gateway.cjs) | All routes | 60/min | sliding 60s | None (memory) | 429 |
| Free tier (production-gateway.js) | `/free/*` | 3/day | calendar day | None (memory) | 429 + upgrade link |
| Persistent (rate-limiter.cjs) | `/v1/*` | 3/day | calendar day | File (JSON) | 402 + payment instructions |
| Playground (playground-ai-handler.cjs) | `/playground/*` | 3/day | calendar day | File (JSON) | 402 + payment instructions |
| DeepSeek service (deepseek-service.cjs) | Per service | 3/day | calendar day | None (memory) | Error response |

---

## 3. DeepSeek Integration

### Primary Implementation (production-gateway.js, lines 27-28, 118-130)

**Configuration:**

```js
const DEEPSEEK_ENDPOINT = process.env.DEEPSEEK_ENDPOINT || 'https://api.deepseek.com/chat/completions';
const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY || (() => {
  try {
    return JSON.parse(fs.readFileSync('/root/.automaton/automaton.json','utf-8')).deepseekApiKey;
  } catch { return ''; }
})();
```

**API Call:**

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

### Second Implementation (playground-ai-handler.cjs, lines 91-129)

Uses a different API endpoint path:

```js
const DEEPSEEK_KEY = process.env.OPENAI_API_KEY || '';
// ...
const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${DEEPSEEK_KEY}`
  },
  body: JSON.stringify({
    model: 'deepseek-chat',
    messages: [
      { role: 'system', content: config.system },
      { role: 'user', content: String(prompt).substring(0, 8000) }
    ],
    max_tokens: 2500,
    temperature: config.temp  // varies from 0.2 to 0.7 per service
  })
});
```

### Third Implementation (services/deepseek-service.cjs)

Uses `https.request` (native Node.js `https` module) instead of `fetch`:

```js
function callDeepSeek(systemPrompt, userMessage, configOverride) {
  return new Promise((resolve, reject) => {
    const apiKey = config.deepseek_key || process.env.DEEPSEEK_KEY;
    const model = configOverride?.model || config.model || 'deepseek-chat';
    const data = JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      max_tokens: configOverride?.max_tokens || 2048,
      temperature: configOverride?.temperature || 0.3,
      stream: false
    });
    // Uses https.request to api.deepseek.com /v1/chat/completions
    // with Authorization: Bearer {apiKey}
  });
}
```

**Key characteristics of DeepSeek integration:**
- **API endpoint:** `https://api.deepseek.com/chat/completions` (or `/v1/chat/completions`)
- **Model:** `deepseek-chat`
- **Auth:** Bearer token stored in `DEEPSEEK_API_KEY` / `OPENAI_API_KEY` env var or `automaton.json`'s `deepseekApiKey` field
- **Max tokens:** 2048–2500
- **Temperature:** 0.2–0.7 (service-dependent)
- **System prompt:** Per-service (analyze, summarize, review, security, explain, refactor, complexity, chat)
- **Fallback:** Returns error message if no API key configured

### Pre-built System Prompts (from deepseek-service.cjs)

```js
const SYSTEM_PROMPTS = {
  analyze:  "You are a professional text analyst...",
  summarize:"You are a professional summarizer...",
  review:   "You are a senior code reviewer... bugs, security, performance, style...",
  security: "You are a security engineer... OWASP Top 10...",
  explain:  "You are a patient programming mentor...",
  refactor: "You are a senior software architect... before/after examples.",
  complexity:"You are a computer science professor... time and space complexity..."
};
```

---

## 4. Static File Serving

### How Static Files Are Served

```js
const CT = path.join(__dirname, 'content');          // /root/automaton/content/
const STATIC_DIR = path.join(__dirname, 'static');   // /root/automaton/static/

// Map /widget/* -> ./static/widget/*
app.use('/widget', express.static(path.join(STATIC_DIR, 'widget'), {
  setHeaders: function(res, filePath) {
    if (filePath.endsWith('.js')) res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
}));

// Map /content/* -> ./static/content/*
app.use('/content', express.static(path.join(STATIC_DIR, 'content'), {
  setHeaders: function(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
}));

// Root-level: any file in /content/ at /{filename}
app.use(express.static(CT));
```

### Three Static Directories

| URL Path | Filesystem Directory | Purpose |
|----------|---------------------|---------|
| `/{filename}` | `./content/` | HTML pages, blog posts, JS, CSS, SVGs (~250+ files) |
| `/widget/*` | `./static/widget/` | Widget JS/CSS assets |
| `/content/*` | `./static/content/` | Additional content assets |

### Landing Page Serving (special-case)

```js
app.get('/', (req, res) => {
  const indexPath = path.join(STATIC_DIR, 'index.html');
  if (fs.existsSync(indexPath)) {
    // Serve from ./static/index.html
  } else {
    const fallbackPath = path.join(CT, 'index.html');
    // Fallback to ./content/index.html
  }
});
```

### Fallback Gateway (production-gateway.js)

The fallback gateway uses a **raw `http.createServer`** (no Express) with a custom router:

```js
const server = http.createServer(async (req, res) => {
  const p = url.parse(req.url).pathname;
  const method = req.method;
  
  // CORS headers set manually
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  // Route matching via if/else chain
  if (p === '/health' || p === '/api/health') { await handleHealth(req, res); return; }
  if (method === 'GET' && !p.startsWith('/api/') && !p.startsWith('/v1/') && ...) {
    await serveStatic(req, res);  // manually reads file from ./content/
    return;
  }
  if (p.startsWith('/free/') && method === 'POST') { await handleFree(req, res); return; }
  if (p.startsWith('/v1/') && method === 'POST') { await handlePremium(req, res); return; }
  // ... more routes ...
});
```

---

## 5. Key Observations

1. **The current active gateway (`gateway.cjs`) has NO DeepSeek integration** — the `/api/code-review` endpoint uses mock/heuristic-based logic, not actual AI. DeepSeek is only wired in `production-gateway.js`, `playground-ai-handler.cjs`, and `services/deepseek-service.cjs`.

2. **The gateway.cjs code review endpoint is a placeholder** — it detects language by keyword matching and generates a rule-based review without calling any AI API.

3. **No `/api/check-free-credits` endpoint exists** — the recommended pattern would be to create one that checks the `rate-limiter.cjs` state or the `FREE_LIMIT` Map.

4. **Rate limiting is fragmented** — 4 different implementations with slightly different behaviors. The `rate-limiter.cjs` is the most feature-complete (persistent, 402 payment flow).

5. **CORS is wide open** — `origin: '*'` on all routes with no restrictions.

6. **Creem payment integration** handles the premium credit system — users buy credits via Stripe-like Creem checkout, get an API key, and use it against premium endpoints.

---

## 6. File Paths Referenced

| File | Purpose |
|------|---------|
| `/root/automaton/gateway.cjs` | **Active gateway** (Express v5, 470 lines) |
| `/root/automaton/production-gateway.js` | Fallback gateway (native http) |
| `/root/automaton/playground-ai-handler.cjs` | Playground AI handler with trial tracking |
| `/root/automaton/rate-limiter.cjs` | Persistent rate limiter with 402 flow |
| `/root/automaton/services/deepseek-service.cjs` | Shared DeepSeek service module |
| `/root/automaton/x402-verify.js` | USDC payment verification |
| `/root/automaton/content/` | Static files (~250+ HTML/JS/CSS files) |
| `/root/automaton/static/` | Widget/content static assets |
| `/root/automaton/api-keys.json` | API key store (credit balances) |
| `/root/automaton/gateway.env` | Creem environment variables |
| `/root/automaton/automaton.json` | DeepSeek API key + config |
| `/root/automaton/data/` | Analytics, session maps, rate-limit state |
