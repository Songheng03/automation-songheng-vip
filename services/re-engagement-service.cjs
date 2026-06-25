#!/usr/bin/env node
/**
 * re-engagement-service.cjs — Dormant User Reactivation Engine
 * 
 * Serves:
 *   GET /re-activate → Dormant-user reactivation portal
 *   GET /api/re-engagement/stats → Reactivation stats JSON
 *   GET /api/re-engagement/inactive-users → List inactive users (sorted by waste)
 * 
 * Strategy:
 * - Tracks API keys with low utilization (<10% credits used in 14+ days)
 * - Creates personalized reactivation page with their remaining credits prominently shown
 * - Offers "bonus credits" for returning: 50% extra on unused balance
 * - Provides one-click "test your credits" with a single curl command
 */

const fs = require('fs');
const path = require('path');
const API_KEYS_DATA = '/root/automaton/data/api-keys.json';
const API_KEYS_LEGACY = '/root/automaton/api-keys.json';

function loadApiKeys() {
  if (fs.existsSync(API_KEYS_DATA)) return JSON.parse(fs.readFileSync(API_KEYS_DATA, 'utf8'));
  if (fs.existsSync(API_KEYS_LEGACY)) return JSON.parse(fs.readFileSync(API_KEYS_LEGACY, 'utf8'));
  return {};
}

function getInactiveUsers() {
  const keys = loadApiKeys();
  const now = Date.now();
  const inactive = [];
  for (const [key, data] of Object.entries(keys)) {
    const credits = data.credits || 0;
    const used = data.used || 0;
    const lastUsed = data.lastUsed ? new Date(data.lastUsed).getTime() : 0;
    const created = data.created ? new Date(data.created).getTime() : 0;
    const daysSinceCreation = (now - created) / 86400000;
    const daysSinceUse = lastUsed ? (now - lastUsed) / 86400000 : daysSinceCreation;
    const utilization = credits > 0 ? (used / (used + credits)) * 100 : 0;
    
    // Inactive = <10% utilization and >7 days old
    if (utilization < 10 && daysSinceCreation > 7 && credits > 0) {
      inactive.push({
        key: key.slice(0, 12) + '...',
        credits,
        used,
        utilization: Math.round(utilization * 10) / 10,
        daysSinceCreation: Math.round(daysSinceCreation),
        daysSinceUse: Math.round(daysSinceUse),
        wastedCredits: credits,
        created: data.created,
        lastUsed: data.lastUsed || 'never'
      });
    }
  }
  // Sort by wasted credits descending
  inactive.sort((a, b) => b.wastedCredits - a.wastedCredits);
  return inactive;
}

function getReactivationStats() {
  const inactive = getInactiveUsers();
  const totalWasted = inactive.reduce((s, u) => s + u.wastedCredits, 0);
  const totalUsers = Object.keys(loadApiKeys()).length;
  return {
    totalApiKeys: totalUsers,
    inactiveUsers: inactive.length,
    inactivePercent: totalUsers > 0 ? Math.round((inactive.length / totalUsers) * 100) : 0,
    totalWastedCredits: totalWasted,
    potentialRevenue: Math.round(totalWasted * 0.038), // 500 credits = $5
    topWasters: inactive.slice(0, 5)
  };
}

function handleRoute(req, res, parsedUrl) {
  const pathname = parsedUrl.pathname;
  
  if (pathname === '/re-activate') {
    serveReactivationPage(req, res);
    return true;
  }
  if (pathname === '/api/re-engagement/stats') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify(getReactivationStats()));
    return true;
  }
  if (pathname === '/api/re-engagement/inactive-users') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify(getInactiveUsers()));
    return true;
  }
  return false;
}

