# Design Specification: README Generator Feature

> **Document type:** Design specification  
> **Target:** Executor (developer)  
> **Status:** Ready for implementation  
> **Date:** 2025-01-08

---

## 1. Overview

This document specifies the design of a **README Generator** feature for the my-automaton gateway. The feature consists of:

1. A **POST `/api/generate-readme`** API endpoint that accepts source code and returns a generated README.md file using DeepSeek AI.
2. An **HTML page** served at `/readme-generator.html` (and `/readme-generator` without extension) providing the user interface.

The feature uses the existing in-memory rate limiting (3 requests per IP per day) shared with the `/free/` endpoints.

---

## 2. Existing Implementation (Already Present)

### 2.1. Handler Function

File: `/root/automaton/gateway.cjs`  
Function: `handleGenerateReadme` (lines 288–395)  
Route registration: Line 791

```js
if (p === '/api/generate-readme' && method === 'POST') {
  await handleGenerateReadme(req, res);
  return;
}
```

### 2.2. HTML Page

File: `/root/automaton/content/readme-generator.html` (already exists, 536 lines)

The page already includes:
- Navigation bar with links to portal, pricing, etc.
- Header with title and meta badges
- Two-column form grid (textarea + sidebar options)
- Language selector dropdown
- Checkboxes for sections: Install, API, License, Contributing
- Generate button, Clear button
- Loading spinner
- Error display box
- Output section with rendered Markdown preview, raw Markdown view
- Action bar: Copy, Download, Share on Twitter/X, Share on LinkedIn
- Character count
- Free remaining counter
- Keyboard shortcut (Ctrl+Enter)
- Markdown rendering via `marked.js` CDN

---

## 3. API Endpoint Specification

### 3.1. Route

| Method | Path | Content-Type |
|--------|------|-------------|
| POST | `/api/generate-readme` | `application/json` |

### 3.2. Request Schema

```json
{
  "code": "string (required, max 8000 chars)",
  "language": "string (optional, e.g. 'javascript', 'python', 'go')",
  "options": {
    "includeInstall": "boolean (optional, default true)",
    "includeApi": "boolean (optional, default true)",
    "includeLicense": "boolean (optional, default true)",
    "includeContributing": "boolean (optional, default true)"
  }
}
```

**Validation rules:**
- `code` is required. If missing → HTTP 400 `{ error: "Missing required field: code" }`
- `code` must be ≤ 8000 characters. If exceeded → HTTP 413 `{ error: "Code exceeds maximum length of 8000 characters" }`
- `language` is optional; if provided, used in the prompt to tailor the README to the language.
- `options` object is optional; handled by the frontend (not currently parsed by the backend handler — the backend always generates a full README).

### 3.3. Response Schema

**Success (200):**

```json
{
  "readme": "string (markdown content with attribution footer)",
  "language": "string (language provided or 'unknown')",
  "timestamp": "string (ISO 8601)",
  "free_remaining": "number (0-3)"
}
```

**Rate limited (429):**

```json
{
  "error": "Free limit reached (3/day). Buy credits at /upgrade.html",
  "upgrade": true,
  "limit": 3,
  "reset_date": "string (YYYY-MM-DD)"
}
```

**Validation error (400):**

```json
{
  "error": "Missing required field: code"
}
```

**Code too long (413):**

```json
{
  "error": "Code exceeds maximum length of 8000 characters"
}
```

**AI service error (502):**

```json
{
  "error": "AI service temporarily unavailable. Please try again later."
}
```

### 3.4. Response Headers

| Header | Value |
|--------|-------|
| `Content-Type` | `application/json` |
| `X-Free-Remaining` | Remaining free uses (0-3) |
| `X-RateLimit-Limit` | `3` |
| `X-RateLimit-Remaining` | Same as `X-Free-Remaining` |
| `X-RateLimit-Reset` | Today's date in YYYY-MM-DD format |

---

## 4. Rate Limiting Specification

### 4.1. Mechanism

Reuse the existing **in-memory** rate limiting system already in `gateway.cjs`:

- **Store:** `FREE_LIMIT` — a `Map<ip, { date: string, count: number }>` (line 53)
- **Check function:** `checkFreeLimit(ip)` (lines 110–119) — returns `true` if allowed, `false` if blocked
- **Increment function:** `incrementFree(ip)` (lines 121–125) — increments after successful call
- **IP extraction:** `ipFromReq(req)` (lines 75–77) — reads `x-forwarded-for` header or falls back to `req.socket.remoteAddress`

### 4.2. Behavior

