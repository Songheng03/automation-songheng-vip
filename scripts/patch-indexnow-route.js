#!/usr/bin/env node
/**
 * Gateway patch — adds IndexNow key route
 */
const fs = require('fs');
const gw = '/root/automaton/gateway.js';
let code = fs.readFileSync(gw, 'utf8');

// Add IndexNow key route after robots.txt line
const search = "app.get('/robots.txt', (req, res) => { res.sendFile(path.join(CONTENT, 'robots.txt')); });";
const replace = search + "\napp.get('/ai-indexnow-key-2026.txt', (req, res) => { res.sendFile(path.join(CONTENT, 'ai-indexnow-key-2026.txt')); });";

if (!code.includes('ai-indexnow-key-2026')) {
  code = code.replace(search, replace);
  fs.writeFileSync(gw, code);
  console.log('✅ IndexNow key route added to gateway');
} else {
  console.log('🟡 IndexNow route already exists');
}
