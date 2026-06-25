#!/usr/bin/env node
/**
 * hook-referral-into-gateway.cjs — Adds referral routes to gateway.cjs
 * 
 * Run this to patch the gateway with referral system integration.
 * Then restart: sudo systemctl restart automaton-gateway (on HOST)
 * 
 * Usage: node services/hook-referral-into-gateway.cjs
 */

const fs = require('fs');
const path = require('path');

const GATEWAY = '/root/automaton/gateway.cjs';
const HOOK_MARKER = '// REFERRAL SYSTEM HOOK';

function patchGateway() {
  let gw = fs.readFileSync(GATEWAY, 'utf8');
  
  // Check if already patched
  if (gw.includes(HOOK_MARKER)) {
    console.log('✅ Referral system already hooked into gateway');
    return;
  }
  
  // 1. Add require at top
  const requireLine = `const referral = require('./services/referral-service.cjs');`;
  gw = gw.replace('const http = require(\'http\');', `const http = require('http');\n${requireLine}`);
  
  // 2. Add route handler in the main handler
  const routeHook = `
  // REFERRAL SYSTEM HOOK
  if (parsedUrl.pathname.startsWith('/api/referral/') || parsedUrl.pathname.startsWith('/r/')) {
    referral.handle(req, res);
    return;
  }`;
  
  // Find the main handler and add the referral routes before the catch-all
  gw = gw.replace('// ===== HANDLERS =====', `// ===== HANDLERS =====${routeHook}`);
  
  // 3. Add referral tracking to Stripe webhook
  const webhookHook = `
    // Check for referral
    const refCookie = referral.getRefFromCookies(req.headers.cookie);
    if (refCookie) {
      const amount = PRICES[body.data.object.metadata.price_id]?.price || 5;
      referral.trackConversion(refCookie, amount);
    }`;
  
  // Add after the addCredits call in payment webhook
  gw = gw.replace('track(\'conversion\', req);', `track('conversion', req);${webhookHook}`);
  
  fs.writeFileSync(GATEWAY, gw);
  console.log('✅ Referral system hooked into gateway.cjs');
  console.log('   Restart gateway: sudo systemctl restart automaton-gateway');
}

patchGateway();
