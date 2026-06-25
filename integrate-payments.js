// Integration script — adds payment tracker + webhook routes to gateway
// This updates gateway.js to persist payments to disk

import fs from 'fs';

const gatewayPath = '/root/automaton/gateway.js';
let code = fs.readFileSync(gatewayPath, 'utf8');

// Check if payment tracker is already integrated
if (code.includes('payment-tracker')) {
  console.log('Payment tracker already integrated');
  process.exit(0);
}

// 1. Add import after the existing imports
const importLine = "import { recordPayment, isPaymentUsed, getStats as getPaymentStats } from './services/payment-tracker.js';";
code = code.replace("const __dirname = path.dirname(fileURLToPath(import.meta.url));", 
  `const __dirname = path.dirname(fileURLToPath(import.meta.url));
${importLine}`);

// 2. Replace the in-memory payments set with persistent tracking
code = code.replace(
  'let __payments = new Set();',
  'let __payments = new Set(); // Also tracked in payment-tracker.js'
);

// 3. Replace the simple __payments.add with persistent record call
const oldPaymentRecord = 'if (paymentHeader) {\n        if (__payments.has(paymentHeader)) {';
const newPaymentRecord = `if (paymentHeader) {
        if (__payments.has(paymentHeader)) {
          return json(res, { error: 'payment_already_used' }, 409);
        }
        __payments.add(paymentHeader);
        
        // Record in persistent tracker
        recordPayment(paymentHeader, body.sender || body.from || req.headers['x-forwarded-for'] || req.socket.remoteAddress, premiumEp.cost, premiumEp.ep, premiumEp.ep.replace('/v1/', ''));
        
        // Check referral commission
        const cookie = req.headers['cookie'] || '';
        const refMatch = cookie.match(/ref=([^;]+)/);
        if (refMatch) {
          const refCode = refMatch[1];
          const referrer = Object.entries(referrals.agents).find(([_, a]) => a.code === refCode);
          if (referrer) {
            const commission = Math.floor(premiumEp.cost * 0.2);
            referrer[1].earnings += commission;
            referrals.payments.push({ from: req.socket.remoteAddress, endpoint: premiumEp.ep, amount: premiumEp.cost, commission, referrer: referrer[0], timestamp: new Date().toISOString() });
            saveReferrals();
          }
        }`;

// Find the section with payment handling more carefully
const oldSection = `if (paymentHeader) {
        if (__payments.has(paymentHeader)) {
          return json(res, { error: 'payment_already_used' }, 409);
        }
        __payments.add(paymentHeader);

        // Record receipt in database
        if (ReceiptService) {
          try {
            ReceiptService.record(paymentHeader, body.sender || body.from || ip, premiumEp.cost, premiumEp.ep, pathname.replace('/v1/', ''));
          } catch(e) {
            console.error('Failed to record payment:', e.message);
          }
        }

        // Check referral commission
        const cookie = req.headers['cookie'] || '';
        const refMatch = cookie.match(/ref=([^;]+)/);
        if (refMatch) {
          const refCode = refMatch[1];
          const referrer = Object.entries(referrals.agents).find(([_, a]) => a.code === refCode);
          if (referrer) {
            const commission = Math.floor(premiumEp.cost * 0.2);
            referrer[1].earnings += commission;
            referrals.payments.push({ from: ip, endpoint: premiumEp.ep, amount: premiumEp.cost, commission, referrer: referrer[0], timestamp: new Date().toISOString() });
            saveReferrals();
          }
        }`;

const newSection = `if (paymentHeader) {
        if (__payments.has(paymentHeader)) {
          return json(res, { error: 'payment_already_used' }, 409);
        }
        __payments.add(paymentHeader);
        
        // Record in persistent payment tracker
        try {
          recordPayment(paymentHeader, body.sender || body.from || req.socket.remoteAddress, premiumEp.cost, premiumEp.ep, premiumEp.ep.replace('/v1/', ''));
        } catch(e) {
          console.error('Payment record failed:', e.message);
        }

        // Check referral commission
        const cookie = req.headers['cookie'] || '';
        const refMatch = cookie.match(/ref=([^;]+)/);
        if (refMatch) {
          const refCode = refMatch[1];
          const referrer = Object.entries(referrals.agents).find(([_, a]) => a.code === refCode);
          if (referrer) {
            const commission = Math.floor(premiumEp.cost * 0.2);
            referrer[1].earnings += commission;
            referrals.payments.push({ from: req.socket.remoteAddress, endpoint: premiumEp.ep, amount: premiumEp.cost, commission, referrer: referrer[0], timestamp: new Date().toISOString() });
            saveReferrals();
          }
        }`;

code = code.replace(oldSection, newSection);

// 4. Add /api/stats endpoint with real data
const statsEndpoint = `
    // Persistent payment stats
    if (pathname === '/api/stats' && req.method === 'GET') {
      try {
        const stats = getPaymentStats();
        return json(res, stats);
      } catch(e) {
        return json(res, { error: e.message }, 500);
      }
    }
    
    if (pathname === '/api/stats/payments' && req.method === 'GET') {
      try {
        const { getAllPayments } = await import('./services/payment-tracker.js');
        const allPayments = getAllPayments();
        return json(res, { count: allPayments.length, payments: allPayments.slice(-100).reverse() });
      } catch(e) {
        return json(res, { error: e.message }, 500);
      }
    }`;

// Insert after health endpoint
code = code.replace(
  `    // API catalog`,
  `${statsEndpoint}
    // API catalog`
);

// 5. Update health endpoint to include payment stats
code = code.replace(
  `      const summary = ReceiptService ? ReceiptService.getSummary() : { totalTx: 0, totalRevenueCents: 0, wallet: WALLET };
      return json(res, {
        status: 'ok',
        uptime: process.uptime(),
        wallet: WALLET,
        chain: 'base',
        model: 'deepseek-chat',
        payments: __payments.size,
        revenue: summary
      });`,
  `      let paymentStats = { totalPayments: 0, totalRevenueUSD: '0.00' };
      try { paymentStats = getPaymentStats(); } catch(e) {}
      return json(res, {
        status: 'ok',
        uptime: process.uptime(),
        wallet: WALLET,
        chain: 'base',
        model: 'deepseek-chat',
        paymentsInMemory: __payments.size,
        paymentsPersisted: paymentStats.totalPayments,
        revenue: paymentStats
      });`
);

fs.writeFileSync(gatewayPath, code);
console.log('✅ Gateway updated with payment persistence!');
console.log('Changes made:');
console.log('  - Imported payment-tracker.js');
console.log('  - Replaced ReceiptService with persistent payment recording');
console.log('  - Added /api/stats endpoint');
console.log('  - Added /api/stats/payments endpoint');
console.log('  - Updated /health to show persisted stats');
