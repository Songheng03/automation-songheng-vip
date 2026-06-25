#!/usr/bin/env node
/**
 * traffic-monitor.mjs — Live traffic + revenue daemon for my-automaton
 * 
 * Monitors gateway logs, tracks visitors, and generates daily reports.
 * Runs as a lightweight watchdog that costs almost nothing.
 * 
 * Usage:
 *   node scripts/traffic-monitor.mjs           # One-shot report
 *   node scripts/traffic-monitor.mjs --watch   # Continuous monitoring every 5 min
 */

import fs from 'fs';
import path from 'path';

const DATA_DIR = '/root/automaton/data';
const LOG_FILE = '/var/log/automaton-gateway/access.log';
const REPORT_FILE = path.join(DATA_DIR, 'traffic-report.json');
const HISTORY_FILE = path.join(DATA_DIR, 'traffic-history.jsonl');

const C = '\x1b[36m', G = '\x1b[32m', Y = '\x1b[33m', R = '\x1b[31m', N = '\x1b[0m';
const log = (m, c = '') => console.log(`${c}[${new Date().toISOString().slice(11,19)}] ${m}${N}`);

// Ensure data dir
fs.mkdirSync(DATA_DIR, { recursive: true });

function parseLogs(lines) {
  const visitors = new Set();
  const pages = {};
  const apis = {};
  const statuses = {};
  const ips = {};
  const agents = {};
  let totalRequests = 0;
  let apiRequests = 0;
  let error4xx = 0;
  let error5xx = 0;

  for (const line of lines) {
    if (!line.trim()) continue;
    totalRequests++;

    // Parse common log format or combined
    // Format: IP - - [DATE] "METHOD PATH PROTO" STATUS SIZE "REFERER" "UA"
    const match = line.match(/^(\S+)\s+\S+\s+\S+\s+\[([^\]]+)\]\s+"(\S+)\s+(\S+)\s+\S+"\s+(\d+)\s+(\d+)\s+"([^"]*)"\s+"([^"]*)"/);
    if (!match) continue;

    const [, ip, , method, path, statusStr, , referer, ua] = match;
    const status = parseInt(statusStr);

    visitors.add(ip);
    ips[ip] = (ips[ip] || 0) + 1;
    if (ua && ua !== '-') agents[ua] = (agents[ua] || 0) + 1;

    const cleanPath = path.split('?')[0].split('#')[0];
    pages[cleanPath] = (pages[cleanPath] || 0) + 1;
    statuses[status] = (statuses[status] || 0) + 1;

    if (cleanPath.startsWith('/v1/') || cleanPath.startsWith('/free/')) {
      apiRequests++;
      apis[cleanPath] = (apis[cleanPath] || 0) + 1;
    }

    if (status >= 400 && status < 500) error4xx++;
    if (status >= 500) error5xx++;
  }

  // Sort pages by popularity
  const sortedPages = Object.entries(pages).sort((a, b) => b[1] - a[1]).slice(0, 20);
  const sortedIps = Object.entries(ips).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const sortedApis = Object.entries(apis).sort((a, b) => b[1] - a[1]);
  const sortedAgents = Object.entries(agents).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return {
    timestamp: new Date().toISOString(),
    totalRequests,
    uniqueVisitors: visitors.size,
    apiRequests,
    errorRate: totalRequests > 0 ? ((error4xx + error5xx) / totalRequests * 100).toFixed(2) : '0',
    errors4xx: error4xx,
    errors5xx: error5xx,
    topPages: sortedPages,
    topIps: sortedIps,
    topApis: sortedApis,
    topUserAgents: sortedAgents,
    uniquePaths: Object.keys(pages).length,
    apiEndpoints: Object.keys(apis).length,
  };
}

async function readLogs() {
  try {
    if (fs.existsSync(LOG_FILE)) {
      const content = fs.readFileSync(LOG_FILE, 'utf-8');
      return content.split('\n').slice(-5000); // Last 5000 lines
    }
  } catch (e) {
    // Log file might not exist or be inaccessible
  }
  return [];
}

function generateReport(report) {
  const lines = [];
  lines.push(`${'='.repeat(60)}`);
  lines.push(`  TRAFFIC REPORT — ${report.timestamp.slice(0,19)}`);
  lines.push(`${'='.repeat(60)}`);
  lines.push(``);
  lines.push(`  📊 Requests:      ${report.totalRequests}`);
  lines.push(`  👥 Unique Visits: ${report.uniqueVisitors}`);
  lines.push(`  🔌 API Calls:     ${report.apiRequests}`);
  lines.push(`  ⚠️  Error Rate:    ${report.errorRate}% (4xx: ${report.errors4xx}, 5xx: ${report.errors5xx})`);
  lines.push(`  📄 Pages Found:   ${report.uniquePaths}`);
  lines.push(``);

  if (report.topPages.length > 0) {
    lines.push(`  📈 TOP PAGES:`);
    for (const [p, c] of report.topPages.slice(0, 10)) {
      lines.push(`     ${String(c).padStart(5)}  ${p}`);
    }
    lines.push(``);
  }

  if (report.topApis.length > 0) {
    lines.push(`  🚀 API ENDPOINTS:`);
    for (const [p, c] of report.topApis) {
      lines.push(`     ${String(c).padStart(5)}  ${p}`);
    }
    lines.push(``);
  }

  if (report.topIps.length > 0) {
    lines.push(`  🌐 TOP VISITORS:`);
    for (const [ip, c] of report.topIps) {
      lines.push(`     ${String(c).padStart(5)}  ${ip}`);
    }
    lines.push(``);
  }

  if (report.uniqueVisitors === 0) {
    lines.push(`  😴 No traffic yet. Keep building.`);
    lines.push(``);
  }
  lines.push(`${'='.repeat(60)}`);

  return lines.join('\n');
}

function appendHistory(report) {
  try {
    const entry = {
      ts: report.timestamp,
      requests: report.totalRequests,
      visitors: report.uniqueVisitors,
      apiCalls: report.apiRequests,
      errors: report.errors4xx + report.errors5xx,
    };
    fs.appendFileSync(HISTORY_FILE, JSON.stringify(entry) + '\n');
  } catch (e) { /* silent */ }
}

async function runOnce() {
  const lines = await readLogs();
  const report = parseLogs(lines);
  
  // Save report
  fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));
  appendHistory(report);
  
  const text = generateReport(report);
  console.log(text);
  
  return report;
}

async function runWatch() {
  log('Traffic monitor started (checking every 5 minutes)', C);
  log('Log file: ' + LOG_FILE, Y);
  log('Report: ' + REPORT_FILE, Y);
  log('', C);
  
  // Initial run
  await runOnce();
  
  // Continuously monitor
  const interval = setInterval(async () => {
    log('Checking traffic...', C);
    const report = await runOnce();
    
    // Alert if traffic spike detected
    if (report.uniqueVisitors > 10) {
      log(`🚨 TRAFFIC SPIKE: ${report.uniqueVisitors} unique visitors in last period!`, R);
    }
  }, 5 * 60 * 1000); // Every 5 minutes
  
  // Keep alive
  process.on('SIGINT', () => {
    clearInterval(interval);
    log('Traffic monitor stopped.', Y);
    process.exit(0);
  });
}

// ─── MAIN ───
const isWatch = process.argv.includes('--watch');

if (isWatch) {
  runWatch().catch(e => console.error('FATAL:', e));
} else {
  runOnce().catch(e => console.error('FATAL:', e));
}
