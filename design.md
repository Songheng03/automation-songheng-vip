# Widget Architecture & API Specification

## 1. Overview

This document specifies the architecture, API endpoints, CORS configuration, static file serving, widget behavior, and landing page structure for the **my-automaton** service. The system provides a free-tier code review service with an embeddable widget and analytics tracking.

---

## 2. Gateway Endpoints

All endpoints are served through a single gateway on **port 8080**. No other ports shall be used.

### 2.1 `POST /api/code-review`

- **Purpose:** Free-tier code review. Accepts a code snippet and returns a review.
- **Method:** POST
- **Content-Type:** `application/json`
- **Request Body:**
  ```json
  {
    "code": "string — the source code to review"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "review": "string — the review text/feedback",
    "language": "string — detected language (optional)",
    "timestamp": "string — ISO 8601 timestamp"
  }
  ```
- **Response (400 Bad Request):**
  ```json
  {
    "error": "Missing required field: code"
  }
  ```
- **Response (500 Internal Server Error):**
  ```json
  {
    "error": "string — error description"
  }
  ```
- **Rate Limiting:** Free tier — apply basic rate limiting (e.g., 10 requests per minute per IP) if desired; otherwise, no hard limit for MVP.

### 2.2 `POST /api/embed-count`

- **Purpose:** Increments an embed page-load counter and returns the current count. Used by the widget to track how many times the embed page has been loaded.
- **Method:** POST
- **Content-Type:** `application/json` (body can be empty `{}`)
- **Response (200 OK):**
  ```json
  {
    "count": 123
  }
  ```
- **Behavior:** Each call increments a persistent counter stored in memory or a simple file-based store. Counter starts at 0 on first server start.

### 2.3 `GET /api/embed-count` (optional, admin)

- **Purpose:** Read the current count without incrementing (for landing page display).
- **Method:** GET
- **Response (200 OK):**
  ```json
  {
    "count": 123
  }
  ```

---

## 3. CORS Configuration

All endpoints (`/api/code-review`, `/api/embed-count`, and static files) must have CORS headers that allow requests from **any origin**.

### 3.1 Response Headers

For every HTTP response (API responses and static files):

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Max-Age: 86400
```

### 3.2 Preflight Handling

The gateway must respond to HTTP `OPTIONS` preflight requests with the above headers and a `204 No Content` status.

### 3.3 Rationale

Allowing all origins (`*`) is required because the widget is designed to be embedded on any third-party website. The embed loads from `https://<host>/widget/widget.js` and makes API calls back to the same origin (the gateway), so cross-origin requests will be same-origin when the widget runs on the same host. However, the landing page and embed HTML page may also be served from the same origin. Broad CORS ensures maximum compatibility.

---

## 4. Static File Paths

Two static files must be served by the gateway on port 8080:

| Path | File | Content-Type | Description |
|------|------|-------------|-------------|
| `/widget/widget.js` | `widget.js` | `application/javascript` | Self-contained widget script |
| `/content/embed-widget.html` | `embed-widget.html` | `text/html` | Embeddable HTML page that loads the widget |

These files should be served from a static directory (e.g., `./static/` mapped to URL paths). Example mapping:

- File system path: `./static/widget/widget.js` → URL: `/widget/widget.js`
- File system path: `./static/content/embed-widget.html` → URL: `/content/embed-widget.html`

### 4.1 Directory Structure

```
project/
├── gateway.js          # Main gateway/server entry point
├── static/
│   ├── widget/
│   │   └── widget.js   # Widget JavaScript
│   └── content/
│       └── embed-widget.html  # Embed HTML page
└── design.md           # This design document
```

### 4.2 Serving Logic (Gateway Pseudocode)

```
if path starts with "/widget/" or "/content/":
    serve file from ./static/<path>
    add CORS headers
elif path == "/api/code-review":
    handle code review POST
elif path == "/api/embed-count":
    handle embed count POST or GET
else:
    serve ./static/index.html (landing page)
    add CORS headers
```

---

## 5. Widget Behavior

The widget is a **self-contained JavaScript file** (`/widget/widget.js`) that can be embedded in any HTML page via a `<script>` tag.

### 5.1 Widget Initialization

When the script loads, it automatically:
1. Creates a container `<div>` with a unique ID (e.g., `my-automaton-widget`).
2. Renders a styled UI with:
   - A `<textarea>` element for code input (placeholder: "Paste your code here...").
   - An "Analyze" button (or "Review Code").
   - A result area (`<div>`) to display the review output, initially empty.
   - A footer link: `<a href="https://my-automaton.example.com" target="_blank">Powered by my-automaton</a>`.
3. Appends the container to the page body (or to a specific element if the page provides a designated container with `data-my-automaton-widget` attribute).

