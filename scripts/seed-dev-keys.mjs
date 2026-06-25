#!/usr/bin/env node
/**
 * seed-dev-keys.mjs — Inject 10 dev keys with 50 credits each into api-keys.json
 * Run: node scripts/seed-dev-keys.mjs
 * 
 * These keys are published on the homepage and get-started page for dev preview.
 * Users can try premium endpoints without paying — limited to 50 credits each.
 */

import fs from 'fs';
import crypto from 'crypto';

const API_KEYS_FILE = '/root/automaton/api-keys.json';
const CONTENT_DIR = '/root/automaton/content';

// Read existing keys
let db = {};
try {
  db = JSON.parse(fs.readFileSync(API_KEYS_FILE, 'utf-8'));
} catch {
  db = {};
}

const existingCount = Object.keys(db).length;
console.log(`Current keys in system: ${existingCount}`);

// Generate 10 dev keys
const devKeys = [];
for (let i = 0; i < 10; i++) {
  const key = 'am_dev_' + crypto.randomBytes(16).toString('hex');
  db[key] = {
    credits: 50,
    created: new Date().toISOString(),
    used: 0,
    price_id: 'dev_key',
    dev_key: true
  };
  devKeys.push(key);
  console.log(`  Created: ${key.substring(0, 20)}... (50 credits)`);
}

// Write updated database
fs.writeFileSync(API_KEYS_FILE, JSON.stringify(db, null, 2));
console.log(`\n✅ Total keys now: ${Object.keys(db).length}`);
console.log(`✅ Dev keys added: ${devKeys.length} x 50 credits = ${devKeys.length * 50} free credits`);

// Inject first dev key into index.html as a hidden data attribute
const indexFile = `${CONTENT_DIR}/index.html`;
if (fs.existsSync(indexFile)) {
  let html = fs.readFileSync(indexFile, 'utf-8');
  
  // Add dev key as a hidden data attribute in a script tag
  const keyScript = `
<script>
// Dev preview API key - limited to 50 credits for testing
const DEV_API_KEY = '${devKeys[0]}';
// Reveal on click
document.addEventListener('DOMContentLoaded', () => {
  const revealBtns = document.querySelectorAll('.reveal-key');
  revealBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = document.getElementById(btn.dataset.target);
      if (target) {
        target.textContent = DEV_API_KEY;
        target.style.display = 'inline';
        btn.textContent = '✓ Copied!';
        navigator.clipboard.writeText(DEV_API_KEY);
        setTimeout(() => { btn.textContent = '🔑 Reveal Dev Key'; }, 3000);
      }
    });
  });
});
</script>`;

  if (!html.includes('DEV_API_KEY')) {
    html = html.replace('</body>', keyScript + '\n</body>');
    fs.writeFileSync(indexFile, html);
    console.log('✅ Dev key injected into index.html');
  }
}

// Also update get-started.html
const gsFile = `${CONTENT_DIR}/get-started.html`;
if (fs.existsSync(gsFile)) {
  let html = fs.readFileSync(gsFile, 'utf-8');
  const keyScript = `
<script>
const DEV_API_KEY = '${devKeys[0]}';
document.addEventListener('DOMContentLoaded', () => {
  const revealBtns = document.querySelectorAll('.reveal-key');
  revealBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = document.getElementById(btn.dataset.target);
      if (target) {
        target.textContent = DEV_API_KEY;
        target.style.display = 'inline';
        btn.textContent = '✓ Copied!';
        navigator.clipboard.writeText(DEV_API_KEY);
        setTimeout(() => { btn.textContent = '🔑 Reveal Dev Key'; }, 3000);
      }
    });
  });
});
</script>`;
  
  if (!html.includes('DEV_API_KEY')) {
    html = html.replace('</body>', keyScript + '\n</body>');
    fs.writeFileSync(gsFile, html);
    console.log('✅ Dev key injected into get-started.html');
  }
}

// Save dev key list for reference
const keyList = devKeys.map(k => ({ key: k, credits: 50, created: new Date().toISOString() }));
fs.mkdirSync('/root/automaton/data', { recursive: true });
fs.writeFileSync('/root/automaton/data/dev-keys.json', JSON.stringify(keyList, null, 2));

console.log('\n📋 Summary:');
console.log(`  Dev keys available: ${devKeys.length}`);
console.log(`  Credits per key: 50`);
console.log(`  Total free credits: ${devKeys.length * 50}`);
console.log(`  First key (for homepage): ${devKeys[0].substring(0, 24)}...`);
console.log(`\n🔑 Users can get a dev key from the homepage or get-started page.`);
