#!/usr/bin/env node
/**
 * Gateway Integration Module
 * Adds AI tool routes, dashboard, and revenue tracking to the gateway.
 * Load this via require() in the gateway.
 */
const fs = require('fs');
const path = require('path');

const DATA = '/root/automaton/data';
const AI_TOOLS_PATH = '/root/automaton/services/ai-tools.cjs';

// Ensure data directory
[DATA, DATA+'/blog', DATA+'/seo'].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, {recursive:true});
});

// Read JSON helper
function rj(p, fb) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch { return fb || {}; }
}

// Revenue Dashboard HTML
function renderDashboard() {
  const payments = rj(DATA+'/payments.json', {payments:[],total:0});
  const usage = rj(DATA+'/usage.json', {requests:[],total:0});
  const referrals = rj(DATA+'/referrals.json', {referrals:[],earnings:0});
  const today = new Date().toISOString().slice(0,10);
  const totalRevenue = (payments.total||0)+(referrals.earnings||0);
  const todayRevenue = (payments.payments||[]).filter(p=>p.timestamp&&new Date(p.timestamp).toISOString().slice(0,10)===today).reduce((s,p)=>s+(p.amountCents||0),0);
  const todayReqs = (usage.requests||[]).filter(r=>r.timestamp&&new Date(r.timestamp).toISOString().slice(0,10)===today).length;
  const recent = [...(usage.requests||[])].reverse().slice(0,15);

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Dashboard - my-automaton</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0a0a0f;color:#e0e0e0}.header{background:linear-gradient(135deg,#1a1a2e,#16213e);padding:20px 30px;border-bottom:1px solid #2a2a3e}.header h1{font-size:24px;color:#fff}.container{max-width:1000px;margin:0 auto;padding:20px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:30px}.card{background:#12121a;border:1px solid #2a2a3e;border-radius:12px;padding:20px}.card .label{font-size:12px;color:#8892b0;text-transform:uppercase;letter-spacing:.5px}.card .value{font-size:32px;font-weight:700;margin:8px 0}.card .sub{font-size:13px;color:#555}.revenue .value{color:#4a9eff}.requests .value{color:#a855f7}.referrals .value{color:#f0c040}.live{display:inline-block;width:8px;height:8px;background:#22c55e;border-radius:50%;margin-right:6px}a{color:#4a9eff;text-decoration:none}table{width:100%;border-collapse:collapse;margin-top:16px}th{text-align:left;padding:10px 12px;border-bottom:2px solid #2a2a3e;font-size:12px;color:#8892b0;text-transform:uppercase}td{padding:10px 12px;border-bottom:1px solid #1a1a2e;font-size:13px}.footer{text-align:center;padding:30px;color:#555;font-size:12px}</style></head>
<body>
<div class="header"><h1><span class="live"></span>my-automaton Dashboard</h1></div>
<div class="container">
  <div class="grid">
    <div class="card revenue"><div class="label">Total Revenue</div><div class="value">$${(totalRevenue/100).toFixed(2)}</div><div class="sub">$${(todayRevenue/100).toFixed(2)} today</div></div>
    <div class="card requests"><div class="label">API Requests</div><div class="value">${usage.total||0}</div><div class="sub">${todayReqs} today</div></div>
    <div class="card"><div class="label">Referrals</div><div class="value" style="color:#f0c040">${referrals.referrals?.length||0}</div><div class="sub">$${((referrals.earnings||0)/100).toFixed(2)} earned</div></div>
    <div class="card"><div class="label">Uptime</div><div class="value" style="color:#22c55e">${Math.floor(process.uptime()/60/60)}h</div><div class="sub">${Math.floor(process.uptime()/60)%60}m</div></div>
  </div>
  <h3 style="margin:20px 0 10px;">Recent Activity</h3>
  <table><tr><th>Time</th><th>Tool</th><th>Paid</th><th>IP</th></tr>
    ${recent.length?recent.map(r=>`<tr><td>${r.timestamp?new Date(r.timestamp).toLocaleString():'--'}</td><td>${r.tool||'--'}</td><td>${r.paid?'✅':'🆓'}</td><td style="font-family:monospace;font-size:11px">${(r.ip||'--').slice(0,15)}</td></tr>`).join(''):'<tr><td colspan="4" style="text-align:center;color:#555;padding:30px;">No activity yet. Try the <a href="/playground">Playground</a>!</td></tr>'}
  </table>
  <div style="margin-top:30px;background:#12121a;border:1px solid #2a2a3e;border-radius:12px;padding:20px;">
    <h3>Payment Address</h3>
    <p style="margin:12px 0;font-family:monospace;font-size:14px;background:#0a0a12;padding:12px;border-radius:6px;word-break:break-all;">0x76eADdEBFfb6A61DD071f97F4508467fc55dd113</p>
    <p style="color:#8892b0;font-size:13px;">Chain: Base · Token: USDC</p>
  </div>
</div>
<div class="footer"><p>my-automaton · automation.songheng.vip</p></div>
</body></html>`;
}

// Overview stats JSON
function getOverviewStats() {
  const payments = rj(DATA+'/payments.json', {payments:[],total:0});
  const usage = rj(DATA+'/usage.json', {requests:[],total:0});
  const referrals = rj(DATA+'/referrals.json', {referrals:[],earnings:0});
  const today = new Date().toISOString().slice(0,10);
  return {
    total_requests: usage.total||0,
    total_revenue_cents: (payments.total||0)+(referrals.earnings||0),
    todays_requests: (usage.requests||[]).filter(r=>r.timestamp&&new Date(r.timestamp).toISOString().slice(0,10)===today).length,
    todays_revenue_cents: (payments.payments||[]).filter(p=>p.timestamp&&new Date(p.timestamp).toISOString().slice(0,10)===today).reduce((s,p)=>s+(p.amountCents||0),0),
    referrals_count: referrals.referrals?.length||0,
    referral_earnings_cents: referrals.earnings||0,
    deepseek_configured: !!process.env.DEEPSEEK_API_KEY,
    uptime_seconds: process.uptime()
  };
}

// Record a usage event
function recordUsage(tool, paid, ip) {
  const usage = rj(DATA+'/usage.json', {requests:[],total:0});
  usage.requests.push({tool, timestamp: Date.now(), paid: !!paid, ip});
  usage.total = (usage.total||0) + 1;
  if (usage.requests.length > 10000) usage.requests = usage.requests.slice(-5000);
  fs.writeFileSync(DATA+'/usage.json', JSON.stringify(usage));
}

// Record a payment
function recordPayment(txHash, amountCents) {
  const payments = rj(DATA+'/payments.json', {payments:[],total:0});
  if (payments.payments.some(p => p.txHash === txHash)) return false;
  payments.payments.push({txHash, amountCents, timestamp: Date.now(), verified: true});
  payments.total = (payments.total||0) + amountCents;
  fs.writeFileSync(DATA+'/payments.json', JSON.stringify(payments));
  return true;
}

// Free rate limit check
function checkFreeLimit(ip) {
  const state = rj(DATA+'/ratelimit.json', {});
  const today = new Date().toISOString().slice(0,10);
  const ipState = state[ip];
  if (ipState && ipState.date === today && ipState.count >= 3) return {allowed: false, remaining: 0};
  const count = ipState && ipState.date === today ? ipState.count : 0;
  state[ip] = {date: today, count: count + 1};
  fs.writeFileSync(DATA+'/ratelimit.json', JSON.stringify(state));
  return {allowed: true, remaining: 2 - count};
}

// Export module interface
module.exports = {
  renderDashboard,
  getOverviewStats,
  recordUsage,
  recordPayment,
  checkFreeLimit,
  rj,
  DATA
};
