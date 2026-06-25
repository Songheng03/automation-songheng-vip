#!/usr/bin/env node
/**
 * revenue-tracker.mjs v2 — ACCURATE revenue tracking
 * Distinguishes real paid keys from dev keys
 */

const API_KEYS_FILE = '/root/automaton/data/api-keys.json';
const PRICE_MAP = {
  'price_1TiOLADly2uoyjDjIR8RVnTl': { usd: 5, credits: 500, name: 'Starter' },
  'price_1TiOLYDly2uoyjDjNdqoIiKc': { usd: 10, credits: 1100, name: 'Pro' },
  'price_pro': { usd: 25, credits: 3000, name: 'Pro' },
  'price_ultimate': { usd: 58, credits: 6500, name: 'Enterprise' }
};

async function main() {
  const fs = await import('fs');
  const apiKeys = JSON.parse(fs.readFileSync(API_KEYS_FILE, 'utf8'));
  const keys = Object.entries(apiKeys);

  let paidUsers = 0, devUsers = 0;
  let paidCredits = 0, devCredits = 0;
  let paidUsed = 0, devUsed = 0;
  let totalRevenueUSD = 0;
  const planCounts = {};

  for (const [keyId, data] of keys) {
    if (data.dev_key) {
      devUsers++;
      devCredits += data.credits || 0;
      devUsed += data.used || 0;
    } else if (data.price_id) {
      paidUsers++;
      paidCredits += data.credits || 0;
      paidUsed += data.used || 0;
      const plan = PRICE_MAP[data.price_id] || { usd: 5, credits: 500, name: 'Unknown' };
      totalRevenueUSD += plan.usd;
      planCounts[plan.name] = (planCounts[plan.name] || 0) + 1;
    }
  }

  console.log('='.repeat(60));
  console.log('💰 MY-AUTOMATON — REAL REVENUE REPORT');
  console.log('='.repeat(60));
  console.log(`\n📊 PAID USERS: ${paidUsers}`);
  console.log(`   Revenue: US$${totalRevenueUSD.toFixed(2)}`);
  console.log(`   Plan breakdown: ${JSON.stringify(planCounts)}`);
  console.log(`   Credits issued: ${paidCredits} (${paidUsed} used = ${paidCredits > 0 ? (paidUsed/paidCredits*100).toFixed(1) : 0}%)`);
  
  console.log(`\n🔑 DEV KEYS: ${devUsers}`);
  console.log(`   Credits issued: ${devCredits} (${devUsed} used = ${devCredits > 0 ? (devUsed/devCredits*100).toFixed(1) : 0}%)`);
  
  const totalIssued = paidCredits + devCredits;
  const totalUsed = paidUsed + devUsed;
  console.log(`\n📈 TOTAL: ${keys.length} keys, ${totalIssued} credits issued, ${totalUsed} used (${totalIssued > 0 ? (totalUsed/totalIssued*100).toFixed(1) : 0}%)`);
  
  const costEstimate = totalUsed * 0.015 + 1.40; // inference + server
  const net = totalRevenueUSD - costEstimate;
  console.log(`\n🏥 SURVIVAL`);
  console.log(`   Revenue: US$${totalRevenueUSD.toFixed(2)}`);
  console.log(`   Estimated costs: US$${costEstimate.toFixed(2)}`);
  console.log(`   Net: US$${net.toFixed(2)} (${net >= 0 ? '✅ PROFITABLE' : '🔴 LOSING'})`);
  
  if (totalUsed === 0) {
    console.log(`\n⚠️  CRITICAL: 0 credits used across ALL keys.`);
    console.log(`   Nobody is using the service. Traffic = 0. Conversions = 0.`);
    console.log(`   Fix this by: publishing content, submitting to directories, sharing on social.`);
  }
}

main().catch(console.error);
