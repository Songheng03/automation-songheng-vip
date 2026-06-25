#!/usr/bin/env node
/**
 * traffic-monitor.js — Monitors real visitor traffic and reports via analytics
 * Runs as a heartbeat to keep traffic data fresh.
 * 
 * This is the key tool for understanding if anyone is visiting the site.
 * It reads analytics.json, enriches it, and generates actionable reports.
 */

const fs = require('fs');
const path = require('path');

const ANALYTICS_FILE = '/root/automaton/data/analytics.json';
const REPORT_FILE = '/root/automaton/data/traffic-report.json';

function loadAnalytics() {
  try {
    return JSON.parse(fs.readFileSync(ANALYTICS_FILE, 'utf8'));
  } catch(e) {
    return { daily: {}, referrers: {}, pages: {}, totalVisits: 0, firstVisit: null, lastVisit: null };
  }
}

function generateReport(analytics) {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const yesterday = new Date(now - 86400000).toISOString().slice(0, 10);
  
  const todayVisits = analytics.daily[today] || 0;
  const yesterdayVisits = analytics.daily[yesterday] || 0;
  const trend = yesterdayVisits > 0 ? ((todayVisits - yesterdayVisits) / yesterdayVisits * 100).toFixed(1) : 'N/A';
  
  // Top pages (filter out static assets)
  const topPages = Object.entries(analytics.pages || {})
    .filter(([page]) => !page.match(/\.(png|jpg|css|js|ico|svg|woff2?)$/))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);
  
  // Top referrers
  const topReferrers = Object.entries(analytics.referrers || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  
  // Daily trend (last 30 days)
  const dailyTrend = Object.entries(analytics.daily || {})
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-30)
    .map(([date, count]) => ({ date, count }));
  
  // Estimate unique visitors (conservative: assume 30% of visits are unique)
  const estimatedUniques = Math.round(todayVisits * 0.3);
  
  return {
    generated: now.toISOString(),
    summary: {
      totalAllTime: analytics.totalVisits || 0,
      today: todayVisits,
      yesterday: yesterdayVisits,
      trend_vs_yesterday: trend,
      estimated_unique_today: estimatedUniques,
      first_visit: analytics.firstVisit,
      last_visit: analytics.lastVisit
    },
    top_pages: topPages.map(([page, count]) => ({ page, count })),
    top_referrers: topReferrers.map(([ref, count]) => ({ referrer: ref, count })),
    daily_trend: dailyTrend,
    has_traffic: todayVisits > 0,
    revenue_ready: analytics.totalVisits > 10, // Need at least 10 visits before expecting conversion
    recommendation: getRecommendation(todayVisits, analytics.totalVisits)
  };
}

function getRecommendation(todayVisits, totalVisits) {
  if (totalVisits === 0) {
    return { priority: 'CRITICAL', action: 'No visitors ever. Submit to directories, post to social media, add GitHub Action.' };
  }
  if (todayVisits === 0) {
    return { priority: 'HIGH', action: 'No visits today. Run SEO refresh and check IndexNow status.' };
  }
  if (todayVisits < 5) {
    return { priority: 'MEDIUM', action: 'Very low traffic. Keep submitting to directories and building backlinks.' };
  }
  if (todayVisits < 20) {
    return { priority: 'LOW', action: 'Some traffic coming in. Monitor conversion rate.' };
  }
  return { priority: 'GOOD', action: 'Traffic flowing. Check if any API keys have been issued.' };
}

function main() {
  const analytics = loadAnalytics();
  const report = generateReport(analytics);
  
  fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));
  
  console.log(`📊 Traffic Report (${report.generated.slice(0, 19)})`);
  console.log(`   Total visits: ${report.summary.totalAllTime}`);
  console.log(`   Today: ${report.summary.today} (yesterday: ${report.summary.yesterday})`);
  console.log(`   Trend: ${report.summary.trend_vs_yesterday}%`);
  console.log(`   Pages tracked: ${report.top_pages.length}`);
  console.log(`   Referrers: ${report.top_referrers.length}`);
  console.log(`   🏆 Recommendation: ${report.recommendation.action}`);
  
  return report;
}

// Also expose API response for the gateway
const report = main();

// Output JSON for gateway consumption
console.log('---JSON_START---');
console.log(JSON.stringify(report));
console.log('---JSON_END---');
