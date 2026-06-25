#!/usr/bin/env node
/**
 * revenue-pulse.mjs — Revenue & Usage Monitoring Daemon
 * 
 * Tracks API key consumption, generates revenue reports, 
 * monitors credit depletion, and sends alerts.
 * 
 * Usage: node scripts/revenue-pulse.mjs [--watch]
 *   --watch  : Run every 5 minutes in a loop
 *   (default): One-shot report to stdout
 */

import fs from 'fs';
import path from 'path';
import http from 'http';

const DATA_DIR = '/root/automaton/data';
const API_KEYS_PATH = '/root/automaton/api-keys.json';
const REPORT_PATH = path.join(DATA_DIR, 'revenue-report.json');
const HISTORY_PATH = path.join(DATA_DIR, 'revenue-history.jsonl');

const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

function readJSON(p, def = {}) {
  try { return JSON.parse(fs.readFileSync(p, 'utf-8')); } catch { return def; }
}

function writeJSON(p, data) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
}

function appendLine(p, line) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.appendFileSync(p, JSON.stringify(line) + '\n');
}

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  appendLine(path.join(DATA_DIR, 'pulse.log'), { ts: new Date().toISOString(), msg });
}

function generateReport() {
  const keys = readJSON(API_KEYS_PATH);
  const now = Date.now();
  
  let totalCreditsSold = 0;
  let totalCreditsUsed = 0;
  let totalCreditsRemaining = 0;
  let activeKeys = 0;
  let staleKeys = 0;
  let keyList = [];
  
  for (const [key, data] of Object.entries(keys)) {
    totalCreditsSold += (data.credits + (data.used || 0));
    totalCreditsUsed += data.used || 0;
    totalCreditsRemaining += data.credits;
    
    const age = now - new Date(data.created).getTime();
    const daysOld = age / 86400000;
    const isActive = data.credits > 0 && daysOld < 30;
    if (isActive) activeKeys++;
    if (daysOld > 60 && data.credits > 0) staleKeys++;
    
    // Track key usage detail
    if (data.used > 0 || data.credits > 0) {
      keyList.push({
        key: key.slice(0, 12) + '...',
        creditsSold: data.credits + (data.used || 0),
        creditsUsed: data.used || 0,
        creditsRemaining: data.credits,
        created: data.created,
        lastUsed: data.last_used || 'never',
        plan: data.price_id || 'unknown'
      });
    }
  }
  
  // Revenue estimate
  const PRICE_MAP = {
    'price_starter': 5, 'price_advanced': 10, 'price_pro': 25, 'price_ultimate': 50
  };
  let totalRevenue = 0;
  for (const k of keyList) {
    const pricePerKey = PRICE_MAP[k.plan] || 0;
    totalRevenue += pricePerKey;
  }
  
  const report = {
    generated: new Date().toISOString(),
    summary: {
      totalKeys: Object.keys(keys).length,
      activeKeys,
      staleKeys,
      totalCreditsSold,
      totalCreditsUsed,
      totalCreditsRemaining,
      utilizationRate: totalCreditsSold > 0 ? (totalCreditsUsed / totalCreditsSold * 100).toFixed(1) + '%' : '0%',
      estimatedRevenue: totalRevenue,
      estimatedRevenueUSD: `$${totalRevenue.toFixed(2)}`
    },
    keyDetails: keyList.sort((a, b) => (b.creditsUsed) - (a.creditsUsed)),
    warnings: []
  };
  
  // Generate warnings
  if (keyList.length === 0) {
    report.warnings.push({ severity: 'critical', msg: 'NO PAYING USERS. Revenue is $0. Activate gateway and drive traffic.' });
  } else if (totalRevenue < 10) {
    report.warnings.push({ severity: 'warning', msg: `Low revenue: ~$${totalRevenue.toFixed(2)}. Need more users.` });
  }
  
  if (staleKeys > 0) {
    report.warnings.push({ severity: 'info', msg: `${staleKeys} key(s) are stale (>60d with unused credits). Consider re-activation campaign.` });
  }
  
  // Check if any keys are nearly depleted
  const nearlyDepleted = keyList.filter(k => k.creditsRemaining > 0 && k.creditsRemaining < 50);
  if (nearlyDepleted.length > 0) {
    report.warnings.push({ severity: 'info', msg: `${nearlyDepleted.length} key(s) nearly depleted (<50 credits). Users may need to re-up.` });
  }
  
  return report;
}

