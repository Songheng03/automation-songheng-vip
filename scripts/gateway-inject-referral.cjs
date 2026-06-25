#!/usr/bin/env node
/**
 * gateway-inject-referral.js — Inject referral system into the running gateway
 * 
 * This patches the gateway to handle referral routes and badge sharing.
 * Run after the gateway is restarted with v2.1.
 * 
 * Usage: node scripts/gateway-inject-referral.js
 * 
 * This modifies the gateway to:
 * 1. Track badge shares (viral analytics)
 * 2. Handle referral cookie setting on purchase
 * 3. Add commission tracking to Stripe webhook
 */

const fs = require('fs');
const path = require('path');

const GATEWAY_PATH = '/root/automaton/gateway.cjs';
const BACKUP_PATH = GATEWAY_PATH + '.inject-ref.bak';

// Read current gateway
let gateway = fs.readFileSync(GATEWAY_PATH, 'utf8');

// Backup
fs.writeFileSync(BACKUP_PATH, gateway);
console.log(`Backup saved to ${BACKUP_PATH}`);

// 1. Add referral service require at the top (after last require)
const requireBlock = `const referralService = require('/root/automaton/services/referral-service.cjs');`;
if (!gateway.includes('referralService')) {
  gateway = gateway.replace(
    /(const \w+ = require\('[^']+'\);\n)(?!.*referralService)/m,
    (match) => match + '\n' + requireBlock + '\n'
  );
  console.log('✅ Added referral service require');
}

// 2. Add viral tracking data file reference
const viralDataBlock = `const VIRAL_FILE = '/root/automaton/data/viral.json';`;
if (!gateway.includes('VIRAL_FILE')) {
  gateway = gateway.replace(
    /(const (?:API_KEYS_FILE|DATA_DIR|API_KEYS)\s*=\s*'[^']+')/,
    (match) => match + '\n' + viralDataBlock
  );
  console.log('✅ Added viral tracking data path');
}

// 3. Add referral routing in the main handler (before 404 catchall)
const refRoutes = `
  // === REFERRAL & VIRAL ROUTES ===
  if (urlp.startsWith('/api/referral') || urlp.startsWith('/r/')) {
    referralService.handle(req, res);
    return;
  }
  
  // --- Viral Share Tracking ---
  if (urlp === '/api/viral/share' && method === 'POST') {
    let vb = '';
    req.on('data', c => vb += c);
    req.on('end', () => {
      try {
        const vd = JSON.parse(vb);
        const vdb = JSON.parse(fs.readFileSync(VIRAL_FILE, 'utf8').toString() || '{}');
        if (!vdb.shares) vdb.shares = {};
        if (!vdb.shares[vd.url]) {
          vdb.shares[vd.url] = { count: 0, firstShare: new Date().toISOString(), lastShare: new Date().toISOString() };
        }
        vdb.shares[vd.url].count++;
        vdb.shares[vd.url].lastShare = new Date().toISOString();
        vdb.total = (vdb.total || 0) + 1;
        fs.writeFileSync(VIRAL_FILE, JSON.stringify(vdb, null, 2));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, totalShares: vdb.total }));
      } catch(e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }
  
  // --- Viral Stats ---
  if (urlp === '/api/viral' && method === 'GET') {
    try {
      const vdb = JSON.parse(fs.readFileSync(VIRAL_FILE, 'utf8').toString() || '{}');
      const topSharers = Object.entries(vdb.shares || {})
        .sort((a,b) => b[1].count - a[1].count)
        .slice(0, 20)
        .map(([url, data]) => ({ url, count: data.count, lastShare: data.lastShare }));
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ totalShares: vdb.total || 0, activeSharers: Object.keys(vdb.shares || {}).length, topSharers }));
    } catch(e) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ totalShares: 0, activeSharers: 0, topSharers: [] }));
    }
    return;
  }
  
  // --- Traffic Recording ---
  if (urlp !== '/api/traffic' && urlp !== '/health' && !urlp.startsWith('/api/')) {
    // Record visit asynchronously (don't block response)
    recordVisit(urlp, req.headers['user-agent'] || '', req.headers['referer'] || '');
  }
`;

if (!gateway.includes('REFERRAL & VIRAL ROUTES')) {
  // Find the 404 catchall or last handler, insert before it
  const catchallMatch = gateway.match(/\/\/\s*404\s*(?:catchall|fallback|not found)?[\s\S]*?res\.writeHead\(404\)/);
  if (catchallMatch) {
    gateway = gateway.replace(catchallMatch[0], refRoutes + '\n  ' + catchallMatch[0]);
    console.log('✅ Inserted referral/viral routes before 404 handler');
  } else {
    // Try to find generic 404
    const simple404 = gateway.match(/res\.writeHead\(404[^)]*\)\s*;?\s*res\.end\([^)]*\)/);
    if (simple404) {
      gateway = gateway.replace(simple404[0], refRoutes + '\n  ' + simple404[0]);
      console.log('✅ Inserted referral/viral routes (fallback pattern)');
    } else {
      console.log('⚠️  Could not find 404 handler to insert routes');
    }
  }
}

