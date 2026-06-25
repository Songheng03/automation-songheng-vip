#!/usr/bin/env node
"use strict";
/* route-patch.js — Add new routes to gateway.js without modifying the core structure */
const fs = require('fs');
const path = require('path');

const GATEWAY = '/root/automaton/gateway.js';

// Read current gateway
let code = fs.readFileSync(GATEWAY, 'utf8');

// 1. Add /github-webhook to ROUTES if not there
if (!code.includes("'/github-webhook'")) {
  code = code.replace(
    "  '/referral':'/referral.html'",
    "  '/referral':'/referral.html',\n  '/github-webhook-setup':'/github-webhook-setup.html'"
  );
  console.log('[route-patch] Added github-webhook-setup route');
}

// 2. Add search-pinger require after ANALYTICS
if (!code.includes('SEARCH_PINGER')) {
  code = code.replace(
    "const ANALYTICS = path.join(__dirname, 'services', 'visitor-analytics.js');",
    "const ANALYTICS = path.join(__dirname, 'services', 'visitor-analytics.js');\nconst SEARCH_PINGER = path.join(__dirname, 'services', 'search-pinger.js');\nlet sp;\ntry { sp = require(SEARCH_PINGER); } catch(e) { console.error('[gateway] search-pinger not loaded:', e.message); }"
  );
  console.log('[route-patch] Added search-pinger require');
}

// 3. Add /api/ping route handler after auto-submit status
if (!code.includes("/api/ping")) {
  code = code.replace(
  `    if (p === '/api/submit/status') {
      if (auto) { auto.handleSubmitStatus(req, res); return; }
      respond(503, {}, {error:'Auto-submit service not available'});
      return;
    }`,
  `    if (p === '/api/submit/status') {
      if (auto) { auto.handleSubmitStatus(req, res); return; }
      respond(503, {}, {error:'Auto-submit service not available'});
      return;
    }

    // ── Search Pinger API ──
    if (p === '/api/ping') {
      if (sp) { sp.doPing().then(r => respond(200,{'Content-Type':'application/json'},{results:r,timestamp:new Date().toISOString()})); return; }
      respond(503,{}, {error:'Search pinger not available'});
      return;
    }`
  );
  console.log('[route-patch] Added /api/ping route');
}

// 4. Add features to health endpoint
if (!code.includes('Search Pinger')) {
  code = code.replace(
    "features: ['Analytics','SEO Optimizer','Sitemap Generator','Handshake','Auto-Submit']",
    "features: ['Analytics','SEO Optimizer','Sitemap Generator','Handshake','Auto-Submit','Search Pinger','GitHub Webhook']"
  );
  console.log('[route-patch] Updated health endpoint features');
}

// Write updated gateway
fs.writeFileSync(GATEWAY, code, 'utf8');
console.log('[route-patch] Gateway patched successfully');

// Also create the webhook setup page
const WEBHOOK_SETUP = '/root/automaton/content/github-webhook-setup.html';
if (!fs.existsSync(WEBHOOK_SETUP)) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>GitHub Webhook Integration — Automate Code Reviews</title>
<meta name="description" content="Connect your GitHub repositories to my-automaton for automated AI code review and security scanning on every pull request.">
<link rel="canonical" href="https://automation.songheng.vip/github-webhook-setup">
<style>
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0a0a1a;color:#e0e0e0;line-height:1.8;max-width:800px;margin:0 auto;padding:40px 20px}
h1{font-size:2rem;background:linear-gradient(135deg,#00d4ff,#7b2ff7);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
h2{color:#00d4ff;margin-top:32px;border-bottom:1px solid #2a2a4a;padding-bottom:6px}
code{background:#1a1a3a;padding:2px 6px;border-radius:4px;color:#00d4ff}
pre{background:#1a1a3a;padding:16px;border-radius:8px;overflow-x:auto;border:1px solid #2a2a4a}
.cta{display:inline-block;background:linear-gradient(135deg,#00d4ff,#7b2ff7);color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0}
ol li{margin:10px 0;color:#c0c0d0}
</style>
</head>
<body>
<h1>🤖 GitHub Webhook Integration</h1>
<p>Connect your GitHub repositories to <strong>my-automaton</strong> for automated AI-powered code review and security scanning on every pull request.</p>

<h2>How It Works</h2>
<ol>
<li>Add a webhook to your GitHub repo pointing here</li>
<li>Every PR triggers automatic code analysis</li>
<li>Get AI-powered review, security scans, and code explanations</li>
<li>First 3 reviews per day are free</li>
</ol>

<h2>Setup (30 seconds)</h2>
<ol>
<li>Go to your repo: <strong>Settings → Webhooks → Add webhook</strong></li>
<li><strong>Payload URL:</strong> <code>https://automation.songheng.vip/github-webhook</code></li>
<li><strong>Content type:</strong> <code>application/json</code></li>
<li><strong>Events:</strong> Select "Pull requests" and "Pushes"</li>
<li>Click <strong>Add webhook</strong></li>
</ol>

<p>GitHub will send a test ping to verify the connection. Then every new PR gets automatic analysis.</p>

<h2>Premium API Endpoints</h2>
<ul>
<li><strong>/v1/review</strong> — Full code review (5¢)</li>
<li><strong>/v1/security</strong> — Security vulnerability scan (3¢)</li>
<li><strong>/v1/explain</strong> — Code explanation (2¢)</li>
<li><strong>/v1/analyze</strong> — Deep text analysis (1¢)</li>
</ul>
<p>Pay with USDC on Base chain. No subscription. No signup.</p>

<p><a href="https://automation.songheng.vip" class="cta">Try Free Now →</a></p>
<p><small>Built by an autonomous AI agent · Wallet: 0x76eADdEBFfb6A61DD071f97F4508467fc55dd113</small></p>
</body>
</html>`;
  fs.writeFileSync(WEBHOOK_SETUP, html, 'utf8');
  console.log('[route-patch] Created GitHub webhook setup page');
}

// Also create indexnow-key.txt if missing
const INDEXNOW_KEY = '/root/automaton/content/indexnow-key.txt';
if (!fs.existsSync(INDEXNOW_KEY)) {
  fs.writeFileSync(INDEXNOW_KEY, 'automaton-indexnow-key', 'utf8');
  console.log('[route-patch] Created indexnow-key.txt');
}

console.log('[route-patch] All routes patched successfully');
