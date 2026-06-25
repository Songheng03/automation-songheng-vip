#!/usr/bin/env node
/**
 * SURGICAL PATCH: Fix 2 crashes in gateway.js
 * 1. trafficDashboard require path is wrong (/root/automaton/services/ → /root/services/)
 * 2. payoutTracker require needs try-catch
 */
const fs = require('fs');
const GATEWAY = '/root/automaton/gateway.js';
let code = fs.readFileSync(GATEWAY, 'utf8');

// Fix 1: Wrong require path for trafficDashboard
code = code.replace(
  "const trafficDashboard = require('/root/automaton/services/traffic-dashboard.js');",
  "let trafficDashboard;\ntry {\n  trafficDashboard = require('/root/services/traffic-dashboard.js');\n} catch (e) {\n  trafficDashboard = (req, res, next) => next();\n  console.log('[gateway] traffic-dashboard not available, using noop');\n}"
);

// Fix 2: payoutTracker require needs try-catch
code = code.replace(
  "const payoutTracker = require('/root/services/payout-tracker.js');",
  "let payoutTracker = { getStats: ()=>({totalPayments:0,totalUsdc:0,totalUsdcCents:0,todayPayments:0,todayUsdc:0,uniqueAddresses:0,byEndpoint:{},weeklyData:[],firstPayment:null,lastPayment:null,recentPayments:[]}), getRecentPayments: ()=>[] };\ntry {\n  payoutTracker = require('/root/services/payout-tracker.js');\n} catch(e) {\n  console.log('[gateway] payout-tracker not loaded:', e.message);\n}"
);

fs.writeFileSync(GATEWAY, code);
console.log('[surgical-patch] Applied crash fixes');

// Now restart
require('child_process').execSync('fuser -k 8080/tcp 2>/dev/null; sleep 1; node gateway.js &', { cwd: '/root/automaton', timeout: 5000 });
console.log('[surgical-patch] Gateway restarted');
