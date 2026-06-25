#!/usr/bin/env node
// Patch: add webhook service routes to gateway
const fs = require('fs');
let code = fs.readFileSync('/root/automaton/gateway.js', 'utf-8');

// Add webhook require (after pastebin)
if (!code.includes('webhook-service')) {
  code = code.replace(
    "const pastebin = require('/root/services/pastebin-service.js');",
    "const pastebin = require('/root/services/pastebin-service.js');\nconst webhooks = require('/root/services/webhook-service.js');"
  );
}

// Add webhook routes before pastebin routes
if (!code.includes('WEBHOOK ROUTES')) {
  code = code.replace(
    "// === PASTEBIN ROUTES ===",
    "  // === WEBHOOK ROUTES ===\n  if (url.startsWith('/api/webhooks')) {\n    return webhooks.handleWebhookRequest(req, res, url);\n  }\n\n  // === PASTEBIN ROUTES ==="
  );
}

fs.writeFileSync('/root/automaton/gateway.js', code);
require('child_process').execSync('node --check /root/automaton/gateway.js', {stdio:'pipe'});
console.log('Gateway patched. Syntax OK.');