### 5.2 Widget Lifecycle

#### On load:
- The widget calls `POST /api/embed-count` with body `{}` to increment the page-load counter. This is a **fire-and-forget** call (no waiting for response before rendering).

#### On "Analyze" button click:
1. Read text from the textarea.
2. If empty, display an error message in the result area ("Please enter code to review").
3. If non-empty, set button to "Analyzing..." (disabled state).
4. Send `POST /api/code-review` with `{ "code": "<textarea content>" }`.
5. On success: display the review text in the result area with formatting.
6. On error: display an error message in the result area.
7. Re-enable the button and restore its text to "Analyze".

### 5.3 Widget CSS (Inline)

The widget should include its own styles via JavaScript (injected `<style>` element) to avoid dependency on external stylesheets. The style should be minimal and clean:

- Container: centered, max-width 600px, border, padding, border-radius, sans-serif font.
- Textarea: full width, monospace font, min-height 150px, padding, border.
- Button: styled, hover effect.
- Result area: margin-top, padding, background highlight.
- Footer: small text, centered, margin-top.

### 5.4 Widget Embed Usage

Landing page embed (inside `<head>` or before `</body>`):
```html
<script src="/widget/widget.js"></script>
```

Third-party embed (full iframe-style via the embed HTML page):
```html
<iframe src="https://example.com/content/embed-widget.html"
        width="100%" height="400" frameborder="0"></iframe>
```

### 5.5 Embed HTML Page (`/content/embed-widget.html`)

A minimal HTML page that:
- Loads the widget script: `<script src="/widget/widget.js"></script>`
- Has a minimal HTML structure with just `<head>` and `<body>`.
- The widget script will auto-inject itself into the page body.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Code Review Widget</title>
</head>
<body>
  <script src="/widget/widget.js"></script>
</body>
</html>
```

---

## 6. Landing Page Structure

The landing page is served at the root (`/` or `GET /` → `./static/index.html`).

### 6.1 Page Sections

The landing page must include the following sections, in order:

#### 6.1.1 Hero Section
- Title: "AI Code Review Widget"
- Subtitle: "Free, embeddable code review for your website"
- A brief description of the service.

#### 6.1.2 Live Demo Section
- The widget embedded directly on the page via `<script src="/widget/widget.js"></script>`.
- A "Try it yourself" heading.
- A container with `data-my-automaton-widget` attribute so the widget renders in a specific location rather than appending to body.
- This allows visitors to test the code review functionality immediately.

#### 6.1.3 Embed Code Section
- Heading: "Embed on Your Site"
- Show a pre-formatted code snippet that users can copy-paste:
  ```html
  <script src="https://YOURDOMAIN/widget/widget.js"></script>
  ```
  (Replace `YOURDOMAIN` with the actual domain dynamically via JavaScript or at build time.)
- Also show the iframe embed option:
  ```html
  <iframe src="https://YOURDOMAIN/content/embed-widget.html"
          width="100%" height="450" frameborder="0"></iframe>
  ```
- A "Copy to Clipboard" button next to each snippet (using the Clipboard API).

#### 6.1.4 Analytics Counter Section
- Heading: "Widget Load Count"
- Display the current embed count fetched via `GET /api/embed-count`.
- Styling: large number display (e.g., `42` in a bold, large font).
- Auto-refresh or manual refresh button.

#### 6.1.5 Share Buttons Section
- Heading: "Share the Widget"
- Social sharing links/buttons for:
  - Twitter/X: share URL with text about the service.
  - LinkedIn: share URL.
  - Facebook: share URL.
  - Copy link button.
- Each button should open the respective share dialog in a new tab (or use the Web Share API if available).

#### 6.1.6 Footer
- "Powered by my-automaton" text.
- Link to the project (could be same domain or external).

### 6.2 Landing Page Technical Requirements

- **Responsive design**: The page must work on desktop and mobile.
- **No external dependencies**: All CSS and JS should be self-contained (no CDN, no external frameworks).
- **Minimal CSS**: Clean, modern design with CSS variables for easy theming.
- **Defer widget loading**: The widget script should be loaded with `async` or `defer` to not block page rendering.
- **Dynamic domain**: The embed code snippets should dynamically insert the current domain so the copy-paste works for any deployment.

### 6.3 Landing Page File

Path: `./static/index.html`

This file is served at the root path `/`.

---

## 7. Widget JavaScript Specification (Detailed)

### 7.1 Function: `createWidget(container?)`

If `container` argument is provided (a DOM element), render inside it. Otherwise, create a new container and append to `document.body`.

### 7.2 Internal Structure

```
<div class="mat-widget">
  <style>...</style>  <!-- injected inline styles -->
  <div class="mat-widget-header">
    <h3>AI Code Review</h3>
  </div>
  <div class="mat-widget-body">
    <textarea class="mat-widget-input" placeholder="Paste your code here..."></textarea>
    <button class="mat-widget-button">Analyze</button>
    <div class="mat-widget-result" style="display:none"></div>
  </div>
  <div class="mat-widget-footer">
    <a href="https://my-automaton.example.com" target="_blank" rel="noopener">Powered by my-automaton</a>
  </div>