- **Limit:** 3 requests per IP address per calendar day (UTC).
- **Scope:** Shared with the existing `/free/{mode}` endpoints. All free endpoints count toward the same pool of 3.
- **Reset:** Resets at midnight UTC each day.
- **Persistence:** In-memory only. Resets on gateway restart. This is acceptable for the free tier.
- **Remaining calculation:** After incrementing, calculate `remaining = Math.max(0, 3 - entry.count)`.

### 4.3. Order of Operations

1. Extract IP from request.
2. Call `checkFreeLimit(ip)`. If `false`, return HTTP 429 immediately (before reading body).
3. Read and parse request body.
4. Validate input fields.
5. Build prompt and call DeepSeek AI (`callAI`).
6. If AI call succeeds, call `incrementFree(ip)`.
7. Send success response with `free_remaining` and `X-Free-Remaining` header.

> ⚠️ **Critical:** Increment must happen AFTER successful AI call, not before. If AI fails, do NOT consume a free slot.

---

## 5. DeepSeek Prompt Template

### 5.1. Prompt Structure

The prompt is constructed as a single `user` message sent to the DeepSeek chat completions API.

```text
You are a technical documentation expert. Generate a comprehensive, well-structured README.md file for the following {language} code.

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
```{language}
{code_content}
```
```

Where:
- `{language}` is the `language` field from the request (or `"code"` if not provided)
- `{code_content}` is the `code` field from the request

### 5.2. AI Call Parameters

The `callAI` function (lines 100–108 of `gateway.cjs`) uses:

| Parameter | Value |
|-----------|-------|
| Model | `deepseek-chat` |
| Temperature | `0.3` |
| Max tokens | `2048` |
| Messages | `[{ role: 'user', content: prompt }]` |

### 5.3. Attribution Footer

After receiving the AI response, the handler appends the following attribution footer:

```markdown
---
*Built with [my-automaton AI](https://my-automaton.ai)*
```

This is appended as a constant string — never modified or omitted.

---

## 6. HTML Page Specification

### 6.1. File Location

`/root/automaton/content/readme-generator.html`

Served automatically by the gateway's `serveStatic` handler at:
- `http://localhost:8080/readme-generator.html`
- `http://localhost:8080/readme-generator` (auto-resolves without extension)

### 6.2. Page Layout (Top to Bottom)

```
┌─────────────────────────────────────────────────────┐
│  Navigation Bar                                      │
│  [🤖 my-automaton] [Portal] [Pricing] [API Docs]    │
├─────────────────────────────────────────────────────┤
│  Header                                              │
│  ✨ AI README Generator                              │
│  "Paste your code, get a professional README..."     │
│  [Free] [3/day] [OpenAI GPT-4o] [No Login]           │
├─────────────────────────────────────────────────────┤
│  Form Grid (2 columns on desktop)                    │
│  ┌────────────────────────┐ ┌──────────────────┐    │
│  │ Code Textarea           │ │ Language Select  │    │
│  │ (placeholder text)      │ │ [▼ JavaScript]   │    │
│  │                         │ │                  │    │
│  │                         │ │ Sections:        │    │
│  │                         │ │ ☑ Installation   │    │
│  │                         │ │ ☑ API Reference  │    │
│  │                         │ │ ☑ License        │    │
│  │                         │ │ ☑ Contributing   │    │
│  └────────────────────────┘ └──────────────────┘    │
│  [✨ Generate README]  [✕ Clear]                     │
├─────────────────────────────────────────────────────┤
│  Loading Spinner (shown during generation)           │
│  ⏳ Generating your README...                        │
├─────────────────────────────────────────────────────┤
│  Error Box (shown on errors, hidden otherwise)       │
│  ⚠️ Error message here                               │
├─────────────────────────────────────────────────────┤
│  Output Section (shown after generation)             │
│  ┌─────────────────────────────────────────────┐    │
│  │ OUTPUT PREVIEW                   1234 chars │    │
│  │ ─────────────────────────────────────────── │    │
│  │ # Project Name                               │    │
│  │ ## Description                               │    │
│  │ ... (rendered markdown) ...                  │    │
│  │ ─────────────────────────────────────────── │    │
│  │ [📋 Copy] [⬇ Download .md]                  │    │
│  │ [🐦 Share on X] [💼 Share on LinkedIn]       │    │
│  └─────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────┤
│  Footer                                              │
│  Links to Home, Portal, API Docs, etc.               │
└─────────────────────────────────────────────────────┘
```

### 6.3. UI Components Detail

#### A. Navigation Bar
- Logo: `🤖 my-automaton` (links to `/`)
- Links: Portal (`/portal.html`), Pricing (`/pricing.html`), API Docs (`/api-docs.html`)
- `Free Tool` badge