// 4. Add visit recording function
const visitFunc = `
function recordVisit(urlp, ua, referer) {
  try {
    const tf = '/root/automaton/data/traffic.json';
    let td = {};
    try { td = JSON.parse(fs.readFileSync(tf, 'utf8')); } catch {}
    if (!td.pages) td.pages = {};
    if (!td.referrers) td.referrers = {};
    if (!td.userAgents) td.userAgents = {};
    
    td.pages[urlp] = (td.pages[urlp] || 0) + 1;
    td.totalVisits = (td.totalVisits || 0) + 1;
    
    if (referer) {
      const refHost = new URL(referer).hostname || referer;
      td.referrers[refHost] = (td.referrers[refHost] || 0) + 1;
    }
    
    // Rate limit writes (one per 5 seconds)
    const now = Date.now();
    if (!td._lastWrite || now - td._lastWrite > 5000) {
      td._lastWrite = now;
      fs.writeFileSync(tf, JSON.stringify(td, null, 2));
    }
  } catch(e) { /* silently fail — don't block request */ }
}
`;

if (!gateway.includes('function recordVisit')) {
  // Insert right before the server creation
  gateway = gateway.replace(
    /(const server = http\.createServer)/,
    visitFunc + '\n\n' + '$1'
  );
  console.log('✅ Added visit recording function');
}

// 5. Add traffic stats endpoint
const trafficEndpoint = `
  // --- Traffic Stats ---
  if (urlp === '/api/traffic' && method === 'GET') {
    try {
      const td = JSON.parse(fs.readFileSync('/root/automaton/data/traffic.json', 'utf8').toString() || '{}');
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=300' });
      res.end(JSON.stringify({
        totalVisits: td.totalVisits || 0,
        uniqueReferrers: Object.keys(td.referrers || {}).length,
        topPages: Object.entries(td.pages || {}).sort((a,b) => b[1] - a[1]).slice(0, 10).map(([p, c]) => ({ page: p, visits: c })),
        topReferrers: Object.entries(td.referrers || {}).sort((a,b) => b[1] - a[1]).slice(0, 10).map(([r, c]) => ({ referrer: r, visits: c }))
      }));
    } catch(e) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ totalVisits: 0, uniqueReferrers: 0, topPages: [], topReferrers: [] }));
    }
    return;
  }
`;

if (!gateway.includes('Traffic Stats') && !gateway.includes('/api/traffic')) {
  // Insert before referral routes or 404
  gateway = gateway.replace(
    /(\/\/ === REFERRAL & VIRAL ROUTES ===)/,
    trafficEndpoint + '\n' + '$1'
  );
  console.log('✅ Added traffic stats endpoint');
}

// 6. Integrate with Stripe webhook for referral commission tracking
// Find the webhook handler and add referral cookie check
  const webhookHandler = gateway.match(/\/\/\s*Stripe\s*Webhook[\s\S]{0,500}/);
  
  if (!gateway.includes('referralService.trackConversion')) {
    // Add referral tracking right after successful payment handling
    const conversionHook = `
              // Track referral commission if applicable
              const refCode = referralService.getRefFromCookies(req.headers['cookie']);
              if (refCode) {
                const amountMap = { price_starter: 5, price_advanced: 10, price_pro: 25, price_ultimate: 50 };
                const amount = amountMap[session.price_id] || 5;
                referralService.trackConversion(refCode, amount);
              }
`;
    
    // Find where credits are added after successful payment
    const creditAdd = gateway.match(/addCredits\([^)]+\)/);
    if (creditAdd) {
      gateway = gateway.replace(creditAdd[0], creditAdd[0] + conversionHook);
      console.log('✅ Added referral commission tracking to Stripe webhook');
    }
  }
}

// Write modified gateway
fs.writeFileSync(GATEWAY_PATH, gateway);
console.log('\n✅ Gateway patched with referral system!');
console.log(`File: ${GATEWAY_PATH}`);
console.log(`Backup: ${BACKUP_PATH}`);
console.log('');
console.log('To activate: run on HOST:');
console.log('  sudo systemctl restart automaton-gateway');
console.log('');
console.log('Or use the activation script:');
console.log('  bash /root/automaton/scripts/host-activate.sh');
