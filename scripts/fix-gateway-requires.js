#!/usr/bin/env node
/**
 * Surgical fix for gateway.js crashes:
 * 1. trafficDashboard require fails — wrap in try-catch
 * 2. payoutTracker require needs try-catch backup
 */
const fs = require('fs');
const GATEWAY = '/root/automaton/gateway.js';
let code = fs.readFileSync(GATEWAY, 'utf8');
const patches = [];

// Fix 1: Line 17 — trafficDashboard require with try-catch
const oldTraf = `const trafficDashboard = require('/root/automaton/services/traffic-dashboard.js');`;
const newTraf = `let trafficDashboard;
try { trafficDashboard = require('/root/automaton/services/traffic-dashboard.js'); } catch(e) { console.log('[gateway] trafficDashboard not loaded:', e.message); trafficDashboard = (req,res,next) => next(); }`;
if (code.includes(oldTraf)) {
  code = code.replace(oldTraf, newTraf);
  patches.push('Wrap trafficDashboard require in try-catch');
}

// Fix 2: Line 454 — payoutTracker require with try-catch  
const oldPayout = `const payoutTracker = require('/root/services/payout-tracker.js');`;
const newPayout = `let payoutTracker = { getStats: () => ({totalPayments:0,totalUsdc:0}), getRecentPayments: () => ([]) };
try { payoutTracker = require('/root/services/payout-tracker.js'); } catch(e) { console.log('[gateway] payoutTracker not loaded:', e.message); }`;
if (code.includes(oldPayout)) {
  code = code.replace(oldPayout, newPayout);
  patches.push('Wrap payoutTracker require in try-catch');
}

if (patches.length > 0) {
  fs.writeFileSync(GATEWAY, code);
  console.log(`[gateway-fix] Applied ${patches.length} fixes:`);
  patches.forEach(p => console.log(`  ✓ ${p}`));
} else {
  console.log('[gateway-fix] No fixes needed');
}