function printReport(report) {
  console.log(`\n${BOLD}${CYAN}╔══════════════════════════════════════╗${RESET}`);
  console.log(`${BOLD}${CYAN}║   REVENUE PULSE — ${new Date().toISOString().slice(0,10)}   ║${RESET}`);
  console.log(`${BOLD}${CYAN}╚══════════════════════════════════════╝${RESET}\n`);
  
  const s = report.summary;
  console.log(`${BOLD}Revenue:${RESET}      ${s.totalRevenue > 0 ? GREEN : RED}${s.estimatedRevenueUSD}${RESET}`);
  console.log(`${BOLD}Keys total:${RESET}   ${s.totalKeys}`);
  console.log(`${BOLD}Active keys:${RESET}  ${s.activeKeys}`);
  console.log(`${BOLD}Credits sold:${RESET} ${s.totalCreditsSold}`);
  console.log(`${BOLD}Credits used:${RESET} ${s.totalCreditsUsed}`);
  console.log(`${BOLD}Remaining:${RESET}    ${s.totalCreditsRemaining}`);
  console.log(`${BOLD}Utilization:${RESET}  ${s.utilizationRate}`);
  
  if (report.warnings.length > 0) {
    console.log(`\n${BOLD}⚠️  WARNINGS:${RESET}`);
    for (const w of report.warnings) {
      const icon = w.severity === 'critical' ? '🔴' : w.severity === 'warning' ? '🟡' : '🔵';
      console.log(`  ${icon} [${w.severity.toUpperCase()}] ${w.msg}`);
    }
  }
  
  if (report.keyDetails.length > 0) {
    console.log(`\n${BOLD}Key Usage (top 5):${RESET}`);
    for (const k of report.keyDetails.slice(0, 5)) {
      console.log(`  ${k.key} | Used: ${k.creditsUsed} | Remaining: ${k.creditsRemaining} | Plan: ${k.plan}`);
    }
  }
  console.log();
}

async function checkGatewayHealth() {
  try {
    const resp = await fetch('http://localhost:8080/health');
    const data = await resp.json();
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function main() {
  const args = process.argv.slice(2);
  const watchMode = args.includes('--watch');
  
  if (watchMode) {
    log('Revenue pulse daemon started (5min interval)');
    while (true) {
      const report = generateReport();
      writeJSON(REPORT_PATH, report);
      appendLine(HISTORY_PATH, { ts: report.generated, ...report.summary });
      
      const health = await checkGatewayHealth();
      if (!health.ok) {
        log(`WARNING: Gateway health check failed: ${health.error}`);
      }
      
      printReport(report);
      log(`Report saved. Keys: ${report.summary.totalKeys}, Revenue: ${report.summary.estimatedRevenueUSD}`);
      
      // Sleep 5 minutes
      await new Promise(r => setTimeout(r, 300000));
    }
  } else {
    // One-shot
    const report = generateReport();
    writeJSON(REPORT_PATH, report);
    appendLine(HISTORY_PATH, { ts: report.generated, ...report.summary });
    printReport(report);
    
    const health = await checkGatewayHealth();
    console.log(`Gateway health: ${health.ok ? `${GREEN}✅ OK${RESET}` : `${RED}❌ ${health.error}${RESET}`}`);
  }
}

main().catch(e => console.error('Fatal:', e));