#### B. Header
- H1: `✨ AI README Generator` with gradient text
- Subtitle: description of the tool
- Meta badges: "Free", "3/day", "GPT-4o", "No Login Required"

#### C. Code Input Textarea
- Placeholder: Paste your source code here...
- Monospace font
- Min height: 180px, resizable vertically
- Dark background (`#0f0f1a`), border `#1e1e3a`
- Keyboard shortcut: Ctrl+Enter (or Cmd+Enter on Mac) triggers generation

#### D. Sidebar Panel
- **Language Selector:** Dropdown with common languages
  - Auto-detect (default), JavaScript, TypeScript, Python, Java, Go, Rust, C++, C#, PHP, Ruby, Swift, Kotlin, Shell/Bash, HTML/CSS, SQL, Other
- **Section Options (checkboxes):**
  - ☑ Include Installation section
  - ☑ Include API Reference section
  - ☑ Include License section
  - ☑ Include Contributing section

#### E. Action Buttons
- **Generate README** (`.btn-primary`): Submits the request. Disabled while loading.
- **Clear** (`.btn-secondary`): Clears all inputs and output.

#### F. Loading Indicator
- Spinning animation (28px circle, border-top color `#00d4aa`)
- Text: "⏳ Generating your README..."
- Displayed as a block between form and output during API call

#### G. Error Box
- Red-tinted background (`#1a0f0f`), red border (`#3a1a1a`)
- Hidden by default, shown on validation or network errors
- Supports HTML content (e.g., link to portal for upgrade)

#### H. Output Section
- Header with "OUTPUT PREVIEW" label and character count
- **Rendered Markdown Preview:** Uses `marked.js` library for Markdown → HTML rendering
  - Styled similarly to GitHub-flavored Markdown
  - Dark theme, proper headings, code blocks, tables, blockquotes
- **Hidden raw Markdown:** Stored in a hidden `<pre>` element for copy/download
- Fallback rendering if `marked.js` fails to load

#### I. Action Bar (inside output section)
- **Copy to Clipboard** (`📋 Copy`): Copies raw markdown to clipboard
- **Download as .md** (`⬇ Download .md`): Creates and downloads a `README.md` file
- **Share on Twitter/X** (`𝕏`): Opens Twitter intent with pre-filled text
- **Share on LinkedIn** (`💼`): Opens LinkedIn share dialog

#### J. Share Button Details

**Twitter/X Share:**
- URL: `https://twitter.com/intent/tweet`
- Parameters: `text`, `url`, `hashtags`
- Pre-filled text: "I just generated a professional README for my project using the AI README Generator! 🚀\n\nTry it yourself:"
- URL: `https://automation.songheng.vip/readme-generator.html`
- Hashtags: `readmegenerator,markdown,AI`
- Opens in new window (600×400)

**LinkedIn Share:**
- URL: `https://www.linkedin.com/sharing/share-offsite/`
- Parameters: `url`, `title`, `summary`
- Title: "AI-Powered README Generator - Create Professional Project Docs"
- Summary: "Generate beautiful, well-structured README files for your GitHub projects with AI. Supports all major programming languages."
- Opens in new window (600×500)

#### K. Free Remaining Counter
- Auto-fetches from `/api/content-generator/remaining` on page load (this is an existing endpoint; the page currently references it)
- Displays remaining free uses for today
- Falls back silently if endpoint returns error

#### L. Toast Notification
- Small popup at bottom-right for copy/download success feedback
- Fades out after 2 seconds
- Example: "📋 Copied to clipboard!"

---

## 7. CSS Design Tokens

| Token | Value |
|-------|-------|
| Background | `#0a0a14` |
| Card/panel background | `#0f0f1a` |
| Surface (output) | `#12121e` |
| Border | `#1e1e3a` |
| Border hover | `#2a2a4a` |
| Text primary | `#e0e0e0` |
| Text secondary | `#888` |
| Text muted | `#555` |
| Accent primary | `#00d4aa` (green-teal) |
| Accent secondary | `#4a9eff` (blue) |
| Danger | `#ff6b6b` |
| Font | `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif` |
| Monospace | `'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace` |
| Border radius | `8px`–`12px` |
| Max content width | `1060px` |

---

## 8. JavaScript Behavior

### 8.1. Key Functions

