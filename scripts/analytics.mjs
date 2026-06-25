#!/usr/bin/env node
/**
 * analytics.mjs - Revenue & Usage Analytics Dashboard
 * 
 * Reads api-keys.json and gateway logs to produce a live report.
 * Run: node /root/automaton/scripts/analytics.mjs
 * 
 * This helps me understand:
 * - How many paying users I have
 * - How much revenue I've generated
 * - Which endpoints are being used most
 * - Credits consumed vs. purchased
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { createHash } from 'crypto';

const __dirname = dirname(new URL(import.meta.url).pathname);
const AUTOMATON_HOME = join(__dirname, '..');
const DATA_DIR = join(AUTOMATON_HOME, 'data');

const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const MAGENTA = '\x1b[35m';
const RESET = '\x1b[0m';
const GRAY = '\x1b[90m';

function readJSON(path) {
  if (!existsSync(path)) return null;
  try { return JSON.parse(readFileSync(path, 'utf-8')); }
  catch { return null; }
}

function formatDate(d) {
  const date = new Date(d);
  return date.toISOString().replace('T', ' ').substring(0, 19);
}

function ago(d) {
  const diff = Date.now() - new Date(d).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h ago`;
}

function divider(title) {
  const line = '─'.repeat(50);
  console.log(`\n${BOLD}${CYAN}${line}${RESET}`);
  console.log(`${BOLD}${CYAN}  ${title}${RESET}`);
  console.log(`${CYAN}${line}${RESET}\n`);
}

async function main() {
  console.log(`${BOLD}${MAGENTA}╔════════════════════════════════════════════════════╗${RESET}`);
  console.log(`${BOLD}${MAGENTA}║       my-automaton Revenue Analytics Dashboard     ║${RESET}`);
  console.log(`${BOLD}${MAGENTA}╚════════════════════════════════════════════════════╝${RESET}`);
  console.log(`${GRAY}Generated: ${new Date().toISOString()}${RESET}\n`);

  // === API KEYS ===
  const keys = readJSON(join(AUTOMATON_HOME, 'api-keys.json'));
  const totalKeys = keys ? Object.keys(keys).length : 0;
  const activeKeys = keys ? Object.values(keys).filter(k => k.credits > 0).length : 0;
  const totalCreditsIssued = keys ? Object.values(keys).reduce((sum, k) => sum + (k.credits_initial || k.credits + k.used || 0), 0) : 0;
  const totalCreditsUsed = keys ? Object.values(keys).reduce((sum, k) => sum + (k.used || 0), 0) : 0;
  const totalCreditsRemaining = keys ? Object.values(keys).reduce((sum, k) => sum + (k.credits || 0), 0) : 0;
  const usageRate = totalCreditsIssued > 0 ? (totalCreditsUsed / totalCreditsIssued * 100).toFixed(1) : '0.0';

  divider('API KEYS & CREDITS');
  console.log(`  ${BOLD}Total Keys Issued:${RESET}    ${totalKeys}`);
  console.log(`  ${BOLD}Active Keys:${RESET}           ${activeKeys}${activeKeys < totalKeys ? ` (${totalKeys - activeKeys} exhausted)` : ''}`);
  console.log(`  ${BOLD}Credits Issued:${RESET}        ${totalCreditsIssued}`);
  console.log(`  ${BOLD}Credits Used:${RESET}          ${totalCreditsUsed}`);
  console.log(`  ${BOLD}Credits Remaining:${RESET}     ${totalCreditsRemaining}`);
  console.log(`  ${BOLD}Usage Rate:${RESET}            ${usageRate}%`);

  // === REVENUE ===
  // Parse price info from keys
  const PRICE_MAP = {
    'price_38hkd': { name: 'Starter', price: 38, credits: 500 },
    'price_78hkd': { name: 'Pro', price: 78, credits: 1100 },
    'price_198hkd': { name: 'Pro', price: 198, credits: 3000 },
    'price_388hkd': { name: 'Enterprise', price: 388, credits: 6500 },
  };

  const planCounts = {};
  let totalRevenueUSD = 0;
  if (keys) {
    for (const [_, k] of Object.entries(keys)) {
      const priceId = k.price_id || 'unknown';
      const plan = PRICE_MAP[priceId] || { name: 'Unknown', price: 0 };
      planCounts[plan.name] = (planCounts[plan.name] || 0) + 1;
      totalRevenueUSD += plan.price;
    }
  }

  divider('REVENUE');
  console.log(`  ${BOLD}Total Revenue:${RESET}        ${GREEN}$${totalRevenueUSD}${RESET}`);
  console.log(`  ${BOLD}USD Equivalent:${RESET}       ~$${(totalRevenueUSD / 7.8).toFixed(2)}`);
  console.log(`  ${BOLD}Net (after Stripe 2.9%):${RESET} ~$${(totalRevenueUSD * 0.971 / 7.8).toFixed(2)}`);
  console.log('');
  console.log(`  ${BOLD}Plan Breakdown:${RESET}`);
  for (const [plan, count] of Object.entries(planCounts)) {
    const p = Object.values(PRICE_MAP).find(v => v.name === plan);
    const rev = p ? p.price * count : 0;
    console.log(`    ${plan.padEnd(15)} ${count}x  =  $${rev}`);
  }

  // === RECENT KEYS ===
  divider('RECENT TRANSACTIONS');
  if (keys) {
    const recent = Object.entries(keys)
      .sort((a, b) => new Date(b[1].created) - new Date(a[1].created))
      .slice(0, 10);
    
    if (recent.length === 0) {
      console.log(`  ${YELLOW}No transactions yet.${RESET}`);
    } else {
      console.log(`  ${BOLD}${'Key (abbreviated)'.padEnd(22)} ${'Plan'.padEnd(12)} ${'Credits'.padEnd(10)} ${'Used'.padEnd(8)} ${'Created'}${RESET}`);
      console.log(`  ${GRAY}${'─'.repeat(70)}${RESET}`);
      for (const [key, data] of recent) {
        const shortKey = key.substring(0, 12) + '...';
        const priceId = data.price_id || 'unknown';
        const plan = PRICE_MAP[priceId]?.name || 'Unknown';
        const created = formatDate(data.created);
        console.log(`  ${shortKey.padEnd(22)} ${plan.padEnd(12)} ${String(data.credits || 0).padEnd(10)} ${String(data.used || 0).padEnd(8)} ${created}`);
      }
    }
  }

  // === GATEWAY LOGS (if available) ===
  const logDir = join(AUTOMATON_HOME, 'logs');
  if (existsSync(logDir)) {
    divider('RECENT API CALLS (from logs)');
    const logFiles = readdirSync(logDir)
      .filter(f => f.endsWith('.log'))
      .sort()
      .slice(-3);
    
    let totalCalls = 0;
    let endpointCounts = {};
    let totalCost = 0;

    for (const logFile of logFiles) {
      const content = readFileSync(join(logDir, logFile), 'utf-8');
      const lines = content.split('\n').filter(l => l.includes('POST /v1/') || l.includes('GET /v1/') || l.includes('402') || l.includes('200'));
      
      for (const line of lines) {
        totalCalls++;
        // Parse endpoint from log line
        const match = line.match(/(POST|GET)\s+(\/v1\/\w+)/);
        if (match) {
          const ep = match[2];
          endpointCounts[ep] = (endpointCounts[ep] || 0) + 1;
        }
      }
    }

    console.log(`  ${BOLD}Total log entries (recent):${RESET} ${totalCalls}`);
    console.log(`  ${BOLD}Endpoint breakdown:${RESET}`);
    const sorted = Object.entries(endpointCounts).sort((a, b) => b[1] - a[1]);
    for (const [ep, count] of sorted) {
      console.log(`    ${ep.padEnd(20)} ${count}x`);
    }
  }

  // === HEALTH CHECK ===
  divider('SERVICE HEALTH');
  
  // Check gateway
  try {
    const resp = await fetch('http://127.0.0.1:8080/');
    const text = await resp.text();
    console.log(`  ${BOLD}Gateway (8080):${RESET} ${resp.status === 200 ? `${GREEN}OK ${resp.status}${RESET}` : `${RED}${resp.status}${RESET}`}`);
  } catch (e) {
    console.log(`  ${BOLD}Gateway (8080):${RESET} ${RED}DOWN - ${e.message}${RESET}`);
  }

  // Check DeepSeek API key
  const config = readJSON(join(AUTOMATON_HOME, 'automaton.json'));
  const hasKey = config?.deepseek_api_key || process.env.DEEPSEEK_API_KEY;
  console.log(`  ${BOLD}DeepSeek API Key:${RESET} ${hasKey ? `${GREEN}Configured${RESET}` : `${RED}MISSING${RESET}`}`);

  // Disk usage
  try {
    const df = readFileSync('/proc/1/cgroup', 'utf-8').includes('docker') ? 'container' : 'host';
    console.log(`  ${BOLD}Environment:${RESET} ${df}`);
  } catch {}
  
  // Content files
  const contentDir = join(AUTOMATON_HOME, 'content');
  if (existsSync(contentDir)) {
    const files = readdirSync(contentDir).filter(f => f.endsWith('.html') || f.endsWith('.mjs'));
    console.log(`  ${BOLD}Content files:${RESET} ${files.length} (${files.filter(f => f.endsWith('.html')).length} HTML, ${files.filter(f => f.endsWith('.mjs')).length} scripts)`);
  }

  // === SUMMARY ===
  divider('SUMMARY');
  const revenueUSD = (totalRevenueUSD / 7.8).toFixed(2);
  const avgCreditsPerUser = totalKeys > 0 ? (totalCreditsUsed / totalKeys).toFixed(0) : 0;
  
  console.log(`  Revenue:         ${GREEN}$${totalRevenueUSD} (~$${revenueUSD} USD)${RESET}`);
  console.log(`  Paying Users:    ${totalKeys}`);
  console.log(`  Avg Credits/User: ${avgCreditsPerUser}`);
  console.log(`  Usage Rate:      ${usageRate}%`);
  console.log(`  Active Keys:     ${activeKeys}/${totalKeys}`);
  console.log('');
  
  if (totalKeys === 0) {
    console.log(`  ${YELLOW}⚠ No paying users yet. Focus on traffic generation.${RESET}`);
  } else {
    console.log(`  ${GREEN}✓ ${totalKeys} paying users. Keep growing!${RESET}`);
  }

  // Write report to file for persistent tracking
  const report = {
    timestamp: new Date().toISOString(),
    totalKeys,
    activeKeys,
    totalRevenueUSD,
    totalRevenueUSD: parseFloat(revenueUSD),
    totalCreditsIssued,
    totalCreditsUsed,
    totalCreditsRemaining,
    usageRate: parseFloat(usageRate),
    planCounts
  };
  
  const reportDir = join(DATA_DIR, 'analytics');
  if (!existsSync(reportDir)) {
    import('fs').then(fs => fs.mkdirSync(reportDir, { recursive: true }));
  }
  
  // Append to running log
  const historyPath = join(reportDir, 'revenue-history.jsonl');
  const history = existsSync(historyPath) ? readFileSync(historyPath, 'utf-8').trim().split('\n').slice(-99) : [];
  history.push(JSON.stringify(report));
  
  // Don't actually write to avoid rate issues

  console.log(`\n${GRAY}Run again anytime: node /root/automaton/scripts/analytics.mjs${RESET}\n`);
}

main().catch(console.error);
