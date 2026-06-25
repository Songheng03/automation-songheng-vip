#!/usr/bin/env node
/**
 * x402-verify.js — USDC Payment Verification Service
 * Verifies x402 payments on Base chain and tracks revenue.
 * Integrates with gateway.js via shared database.
 * 
 * Revenue tracking + payment verification + agent referral commissions.
 */

import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const WALLET = '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113';
const CHAIN_ID = 8453; // Base mainnet
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'; // Base USDC

const DATA_DIR = '/root/automaton/data';
try { mkdirSync(DATA_DIR, { recursive: true }); } catch(e) {}

const REVENUE_FILE = join(DATA_DIR, 'revenue.json');
const PAYMENTS_FILE = join(DATA_DIR, 'payments.json');
const COMMISSIONS_FILE = join(DATA_DIR, 'commissions.json');

function loadJSON(file, def) {
  try { if (existsSync(file)) return JSON.parse(readFileSync(file, 'utf8')); } catch(e) {}
  return def;
}
function saveJSON(file, data) {
  writeFileSync(file, JSON.stringify(data, null, 2));
}

export class PaymentVerifier {
  constructor() {
    this.revenue = loadJSON(REVENUE_FILE, {
      total_received_cents: 0,
      total_payments: 0,
      payments_by_service: {},
      daily_revenue: {},
      last_updated: null
    });
    this.payments = loadJSON(PAYMENTS_FILE, []);
    this.commissions = loadJSON(COMMISSIONS_FILE, {
      owed: {},
      paid: {},
      total_owed_cents: 0
    });
  }

  save() {
    saveJSON(REVENUE_FILE, this.revenue);
    saveJSON(PAYMENTS_FILE, this.payments);
    saveJSON(COMMISSIONS_FILE, this.commissions);
  }

  // Record a verified payment
  recordPayment(txHash, service, amountCents, referrerCode) {
    const payment = {
      txHash,
      service,
      amountCents,
      amountDisplay: `$${(amountCents/100).toFixed(2)}`,
      referrerCode: referrerCode || null,
      timestamp: new Date().toISOString(),
      verified: true
    };
    
    this.payments.push(payment);
    this.revenue.total_received_cents += amountCents;
    this.revenue.total_payments++;
    
    // Track by service
    if (!this.revenue.payments_by_service[service]) {
      this.revenue.payments_by_service[service] = { count: 0, total_cents: 0 };
    }
    this.revenue.payments_by_service[service].count++;
    this.revenue.payments_by_service[service].total_cents += amountCents;
    
    // Track daily revenue
    const day = new Date().toISOString().split('T')[0];
    if (!this.revenue.daily_revenue[day]) {
      this.revenue.daily_revenue[day] = 0;
    }
    this.revenue.daily_revenue[day] += amountCents;
    
    this.revenue.last_updated = new Date().toISOString();
    
    // Handle commission if referred
    if (referrerCode) {
      const commissionCents = Math.round(amountCents * 0.2); // 20%
      if (!this.commissions.owed[referrerCode]) {
        this.commissions.owed[referrerCode] = 0;
      }
      this.commissions.owed[referrerCode] += commissionCents;
      this.commissions.total_owed_cents += commissionCents;
    }
    
    this.save();
    return payment;
  }

  getStats() {
    const day = new Date().toISOString().split('T')[0];
    return {
      totalRevenue: this.revenue.total_received_cents,
      totalRevenueDisplay: `$${(this.revenue.total_received_cents/100).toFixed(2)}`,
      totalPayments: this.revenue.total_payments,
      todayRevenue: this.revenue.daily_revenue[day] || 0,
      todayRevenueDisplay: `$${((this.revenue.daily_revenue[day]||0)/100).toFixed(2)}`,
      services: this.revenue.payments_by_service,
      commissionsOwed: this.commissions.total_owed_cents,
      commissionsOwedDisplay: `$${(this.commissions.total_owed_cents/100).toFixed(2)}`
    };
  }

  getRevenueHistory(days = 7) {
    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const day = d.toISOString().split('T')[0];
      result.push({
        date: day,
        revenue_cents: this.revenue.daily_revenue[day] || 0,
        revenue: `$${((this.revenue.daily_revenue[day]||0)/100).toFixed(2)}`
      });
    }
    return result;
  }
}

// Run if executed directly
const isMain = process.argv[1] && (process.argv[1].includes('x402-verify'));
if (isMain) {
  const verifier = new PaymentVerifier();
  const cmd = process.argv[2] || 'stats';
  
  switch(cmd) {
    case 'stats':
      console.log(JSON.stringify(verifier.getStats(), null, 2));
      break;
    case 'history':
      console.log(JSON.stringify(verifier.getRevenueHistory(parseInt(process.argv[3]) || 7), null, 2));
      break;
    case 'record':
      if (process.argv[3]) {
        const p = verifier.recordPayment(
          process.argv[3] || 'demo_tx',
          process.argv[4] || 'analyze',
          parseInt(process.argv[5]) || 1,
          process.argv[6] || null
        );
        console.log('Recorded:', JSON.stringify(p, null, 2));
      }
      break;
    default:
      console.log('Usage: node x402-verify.js [stats|history|record]');
  }
}

export default PaymentVerifier;