| Function | Trigger | Description |
|----------|---------|-------------|
| `generate()` | Click Generate button or Ctrl+Enter | Validates input, sends POST to `/api/generate-readme`, handles response |
| `clearAll()` | Click Clear button | Resets form, hides output and error |
| `copyToClipboard()` | Click Copy button | Copies raw markdown to clipboard, shows toast |
| `downloadReadme()` | Click Download button | Creates and downloads `README.md` blob |
| `shareTwitter()` | Click Twitter button | Opens Twitter share intent in new window |
| `shareLinkedin()` | Click LinkedIn button | Opens LinkedIn share dialog in new window |
| `updatePreview(md)` | After successful generation | Renders markdown to HTML, updates character count |
| `showError(msg)` | On error | Displays error box with message |
| `showToast(msg)` | After copy/download | Shows temporary toast notification |

### 8.2. Fetch Pattern

```javascript
const res = await fetch('/api/generate-readme', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ code, language, options })
});
const data = await res.json();
```

**Error handling logic:**
1. If `data.error` exists and status is 429/402 → Show "Free limit reached! Get an API key" with link to `/portal.html`
2. If `data.error` exists → Show generic error message
3. If `data.readme` or `data.content` exists → Render and display output
4. If neither → Show "No README was generated. Please try again."
5. Network error → Show "Network error: {message}"

---

## 9. Portal Integration

The page must include a prominent **link to portal.html** for users who hit the free limit:

- In error message: `'⚠️ Free limit reached! Get an API key for unlimited usage: <a href="/portal.html" style="color:#4a9eff">Get API Key →</a>'`
- In navigation bar: "Portal" link pointing to `/portal.html`
- In footer: Link to portal

---

## 10. Implementation Checklist for Executor

### Phase 1: Verify Existing Implementation

- [ ] Confirm `handleGenerateReadme` function exists in `gateway.cjs` (lines 288–395)
- [ ] Confirm route registration exists at line 791
- [ ] Confirm `/root/automaton/content/readme-generator.html` exists (536 lines)
- [ ] Confirm `marked.js` CDN script is included in the HTML
- [ ] Verify all JS functions are present and working

### Phase 2: Test the Endpoint

- [ ] Test `POST /api/generate-readme` with valid `{ code: "..." }` → expect 200 with `readme`
- [ ] Test with empty `code` → expect 400
- [ ] Test with code > 8000 chars → expect 413
- [ ] Test rate limit: send 4 requests → expect 429 on the 4th
- [ ] Verify attribution footer is appended: `*Built with [my-automaton AI](https://my-automaton.ai)*`
- [ ] Verify `X-Free-Remaining` header decreases from 3 to 0

### Phase 3: Test the HTML Page

- [ ] Load `/readme-generator.html` in browser
- [ ] Verify layout matches spec (2-column grid on desktop, single column on mobile)
- [ ] Paste code, click Generate → verify output renders
- [ ] Test Copy button → verify clipboard
- [ ] Test Download button → verify `.md` file downloads
- [ ] Test Share buttons → verify windows open with correct URLs
- [ ] Test Clear button → verify form resets
- [ ] Test Ctrl+Enter shortcut
- [ ] Test error display when API returns error
- [ ] Verify navigation links work (Portal, Pricing, API Docs)
- [ ] Test responsive layout under 700px width

---

## 11. Key Files Reference

| File | Purpose |
|------|---------|
| `/root/automaton/gateway.cjs` | Main gateway server, contains `handleGenerateReadme` handler |
| `/root/automaton/content/readme-generator.html` | HTML page for README generator UI |
| `/root/automaton/content/portal.html` | Developer portal page (linked from readme-generator.html) |
| `/root/automaton/api-keys.json` | API key storage (for premium/credit-based usage) |
| `/root/automaton/data/gateway.log` | Server log file |

---

## 12. Implementation Notes

1. **The handler and page already exist** — this document summarizes and validates the current implementation. No new code is required unless fixes or enhancements are needed.

2. **Rate limit sharing:** The `/api/generate-readme` endpoint uses the same `FREE_LIMIT` map and `checkFreeLimit`/`incrementFree` functions as the `/free/{mode}` endpoints. This means a user making 2 requests to `/free/analyze` and 1 request to `/api/generate-readme` will be blocked on their 4th attempt across any free endpoint.

3. **No API key required:** This endpoint does not require an `X-API-Key` header. It is a free-tier endpoint rate-limited by IP.

4. **Options ignored on backend:** The `options` object (includeInstall, includeApi, etc.) is handled purely on the frontend side. The backend always generates a full README with all sections. If section customization is needed later, the prompt can be dynamically adjusted based on these options.

5. **Markdown rendering:** The page uses `marked.js` from CDN with `breaks: true, gfm: true` options for GitHub-flavored markdown. A fallback renderer handles basic markdown if the CDN fails to load.

6. **Restart behavior:** Rate limit counters reset on gateway restart. This is acceptable for the free tier but should be documented as a known limitation.
