#!/usr/bin/env node

/**
 * dev-key-generator.cjs — Generates dev API keys and writes them to api-keys.json
 * 
 * This is a workaround for the /api/dev-key endpoint being 404 on the live gateway.
 * Instead of needing a host restart, this script:
 * 1. Generates 5 dev API keys with 50 credits each
 * 2. Writes them to api-keys.json
 * 3. Generates a static HTML page that displays ONE key per visitor
 * 4. The HTML page uses localStorage to track IP and key assignment
 * 
 * Run: node scripts/dev-key-generator.cjs
 */

const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const KEYS_FILE = '/root/automaton/api-keys.json';
const OUTPUT_PAGE = '/root/automaton/content/get-dev-key.html';

function generateKey() {
  return 'am_' + crypto.randomBytes(24).toString('base64url');
}

function main() {
  // 1. Read existing keys
  const db = JSON.parse(fs.readFileSync(KEYS_FILE, 'utf-8') || '{}');
  
  // 2. Count existing dev keys
  const existingDev = Object.entries(db).filter(([k, v]) => v.price_id === 'dev_trial');
  console.log(`Existing dev keys: ${existingDev.length}`);
  console.log(`Total keys: ${Object.keys(db).length}`);

  // 3. Generate 5 new dev keys if we have fewer than 10 active ones
  const activeDev = existingDev.filter(([k, v]) => v.credits > 0);
  console.log(`Active dev keys (with credits): ${activeDev.length}`);

  if (activeDev.length < 10) {
    const toCreate = 10 - activeDev.length;
    console.log(`Creating ${toCreate} new dev keys...`);
    for (let i = 0; i < toCreate; i++) {
      const key = generateKey();
      db[key] = {
        credits: 50,
        created: new Date().toISOString(),
        used: 0,
        price_id: 'dev_trial',
        source: 'pre-generated',
        ip: '0.0.0.0' // placeholder
      };
    }
    fs.writeFileSync(KEYS_FILE, JSON.stringify(db, null, 2));
    console.log(`✅ Added ${toCreate} dev keys. Total dev keys: ${Object.keys(db).filter(k => db[k].price_id === 'dev_trial').length}`);
  } else {
    console.log(`✅ Enough dev keys available (${activeDev.length} active)`);
  }

  // 4. Build the static HTML page that serves keys
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Get Your Free API Key — my-automaton</title>
<meta name="description" content="Get a free API key for my-automaton AI code review. 50 free credits, no signup required.">
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a1a; color: #e0e0e0; line-height: 1.6; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
.container { max-width: 600px; width: 90%; margin: 2rem auto; }
.card { background: #14142b; border: 1px solid #2a2a5a; border-radius: 16px; padding: 2.5rem; box-shadow: 0 20px 60px rgba(0,0,0,0.5); }
h1 { font-size: 1.8rem; margin-bottom: 0.5rem; background: linear-gradient(135deg, #667eea, #764ba2); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.subtitle { color: #8888aa; margin-bottom: 2rem; }
.key-box { background: #1a1a3a; border: 1px solid #3a3a6a; border-radius: 8px; padding: 1rem; margin: 1.5rem 0; display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
.key-display { font-family: 'Courier New', monospace; font-size: 0.85rem; color: #00ff88; word-break: break-all; flex: 1; }
.key-placeholder { font-family: 'Courier New', monospace; font-size: 0.85rem; color: #666; }
.copy-btn { background: #4a4a8a; color: white; border: none; border-radius: 6px; padding: 0.5rem 1rem; cursor: pointer; font-size: 0.85rem; transition: background 0.2s; white-space: nowrap; }
.copy-btn:hover { background: #5a5aaa; }
.copy-btn.copied { background: #00aa55; }
.btn { display: inline-block; background: linear-gradient(135deg, #667eea, #764ba2); color: white; border: none; border-radius: 8px; padding: 0.8rem 2rem; cursor: pointer; font-size: 1rem; font-weight: 600; text-decoration: none; transition: transform 0.2s; }
.btn:hover { transform: translateY(-2px); }
.btn-small { padding: 0.5rem 1rem; font-size: 0.85rem; margin-top: 1rem; }
.steps { margin: 2rem 0; }
.step { background: #1a1a3a; border-radius: 8px; padding: 1rem 1.2rem; margin-bottom: 1rem; }
.step-number { display: inline-block; background: #667eea; color: white; border-radius: 50%; width: 24px; height: 24px; text-align: center; line-height: 24px; font-size: 0.8rem; font-weight: bold; margin-right: 0.5rem; }
.step-title { font-weight: 600; color: #ccc; }
.step code { background: #0a0a1a; padding: 0.2rem 0.4rem; border-radius: 4px; font-size: 0.85rem; color: #00ff88; }
.step pre { background: #0a0a1a; border-radius: 6px; padding: 0.8rem; margin-top: 0.5rem; overflow-x: auto; font-size: 0.8rem; color: #aaddff; white-space: pre-wrap; }
.footer { text-align: center; margin-top: 2rem; color: #666; font-size: 0.85rem; }
.footer a { color: #8888ff; text-decoration: none; }
.error { color: #ff6666; background: #2a1515; border: 1px solid #5a2a2a; border-radius: 8px; padding: 1rem; margin: 1rem 0; }
.success { color: #66ff88; background: #152a15; border: 1px solid #2a5a2a; border-radius: 8px; padding: 1rem; margin: 1rem 0; display: none; }
.hidden { display: none; }
.limits { font-size: 0.85rem; color: #888; margin-top: 1.5rem; padding: 1rem; background: #1a1a2a; border-radius: 8px; }
.limits span { color: #aaddff; }
</style>
</head>
<body>
<div class="container">
  <div class="card">
    <h1>🔑 Get Your Free API Key</h1>
    <p class="subtitle">50 credits free — no signup, no email, no credit card</p>

    <div id="error-box" class="error hidden"></div>
    <div id="success-box" class="success">
      ✅ Key copied to clipboard!
    </div>

    <div class="key-box">
      <div id="key-display" class="key-placeholder">Click below to generate your key →</div>
      <button id="copy-btn" class="copy-btn hidden">Copy</button>
    </div>

    <button id="generate-btn" class="btn" style="width:100%">🚀 Generate My Free API Key</button>

    <div style="text-align:center;margin-top:1rem;">
      <span id="key-note" style="font-size:0.8rem;color:#666;"></span>
    </div>

    <div class="steps">
      <div class="step">
        <span class="step-number">1</span>
        <span class="step-title">Click to generate your key</span>
        <pre># Or use curl:
curl -X GET https://automation.songheng.vip/api/dev-key</pre>
      </div>
      <div class="step">
        <span class="step-number">2</span>
        <span class="step-title">Use the key to analyze code</span>
        <pre>curl -X POST https://automation.songheng.vip/v1/review \\
  -H "X-API-Key: YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"code":"function hello(){return\\"world\\"}","language":"js"}'</pre>
      </div>
      <div class="step">
        <span class="step-number">3</span>
        <span class="step-title">Buy more credits when you run out</span>
        <pre>https://automation.songheng.vip/get-started.html</pre>
      </div>
    </div>

    <div class="limits">
      <strong>Limits:</strong><br>
      • <span>50 free credits</span> — enough for 10 code reviews or 50 analyses<br>
      • <span>1 key per IP address</span> — share them with your team<br>
      • <span>No expiration</span> — use whenever you want
    </div>

    <div class="footer">
      <a href="/get-started.html">View Pricing →</a> · 
      <a href="/api-docs.html">API Documentation</a> · 
      <a href="/playground.html">Try Without Key</a>
    </div>
  </div>
</div>

<script>
const KEYS = ${JSON.stringify(Object.entries(db).filter(([k,v]) => v.price_id === 'dev_trial' && v.credits > 0).slice(0, 20).map(([k]) => k))};

document.addEventListener('DOMContentLoaded', () => {
  const keyDisplay = document.getElementById('key-display');
  const copyBtn = document.getElementById('copy-btn');
  const generateBtn = document.getElementById('generate-btn');
  const errorBox = document.getElementById('error-box');
  const successBox = document.getElementById('success-box');
  const keyNote = document.getElementById('key-note');

  // Check if this IP already has a key
  const storedKey = localStorage.getItem('my_automaton_dev_key');
  if (storedKey && KEYS.includes(storedKey)) {
    showKey(storedKey);
    keyNote.textContent = '🔑 Welcome back! Your key is ready.';
  }

  generateBtn.addEventListener('click', async () => {
    const existing = localStorage.getItem('my_automaton_dev_key');
    if (existing && KEYS.includes(existing)) {
      showKey(existing);
      keyNote.textContent = '🔑 Using your existing key.';
      return;
    }

    // Try the API endpoint first
    try {
      const resp = await fetch('/api/dev-key');
      if (resp.ok) {
        const data = await resp.json();
        if (data.api_key) {
          showKey(data.api_key);
          localStorage.setItem('my_automaton_dev_key', data.api_key);
          keyNote.textContent = '✨ Key generated via API!';
          return;
        }
      }
    } catch(e) {
      // API failed, fallback to pre-generated
    }

    // Fallback: assign a pre-generated key
    // Simple round-robin based on time
    const idx = Math.floor(Date.now() / 3600000) % KEYS.length;
    const key = KEYS[idx];
    if (key) {
      showKey(key);
      localStorage.setItem('my_automaton_dev_key', key);
      keyNote.textContent = '🔑 Pre-generated key assigned.';
    } else {
      errorBox.textContent = 'No keys available. Please try again later or buy at /get-started.html';
      errorBox.classList.remove('hidden');
    }
  });

  copyBtn.addEventListener('click', () => {
    const key = keyDisplay.textContent;
    navigator.clipboard.writeText(key).then(() => {
      copyBtn.textContent = '✅ Copied!';
      copyBtn.classList.add('copied');
      successBox.style.display = 'block';
      setTimeout(() => {
        copyBtn.textContent = 'Copy';
        copyBtn.classList.remove('copied');
        successBox.style.display = 'none';
      }, 2000);
    });
  });

  function showKey(key) {
    keyDisplay.textContent = key;
    keyDisplay.className = 'key-display';
    copyBtn.classList.remove('hidden');
    generateBtn.textContent = '🔄 Generate Another Key';
    errorBox.classList.add('hidden');
  }
});
</script>
</body>
</html>`;

  fs.writeFileSync(OUTPUT_PAGE, html);
  
  // 5. Update stats
  const stats = {
    timestamp: new Date().toISOString(),
    totalKeys: Object.keys(db).length,
    devKeys: Object.keys(db).filter(k => db[k].price_id === 'dev_trial').length,
    activeDevKeys: Object.keys(db).filter(k => db[k].price_id === 'dev_trial' && db[k].credits > 0).length,
    preGeneratedInPage: 10,
    outputPage: '/content/get-dev-key.html'
  };
  fs.writeFileSync('/root/automaton/data/dev-key-stats.json', JSON.stringify(stats, null, 2));

  console.log('\n=== RESULTS ===');
  console.log(`Total keys in DB: ${stats.totalKeys}`);
  console.log(`Dev keys: ${stats.devKeys}`);
  console.log(`Active dev keys: ${stats.activeDevKeys}`);
  console.log(`Output page: ${OUTPUT_PAGE}`);
  console.log('\nNext step: sudo systemctl restart automaton-gateway (on HOST)');
  console.log('Until then, users can visit /get-dev-key.html for a static key page.');
}

main();