</div>
```

### 7.3 JavaScript Logic (Pseudocode)

```js
(function() {
  'use strict';

  // Avoid duplicate initialization
  if (document.querySelector('.mat-widget')) return;

  const BASE_URL = window.location.origin;

  // Find container or create one
  let container = document.querySelector('[data-my-automaton-widget]');
  const isEmbed = !container;
  if (isEmbed) {
    container = document.createElement('div');
    document.body.appendChild(container);
  }

  // Build widget HTML
  container.innerHTML = `...`; // as per structure above

  // Inject styles
  const style = document.createElement('style');
  style.textContent = `/* widget CSS */`;
  container.querySelector('.mat-widget').prepend(style);

  // Fire embed count on load
  fetch(BASE_URL + '/api/embed-count', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}'
  }).catch(function() { /* silent fail */ });

  // Attach analyze handler
  const button = container.querySelector('.mat-widget-button');
  const textarea = container.querySelector('.mat-widget-input');
  const result = container.querySelector('.mat-widget-result');

  button.addEventListener('click', function() {
    const code = textarea.value.trim();
    if (!code) {
      result.textContent = 'Please enter code to review';
      result.style.display = 'block';
      return;
    }
    button.disabled = true;
    button.textContent = 'Analyzing...';
    fetch(BASE_URL + '/api/code-review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: code })
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      result.textContent = data.review || 'No review available';
      result.style.display = 'block';
    })
    .catch(function() {
      result.textContent = 'Error: Could not complete the review. Please try again.';
      result.style.display = 'block';
    })
    .finally(function() {
      button.disabled = false;
      button.textContent = 'Analyze';
    });
  });
})();
```

---

## 8. Implementation Order (for Executor)

1. **Create directory structure**: `static/widget/`, `static/content/`.
2. **Implement `widget.js`** — the self-contained widget script with all behavior described in Section 5 and 7.
3. **Implement `embed-widget.html`** — minimal HTML page that loads the widget.
4. **Implement `index.html`** — landing page with all sections (hero, live demo, embed code, counter, share buttons).
5. **Implement gateway** — Node.js/Express or similar HTTP server on port 8080 that:
   - Serves static files from `./static/`.
   - Handles `POST /api/code-review` (free-tier logic — can use a mock or simple rule-based review for MVP).
   - Handles `POST /api/embed-count` (increment and return count).
   - Handles `GET /api/embed-count` (read count).
   - Applies CORS headers to all responses.
   - Responds to `OPTIONS` preflight with CORS headers.
6. **Test**:
   - Landing page loads at `http://localhost:8080/`.
   - Widget appears and is functional.
   - Code review API returns results.
   - Embed count increments on page load.
   - CORS headers present on all responses.

---

## 9. Appendix: Code Review Backend (Free Tier)

For the MVP, the `/api/code-review` endpoint can implement a simple rule-based reviewer:

- Check for common patterns (TODO comments, missing error handling, hardcoded values).
- Return a basic analysis with suggestions.
- Optionally, integrate with a free LLM API (if available) for more meaningful reviews.

The exact implementation is left to the executor, but the API contract in Section 2.1 must be honored.

---

## 10. Appendix: Embed Count Persistence

For simplicity, the counter can be stored in a plain JSON file on disk (e.g., `counter.json` with `{"count": 0}`). This survives server restarts. Alternatively, an in-memory variable is acceptable for MVP but will reset on restart.

---

## 11. Success Criteria Checklist

- [ ] `POST /api/code-review` returns valid review JSON.
- [ ] `POST /api/embed-count` increments and returns count.
- [ ] `GET /api/embed-count` returns current count.
- [ ] All endpoints include CORS headers (`Access-Control-Allow-Origin: *`).
- [ ] `OPTIONS` preflight responds with `204` and correct CORS headers.
- [ ] `/widget/widget.js` is served with `Content-Type: application/javascript`.
- [ ] `/content/embed-widget.html` is served as HTML.
- [ ] Widget renders a textarea, button, result area, and "Powered by my-automaton" link.
- [ ] Widget calls `/api/embed-count` on load (fire-and-forget).
- [ ] Widget calls `/api/code-review` on button click and displays result.
- [ ] Landing page (`/`) includes live demo, embed code snippet with copy button, analytics counter, and share buttons.
- [ ] No services running on ports other than 8080.
