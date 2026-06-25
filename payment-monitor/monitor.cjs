#!/usr/bin/env node
/**
 * Payment Monitor for my-automaton
 * Checks Base chain for incoming USDC payments to wallet
 * 
 * Wallet: 0x76eADdEBFfb6A61DD071f97F4508467fc55dd113
 * USDC on Base: https://basescan.org/token/0x833589fcd6edb6e08f4c7c32d4f71b54bda02913
 * 
 * Runs as a cron job via heartbeat to detect when someone pays us
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const WALLET = '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113';
const USDC_BASE = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const BASESCAN_API = 'https://api.basescan.org/api';
const STATE_FILE = path.join(os.homedir(), '.automaton', 'payment-state.json');

async function checkPayments() {
  // Try to fetch recent USDC transfers to our wallet via Basescan (free tier)
  // Note: no API key needed for basic queries with rate limiting
  try {
    const url = `${BASESCAN_API}?module=account&action=tokentx` +
      `&contractaddress=${USDC_BASE}` +
      `&address=${WALLET}` +
      `&sort=desc&offset=5`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status !== '1') {
      console.log('No transactions found or API limit reached');
      return [];
    }
    
    // Read previous state
    let previousTx = {};
    try {
      previousTx = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    } catch(e) {
      previousTx = { lastChecked: '0', totalReceived: '0', payments: [] };
    }
    
    const payments = data.result.filter(tx => {
      const value = parseFloat(tx.value) / 1e6; // USDC has 6 decimals
      return value > 0 && tx.to.toLowerCase() === WALLET.toLowerCase();
    }).map(tx => ({
      hash: tx.hash,
      from: tx.from,
      value: (parseFloat(tx.value) / 1e6).toFixed(2),
      timestamp: tx.timeStamp,
      date: new Date(tx.timeStamp * 1000).toISOString()
    }));
    
    // Check for new payments
    const newPayments = payments.filter(p => 
      !previousTx.payments?.some(prev => prev.hash === p.hash)
    );
    
    if (newPayments.length > 0) {
      console.log(`\n🚀 NEW PAYMENTS DETECTED! 🚀`);
      newPayments.forEach(p => {
        console.log(`   $${p.value} USDC from ${p.from} at ${p.date}`);
        console.log(`   Tx: ${p.hash}`);
      });
      
      // Log to a payments file for audit
      const logLine = `[${new Date().toISOString()}] NEW PAYMENT: $${newPayments.reduce((s,p) => s+parseFloat(p.value), 0).toFixed(2)} USDC received`;
      fs.appendFileSync(path.join(os.homedir(), '.automaton', 'payments.log'), logLine + '\n');
      
      // Write a notification file
      fs.writeFileSync('/tmp/new-payment-alert', JSON.stringify(newPayments, null, 2));
    }
    
    // Update state
    const newState = {
      lastChecked: new Date().toISOString(),
      totalReceived: (parseFloat(previousTx.totalReceived || '0') + 
        newPayments.reduce((s,p) => s + parseFloat(p.value), 0)).toFixed(2),
      payments: [...(previousTx.payments || []), ...newPayments].slice(-50)
    };
    fs.writeFileSync(STATE_FILE, JSON.stringify(newState, null, 2));
    
    const total = newState.totalReceived;
    console.log(`\n📊 Payment Monitor: ${new Date().toISOString()}`);
    console.log(`   Wallet: ${WALLET}`);
    console.log(`   Total received: $${total} USDC`);
    console.log(`   Total transactions: ${newState.payments.length}`);
    
    return newPayments;
  } catch (err) {
    console.error(`Payment check failed: ${err.message}`);
    return [];
  }
}

// Run
checkPayments().then(payments => {
  if (payments.length > 0) {
    process.exit(0); // Signal new payments
  }
}).catch(e => {
  console.error(e);
  process.exit(1);
});
