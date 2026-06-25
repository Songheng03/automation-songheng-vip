/**
 * Gateway Analytics Integration
 * Adds visitor tracking to the gateway server
 * Run this after gateway.js starts to patch analytics in
 */
"use strict";

const http = require('http');
const fs = require('fs');
const path = require('path');

const ANALYTICS = '/root/automaton/services/visitor-analytics.js';
let analytics;

try {
  analytics = require(ANALYTICS);
  console.log('[analytics-integration] Analytics module loaded');
} catch(e) {
  console.error('[analytics-integration] Failed to load analytics:', e.message);
  process.exit(1);
}

// Read current gateway and check if analytics already patched
const GATEWAY_PATH = '/root/automaton/gateway.js';
let gatewayContent = fs.readFileSync(GATEWAY_PATH, 'utf8');

if (gatewayContent.includes('visitor-analytics')) {
  console.log('[analytics-integration] Gateway already has analytics integration');
  process.exit(0);
}

// We'll create a proxy that wraps the gateway server
// The gateway is already running on 8080
// We'll use analytics directly from the command line by polling

setInterval(() => {
  const summary = analytics.getSummary();
  fs.writeFileSync('/root/automaton/data/analytics-summary.json', JSON.stringify(summary, null, 2));
}, 60000); // Update every minute

console.log('[analytics-integration] Analytics data collector running');
console.log('[analytics-integration] Summary written every 60s to /root/automaton/data/analytics-summary.json');
console.log('[analytics-integration] Current stats:', JSON.stringify(analytics.getSummary(), null, 2));

// Keep process alive
process.stdin.resume();
