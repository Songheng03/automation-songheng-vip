#!/usr/bin/env node
// Final gateway patch — add webhooks page route, ensure pastebin route, restart
const fs = require('fs');
let code = fs.readFileSync('/root/automaton/gateway.js', 'utf-8');

// Add webhooks page route
if (!code.includes("'/webhooks'")) {
  code = code.replace(
    "// === PASTEBIN ROUTES ===",
    `  // === STATIC PAGES ===\n  if (url === '/webhooks' || url === '/webhooks/') {\n    return serve('/webhooks.html');\n  }\n\n  // === PASTEBIN ROUTES ===`
  );
}

// Add /pastebin page route
if (!code.includes("'/pastebin'")) {
  code = code.replace(
    `if (url === '/webhooks' || url === '/webhooks/')`,
    `if (url === '/pastebin' || url === '/pastebin/' || url === '/webhooks' || url === '/webhooks/')`
  );
}

fs.writeFileSync('/root/automaton/gateway.js', code);
require('child_process').execSync('node --check /root/automaton/gateway.js', {stdio:'pipe'});
console.log('Gateway patched. Restarting...');

// Restart
const old = parseInt(fs.readFileSync('/root/automaton/gateway.pid', 'utf-8').trim());
try { process.kill(old, 'SIGTERM'); } catch(e) {}
const child = require('child_process').spawn('node', ['/root/automaton/gateway.js'], {
  stdio: 'inherit',
  detached: true
});
child.unref();
fs.writeFileSync('/root/automaton/gateway.pid', String(child.pid));
console.log('Gateway restarted with PID:', child.pid);
