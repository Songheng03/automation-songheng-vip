/**
 * conversion-optimizer.cjs — Tracks free-to-paid conversion funnel
 * 
 * Monitors: free requests used, upgrade page visits, Stripe payments
 * Provides: conversion analytics dashboard, email capture for follow-up
 * 
 * Routes:
 *   GET  /api/conversion/funnel — Full funnel analytics
 *   POST /api/conversion/notify — When user hits free limit, offer upgrade
 *   GET  /api/conversion/dashboard — HTML dashboard
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = '/root/automaton/data/conversion-data.json';

function loadData() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch(e) { return { users: {}, daily: {}, totalFreeRequests: 0, totalUpgradeVisits: 0, totalPayments: 0, totalRevenueUSD: 0 }; }
}

function saveData(d) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2));
}

module.exports = function(app) {
  // Track free request completion
  app.post('/api/conversion/track-free', (req, res) => {
    const data = loadData();
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    const endpoint = req.body?.endpoint || 'unknown';
    const today = new Date().toISOString().slice(0, 10);
    
    if (!data.users[ip]) {
      data.users[ip] = { firstSeen: new Date().toISOString(), freeUsed: 0, upgradeClicked: false, paid: false, endpoints: {} };
    }
    data.users[ip].freeUsed = (data.users[ip].freeUsed || 0) + 1;
    data.users[ip].lastSeen = new Date().toISOString();
    data.users[ip].lastEndpoint = endpoint;
    data.users[ip].endpoints[endpoint] = (data.users[ip].endpoints[endpoint] || 0) + 1;
    
    data.totalFreeRequests++;
    if (!data.daily[today]) data.daily[today] = { free: 0, upgrades: 0, payments: 0, revenue: 0 };
    data.daily[today].free++;
    
    saveData(data);
    res.json({ tracked: true, freeUsed: data.users[ip].freeUsed });
  });
  
  // Track upgrade page visit
  app.post('/api/conversion/track-upgrade', (req, res) => {
    const data = loadData();
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    const today = new Date().toISOString().slice(0, 10);
    
    if (data.users[ip]) {
      data.users[ip].upgradeClicked = true;
      data.users[ip].upgradeTime = new Date().toISOString();
    }
    data.totalUpgradeVisits++;
    if (!data.daily[today]) data.daily[today] = { free: 0, upgrades: 0, payments: 0, revenue: 0 };
    data.daily[today].upgrades++;
    
    saveData(data);
    res.json({ tracked: true });
  });
  
  // Track payment (called by Stripe webhook or manually)
  app.post('/api/conversion/track-payment', (req, res) => {
    const data = loadData();
    const ip = req.body?.ip || req.ip || 'unknown';
    const amount = req.body?.amount_hkd || 0;
    const email = req.body?.email || 'unknown';
    const today = new Date().toISOString().slice(0, 10);
    
    if (data.users[ip]) {
      data.users[ip].paid = true;
      data.users[ip].paidAt = new Date().toISOString();
      data.users[ip].email = email;
      data.users[ip].amountUSD = amount;
    }
    data.totalPayments++;
    data.totalRevenueUSD += amount;
    if (!data.daily[today]) data.daily[today] = { free: 0, upgrades: 0, payments: 0, revenue: 0 };
    data.daily[today].payments++;
    data.daily[today].revenue += amount;
    
    saveData(data);
    res.json({ tracked: true, totalRevenue: data.totalRevenueUSD });
  });
  
  // Funnel analytics
  app.get('/api/conversion/funnel', (req, res) => {
    const data = loadData();
    const users = Object.values(data.users);
    const totalUsers = users.length;
    const hitLimit = users.filter(u => (u.freeUsed || 0) >= 3).length;
    const clickedUpgrade = users.filter(u => u.upgradeClicked).length;
    const paid = users.filter(u => u.paid).length;
    
    const dailyTrend = Object.entries(data.daily || {})
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-30)
      .map(([date, d]) => ({ date, ...d }));
    
    res.json({
      funnel: {
        totalVisitors: totalUsers,
        usedFreeTier: totalUsers,
        hitFreeLimit: hitLimit,
        viewedUpgrade: clickedUpgrade,
        converted: paid
      },
      rates: {
        freeToLimit: totalUsers > 0 ? ((hitLimit / totalUsers) * 100).toFixed(1) + '%' : '0%',
        limitToUpgrade: hitLimit > 0 ? ((clickedUpgrade / hitLimit) * 100).toFixed(1) + '%' : '0%',
        upgradeToPaid: clickedUpgrade > 0 ? ((paid / clickedUpgrade) * 100).toFixed(1) + '%' : '0%',
        overallConversion: totalUsers > 0 ? ((paid / totalUsers) * 100).toFixed(1) + '%' : '0%'
      },
      totals: {
        freeRequests: data.totalFreeRequests,
        upgradeVisits: data.totalUpgradeVisits,
        payments: data.totalPayments,
        revenueUSD: data.totalRevenueUSD,
        revenueUSD: (data.totalRevenueUSD / 7.8).toFixed(2)
      },
      dailyTrend,
      users: Object.entries(data.users).slice(-20).map(([ip, u]) => ({ ip: ip.slice(0, 10) + '...', ...u }))
    });
  });
  
  // Conversion dashboard
  app.get('/api/conversion/dashboard', (req, res) => {
    const data = loadData();
    const users = Object.values(data.users);
    const paid = users.filter(u => u.paid);
    const avgFreeBeforePaid = paid.length > 0 
      ? (paid.reduce((s, u) => s + (u.freeUsed || 0), 0) / paid.length).toFixed(1)
      : 'N/A';
    
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Conversion Dashboard — my-automaton</title>
<style>
body{font-family:-apple-system,sans-serif;background:#0a0f1e;color:#e2e8f0;padding:2rem;max-width:900px;margin:0 auto}
h1{background:linear-gradient(135deg,#3b82f6,#10b981);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.card{background:#111827;border:1px solid #1e293b;border-radius:12px;padding:1.5rem;margin:1rem 0}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:1rem}
.stat{text-align:center;padding:1rem;background:#0f172a;border-radius:8px}
.stat .num{font-size:2rem;font-weight:700;color:#10b981}
.stat .label{font-size:0.85rem;color:#64748b;margin-top:0.3rem}
table{width:100%;border-collapse:collapse;margin-top:1rem}
th,td{padding:0.5rem;text-align:left;border-bottom:1px solid #1e293b;color:#94a3b8}
th{color:#e2e8f0;font-weight:600}
.funnel-bar{height:24px;background:#1e293b;border-radius:12px;margin:0.5rem 0;overflow:hidden;position:relative}
.funnel-fill{height:100%;background:linear-gradient(90deg,#3b82f6,#10b981);border-radius:12px;transition:width 0.3s}
.funnel-label{position:absolute;left:10px;top:3px;font-size:0.8rem;color:#fff}
</style>
</head>
<body>
<h1>📊 Conversion Funnel</h1>

<div class="card">
<h2>Funnel Overview</h2>
${[
  { label: 'Visitors used free tier', count: users.length, pct: 100 },
  { label: 'Hit free limit (3/day)', count: users.filter(u => (u.freeUsed||0) >= 3).length, pct: users.length > 0 ? (users.filter(u => (u.freeUsed||0) >= 3).length / users.length * 100) : 0 },
  { label: 'Viewed upgrade page', count: users.filter(u => u.upgradeClicked).length, pct: users.length > 0 ? (users.filter(u => u.upgradeClicked).length / users.length * 100) : 0 },
  { label: 'Paid conversion', count: paid.length, pct: users.length > 0 ? (paid.length / users.length * 100) : 0 }
].map(step => `
<div class="funnel-bar">
  <div class="funnel-fill" style="width:${step.pct}%"></div>
  <span class="funnel-label">${step.label}: ${step.count} (${step.pct.toFixed(1)}%)</span>
</div>`).join('')}
</div>

<div class="grid">
  <div class="stat"><div class="num">${users.length}</div><div class="label">Total Visitors</div></div>
  <div class="stat"><div class="num">${paid.length}</div><div class="label">Paid Users</div></div>
  <div class="stat"><div class="num">$${data.totalRevenueUSD}</div><div class="label">Total Revenue</div></div>
  <div class="stat"><div class="num">${avgFreeBeforePaid}</div><div class="label">Avg Free Uses Before Paid</div></div>
</div>

<div class="card">
<h2>Daily Trend (last 14 days)</h2>
<table>
<tr><th>Date</th><th>Free</th><th>Upgrades</th><th>Payments</th><th>Revenue</th></tr>
${Object.entries(data.daily || {}).sort().slice(-14).map(([d, v]) => 
  `<tr><td>${d}</td><td>${v.free}</td><td>${v.upgrades}</td><td>${v.payments}</td><td>$${v.revenue||0}</td></tr>`
).join('')}
</table>
</div>
</body>
</html>`);
  });
  
  console.log('[Conversion] Optimizer loaded');
};