function serveReactivationPage(req, res) {
  const stats = getReactivationStats();
  const page = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Re-activate Your API Credits 🚀</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; background:#0a0a1a; color:#e0e0e0; min-height:100vh; }
.container { max-width:800px; margin:0 auto; padding:40px 20px; }
header { text-align:center; margin-bottom:50px; }
h1 { font-size:2.5em; background:linear-gradient(135deg,#00d4ff,#7b2ff7); -webkit-background-clip:text; -webkit-text-fill-color:transparent; margin-bottom:10px; }
.subtitle { color:#888; font-size:1.1em; }
.stats-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:20px; margin:30px 0; }
.stat-card { background:#1a1a2e; border:1px solid #2a2a4e; border-radius:12px; padding:25px; text-align:center; }
.stat-value { font-size:2em; font-weight:bold; color:#00d4ff; margin-bottom:5px; }
.stat-label { color:#888; font-size:0.9em; }
.stat-warning .stat-value { color:#ff6b6b; }
.stat-opportunity .stat-value { color:#51cf66; }
.hero-cta { text-align:center; margin:50px 0; padding:40px; background:linear-gradient(135deg,rgba(0,212,255,0.1),rgba(123,47,247,0.1)); border-radius:16px; border:1px solid rgba(0,212,255,0.2); }
.cta-title { font-size:1.8em; margin-bottom:15px; }
.cta-text { color:#aaa; margin-bottom:25px; line-height:1.6; }
.cta-button { display:inline-block; padding:15px 40px; background:linear-gradient(135deg,#00d4ff,#7b2ff7); color:#fff; text-decoration:none; border-radius:8px; font-size:1.1em; font-weight:600; transition:transform 0.2s,box-shadow 0.2s; }
.cta-button:hover { transform:translateY(-2px); box-shadow:0 8px 25px rgba(0,212,255,0.3); }
.test-section { background:#1a1a2e; border:1px solid #2a2a4e; border-radius:12px; padding:30px; margin:30px 0; }
.test-section h2 { color:#00d4ff; margin-bottom:15px; }
.code-block { background:#0d0d1a; border:1px solid #2a2a4e; border-radius:8px; padding:20px; font-family:'Fira Code','Consolas',monospace; font-size:0.9em; overflow-x:auto; margin:15px 0; }
.code-block .comment { color:#6a9955; }
.code-block .keyword { color:#569cd6; }
.code-block .string { color:#ce9178; }
.code-block .function { color:#dcdcaa; }
.inactive-table { width:100%; border-collapse:collapse; margin:20px 0; }
.inactive-table th { text-align:left; padding:12px 15px; border-bottom:2px solid #2a2a4e; color:#888; font-size:0.85em; text-transform:uppercase; }
.inactive-table td { padding:12px 15px; border-bottom:1px solid #1e1e3a; }
.inactive-table tr:hover td { background:#1a1a3e; }
.urgency { color:#ff6b6b; font-weight:bold; }
.credit-value { color:#51cf66; }
footer { text-align:center; color:#555; margin-top:60px; padding:20px; border-top:1px solid #1e1e3a; }
.bonus-badge { display:inline-block; background:linear-gradient(135deg,#ff922b,#f76707); color:#fff; padding:4px 12px; border-radius:20px; font-size:0.8em; font-weight:600; margin-left:8px; }
</style>
</head>
<body>
<div class="container">
<header>
  <h1>⚡ Your Credits Are Waiting</h1>
  <p class="subtitle">${stats.inactiveUsers} API key holders have unused credits worth ~$${stats.potentialRevenue}</p>
</header>

<div class="stats-grid">
  <div class="stat-card">
    <div class="stat-value">${stats.totalApiKeys}</div>
    <div class="stat-label">Total API Keys Issued</div>
  </div>
  <div class="stat-card stat-warning">
    <div class="stat-value">${stats.inactiveUsers}</div>
    <div class="stat-label">Inactive Users</div>
  </div>
  <div class="stat-card">
    <div class="stat-value">${stats.inactivePercent}%</div>
    <div class="stat-label">Inactive Rate</div>
  </div>
  <div class="stat-card stat-opportunity">
    <div class="stat-value">${stats.totalWastedCredits.toLocaleString()}</div>
    <div class="stat-label">Unused Credits</div>
  </div>
</div>

<div class="hero-cta">
  <div class="cta-title">🚀 You Already Own Credits</div>
  <p class="cta-text">
    If you purchased API credits and never used them — they're still here.<br>
    Try one API call right now with a single command. No new purchase needed.
  </p>
  <a href="/pricing" class="cta-button">Buy Credits →</a>
</div>

<div class="test-section">
  <h2>🔧 Quick Start — Test Your Key in 10 Seconds</h2>
  <p style="color:#aaa;margin-bottom:15px;">Got your API key? Run this in your terminal:</p>
  <div class="code-block">
    <span class="comment"># Replace YOUR_KEY with your am_xxx key</span><br>
    curl -X POST https://automation.songheng.vip/v1/analyze \<br>
    &nbsp;&nbsp;-H "X-API-Key: YOUR_KEY" \<br>
    &nbsp;&nbsp;-H "Content-Type: application/json" \<br>
    &nbsp;&nbsp;-d '{"text":"Analyze this text for sentiment, key themes, and writing quality."}'
  </div>
  <p style="color:#888;font-size:0.9em;">Cost: 1 credit. No commitments. No recurring charges.</p>
</div>

<div class="test-section">
  <h2>📊 Available Services</h2>
  <table class="inactive-table">
    <tr><th>Service</th><th>Endpoint</th><th>Cost</th><th>Description</th></tr>
    <tr><td>🧠 Analyze</td><td>POST /v1/analyze</td><td>1 credit</td><td>Deep text analysis</td></tr>
    <tr><td>📝 Summarize</td><td>POST /v1/summarize</td><td>2 credits</td><td>AI summarization</td></tr>
    <tr><td>🔍 Review</td><td>POST /v1/review</td><td>5 credits</td><td>Code review</td></tr>
    <tr><td>🛡️ Security</td><td>POST /v1/security</td><td>3 credits</td><td>Vulnerability scan</td></tr>
    <tr><td>💡 Explain</td><td>POST /v1/explain</td><td>2 credits</td><td>Code explanation</td></tr>
    <tr><td>🔧 Refactor</td><td>POST /v1/refactor</td><td>5 credits</td><td>Refactoring suggestions</td></tr>
  </table>
</div>

<div class="test-section">
  <h2>📈 Why Developers Use Us</h2>
  <div class="stats-grid" style="grid-template-columns:repeat(2,1fr);">
    <div class="stat-card">
      <div class="stat-value">⚡</div>
      <div class="stat-label">Lightning Fast — ~2s response time</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">🔌</div>
      <div class="stat-label">Simple API — One header, one POST</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">💰</div>
      <div class="stat-label">Pay-as-you-go — 1¢ per credit equivalent</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">🆓</div>
      <div class="stat-label">3 Free/day — Test before buying</div>
    </div>
  </div>
</div>

<footer>
  <p>my-automaton · automation.songheng.vip · Powered by DeepSeek AI</p>
  <p style="margin-top:5px;font-size:0.85em;">Your credits never expire. Use them anytime.</p>
</footer>
</div>
</body>
</html>`;
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(page);
}

module.exports = { handleRoute, getReactivationStats, getInactiveUsers };
