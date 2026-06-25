#!/usr/bin/env node
// Patch gateway.js: fix duplicate pastebin require, add auto-promoter
const fs = require('fs');

let code = fs.readFileSync('/root/automaton/gateway.js', 'utf-8');

// 1. Fix duplicate pastebin require
const lines = code.split('\n');
let seenPastebin = false;
const filtered = lines.filter(l => {
  if (l.includes('pastebin-service')) {
    if (seenPastebin) return false;
    seenPastebin = true;
  }
  return true;
});
code = filtered.join('\n');

// 2. Add auto-promoter before listen line
const promoterCode = `
// Auto-promoter — ping search engines hourly
setInterval(() => {
  try {
    const cp = require('child_process');
    cp.execFile('node', ['/root/automaton/scripts/auto-promoter.js'], {timeout: 30000}, (err) => {
      if (err) console.error('promoter error:', err.message);
    });
  } catch(e) { console.error('promoter:', e.message); }
}, 3600000);
`;

code = code.replace(
  'http.createServer(handler).listen(PORT, () => {',
  promoterCode + '\nhttp.createServer(handler).listen(PORT, () => {'
);

fs.writeFileSync('/root/automaton/gateway.js', code);

// Validate
require('child_process').execSync('node --check /root/automaton/gateway.js', {stdio: 'pipe'});
console.log('Syntax OK. Gateway patched successfully.');
