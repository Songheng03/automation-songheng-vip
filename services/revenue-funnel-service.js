// revenue-funnel-service.js — Drives conversions: free → paid
// Tracks every free user, sends upgrade prompts, exposes /upgrade page

const fs = require('fs');
const path = require('path');

const CONVERSION_FILE = '/root/automaton/data/conversions.json';

function load() {
  try { return JSON.parse(fs.readFileSync(CONVERSION_FILE, 'utf8')); }
  catch { return { freeUses: {}, upgrades: [], totalFree: 0, totalUpgrades: 0, conversionRate: 0, started: new Date().toISOString() }; }
}

function save(d) { fs.writeFileSync(CONVERSION_FILE, JSON.stringify(d, null, 2)); }

function mount(app) {
  if (!app) return;

  // Track free tier usage — intercept free-tier-service responses
  app.use('/api/free/', (req, res, next) => {
    const data = load();
    data.totalFree++;
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.ip;
    if (!data.freeUses[ip]) data.freeUses[ip] = { count: 0, firstSeen: new Date().toISOString(), lastSeen: null };
    data.freeUses[ip].count++;
    data.freeUses[ip].lastSeen = new Date().toISOString();
    data.conversionRate = data.totalUpgrades > 0 ? (data.totalUpgrades / data.totalFree * 100).toFixed(2) : 0;
    save(data);
    next();
  });

  // Upgrade page — shows value prop + wallet address
  app.get('/upgrade', (req, res) => {
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.ip;
    const data = load();
    const uses = data.freeUses[ip]?.count || 0;
    const remaining = Math.max(0, 3 - uses);
    
    res.send(`<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Upgrade — my-automaton Premium API</title>
<meta name="description" content="Upgrade to premium AI APIs. Pay per request with USDC on Base chain. No monthly fees.">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0d1117;color:#c9d1d9;padding:2rem;max-width:800px;margin:0 auto}
h1{color:#58a6ff;font-size:2rem;margin-bottom:1rem}
h2{color:#f0f6fc;margin:2rem 0 1rem}
.card{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:1.5rem;margin:1rem 0}
.price-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:0.75rem;margin:1rem 0}
.price-card{background:#0d1117;border:1px solid #30363d;border-radius:6px;padding:1rem;text-align:center}
.price-card .cost{font-size:1.5rem;font-weight:700;color:#3fb950}
.price-card .name{font-size:0.85rem;color:#8b949e;margin-top:0.25rem}
code{background:#21262d;padding:0.2rem 0.4rem;border-radius:4px;font-size:0.9rem}
.cta{display:inline-block;background:#238636;color:#fff;padding:0.75rem 1.5rem;border-radius:6px;text-decoration:none;font-weight:600;margin:0.5rem 0}
.cta:hover{background:#2ea043}
.free-badge{display:inline-block;background:#2ea04322;color:#3fb950;border:1px solid#2ea04344;border-radius:100px;padding:0.2rem 0.6rem;font-size:0.8rem;margin-left:0.5rem}
</style></head>
<body>
<h1>⚡ Premium AI API Access</h1>
<p>You've used <strong>${uses}</strong> free requests. ${remaining > 0 ? \`You have <strong>${remaining}</strong> free requests remaining today.\` : 'Free tier exhausted for today.'}</p>
<div class="card">
<h2>💎 Pay Per Request — No Subscription</h2>
<p>Send exact amount in USDC on <strong>Base chain</strong> to this wallet:</p>
<p style="font-size:1.2rem;margin:1rem 0;word-break:break-all"><code>0x76eADdEBFfb6A61DD071f97F4508467fc55dd113</code></p>
<p>Then retry your API call with header <code>X-X402-Payment: &lt;tx_hash&gt;</code></p>
</div>
<h2>Pricing</h2>
<div class="price-grid">
<div class="price-card"><div class="cost">1¢</div><div class="name">Text Analysis<br><code>/v1/analyze</code></div></div>
<div class="price-card"><div class="cost">2¢</div><div class="name">Summarize<br><code>/v1/summarize</code></div></div>
<div class="price-card"><div class="cost">5¢</div><div class="name">Code Review<br><code>/v1/review</code></div></div>
<div class="price-card"><div class="cost">3¢</div><div class="name">Security Scan<br><code>/v1/security</code></div></div>
<div class="price-card"><div class="cost">2¢</div><div class="name">Explain<br><code>/v1/explain</code></div></div>
<div class="price-card"><div class="cost">5¢</div><div class="name">Refactor<br><code>/v1/refactor</code></div></div>
<div class="price-card"><div class="cost">2¢</div><div class="name">Complexity<br><code>/v1/complexity</code></div></div>
<div class="price-card"><div class="cost">5¢</div><div class="name">Batch (10)<br><code>/v1/batch</code></div></div>
<div class="price-card"><div class="cost">3¢</div><div class="name">Render<br><code>/v1/render</code></div></div>
</div>
<div class="card">
<h2>🔧 Quick Start</h2>
<pre style="background:#0d1117;padding:1rem;border-radius:6px;overflow-x:auto;margin-top:0.5rem"><code style="font-size:0.85rem"># 1. Call API normally
curl -X POST https://automation.songheng.vip/v1/analyze \\
  -H "Content-Type: application/json" \\
  -d '{"text":"Your text here"}'

# 2. If HTTP 402, send USDC to wallet above
# 3. Retry with payment header
curl -X POST https://automation.songheng.vip/v1/analyze \\
  -H "Content-Type: application/json" \\
  -H "X-X402-Payment: 0xYOUR_TX_HASH" \\
  -d '{"text":"Your text here"}'</code></pre>
</div>
<p style="text-align:center;margin-top:2rem"><a class="cta" href="/playground">Try in Browser Playground →</a></p>
</body></html>`);
  });

  // Conversions API
  app.get('/api/conversions', (req, res) => {
    res.json(load());
  });

  // Track paid request (call from x402-service or manually)
  app.post('/api/conversions/upgrade', (req, res) => {
    const data = load();
    data.totalUpgrades++;
    data.upgrades.push({ timestamp: new Date().toISOString(), endpoint: req.body?.endpoint || 'unknown', amount: req.body?.amount || 0 });
    data.conversionRate = ((data.totalUpgrades / Math.max(data.totalFree, 1)) * 100).toFixed(2);
    save(data);
    res.json({ status: 'tracked', totalUpgrades: data.totalUpgrades });
  });

  console.log('[FUNNEL] Conversion tracking active');
  console.log('[FUNNEL] Mounted: GET /upgrade, GET /api/conversions, POST /api/conversions/upgrade');
}

module.exports = { mount };
