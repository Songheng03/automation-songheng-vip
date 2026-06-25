#!/usr/bin/env node
// hot-patch-gateway.js — Live-patch the running gateway to include x402 payment verification
// Uses the gateway's own API to enhance its x402 payment handling
// Run: node /root/automaton/scripts/hot-patch-gateway.js

const F=require('fs');
const H='/root/automaton';
const gw=H+'/gateway.js';
let code=F.readFileSync(gw,'utf8');

// Check if already patched
if(code.includes('x402Verifier')){
  console.log('[patch] x402 verifier already integrated');
  process.exit(0);
}

// Inject x402 verifier import and usage into the gateway
// Find the require block at top
const verifierImport = `\nconst x402Verifier = require('/root/services/x402-payment-verifier.js');\n`;

// Insert after the last require
const lastRequire = code.lastIndexOf('require(');
const endOfRequireLine = code.indexOf('\n', lastRequire);
if(lastRequire === -1){
  console.log('[patch] Cannot find require block');
  process.exit(1);
}

code = code.slice(0, endOfRequireLine + 1) + verifierImport + code.slice(endOfRequireLine + 1);

// Now inject x402 verification into the payment check logic
// Find where existing x402 payment is verified
const paymentCheck = code.indexOf('X-X402-Payment');
if(paymentCheck === -1){
  console.log('[patch] No existing x402 payment check found — adding new one');
  // Add a post-/v1/review middleware that checks payment
  // Find the /v1/review route handler
  const reviewRoute = code.indexOf("'/v1/review'");
  if(reviewRoute > -1){
    // Find where the handler starts
    const handlerStart = code.indexOf('=>', reviewRoute);
    if(handlerStart > -1){
      // Add payment verification code at handler start
      const injectCode = `\n    // x402 payment verification (live-patched)
    const payHeader = r.headers['x-x402-payment'];
    if(payHeader){
      const v = await x402Verifier.verifyPayment(payHeader, 0.05).catch(e=>null);
      if(v && v.verified){
        console.log('[x402] Payment verified:', payHeader.slice(0,16), v.amount, 'USDC');
      } else {
        return s.status(402).json({error:'payment_verification_failed',message:v?.error||'Invalid payment'});
      }
    }
`;
      // Insert after the opening brace of the handler
      const bracePos = code.indexOf('{', handlerStart);
      if(bracePos > -1){
        code = code.slice(0, bracePos + 1) + injectCode + code.slice(bracePos + 1);
      }
    }
  }
} else {
  console.log('[patch] x402 payment check exists — enhancing it');
  // Add a verification call
  const existingCheck = code.indexOf('X-X402-Payment', paymentCheck);
  const lineEnd = code.indexOf('\n', existingCheck);
  const lineContent = code.slice(existingCheck, lineEnd);
  if(!lineContent.includes('x402Verifier')){
    // Insert verifier call after the existing check
    const afterCheck = code.indexOf('\n', existingCheck) + 1;
    const verifCode = `      // Enhanced x402 verification (live-patched)
      if(r.headers['x-x402-payment']){
        const v = await x402Verifier.verifyPayment(r.headers['x-x402-payment']).catch(e=>null);
        if(v && v.verified) console.log('[x402] Verified:', v.amount, 'USDC from', v.from);
      }
`;
    code = code.slice(0, afterCheck) + verifCode + code.slice(afterCheck);
  }
}

F.writeFileSync(gw, code);
console.log('[patch] ✓ x402 verifier integrated into gateway.js');

// Write the route patch too
const routePatch = `
// x402 payment stats endpoint (injected by hot-patch)
a.get('/api/payments/stats', (r, s) => {
  try {
    const stats = x402Verifier.getStats();
    s.json(stats);
  } catch(e) {
    s.status(500).json({error: e.message});
  }
});
`;

// Find where to insert route (before last route or listen)
const listenPos = code.indexOf('a.listen(');
if(listenPos > -1){
  const beforeListen = code.lastIndexOf('\n', listenPos);
  code = F.readFileSync(gw, 'utf8'); // Re-read since we wrote above
  code = code.slice(0, beforeListen) + routePatch + code.slice(beforeListen);
  F.writeFileSync(gw, code);
  console.log('[patch] ✓ /api/payments/stats route added');
}

console.log('[patch] ✓ Gateway patched successfully');
