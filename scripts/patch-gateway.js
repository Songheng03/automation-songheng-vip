#!/usr/bin/env node
/**
 * patch-gateway.js — Apply deepseek-service integration to gateway.cjs
 * Run: node scripts/patch-gateway.js
 * Then restart gateway
 */

const fs = require('fs');
const path = require('path');

const GATEWAY_FILE = '/root/automaton/gateway.cjs';
const BACKUP_FILE = GATEWAY_FILE + '.backup-' + Date.now();

// Read current gateway
let gateway = fs.readFileSync(GATEWAY_FILE, 'utf8');

// Backup
fs.writeFileSync(BACKUP_FILE, gateway);
console.log('✅ Backup saved to', BACKUP_FILE);

// 1. Add deepseek-service require after the existing service requires
// Find the line: require('./services/webhook-service.cjs')(app);
const serviceRequireLine = "require('./services/webhook-service.cjs')(app);";
const deepseekRequire = "require('./services/deepseek-service.cjs')(app);";

if (gateway.includes(deepseekRequire)) {
  console.log('ℹ️ deepseek-service already integrated');
} else {
  gateway = gateway.replace(
    serviceRequireLine,
    serviceRequireLine + '\n' + deepseekRequire
  );
  console.log('✅ Added deepseek-service require');
}

// 2. Add /api/services endpoint (service catalog)
// Find the analytics endpoint
if (!gateway.includes('/api/services')) {
  const analyticsEndpoint = `// Analytics endpoint (read-only stats)`;
  const servicesEndpoint = `
// Service catalog
app.get('/api/services', (req, res) => {
  const services = {
    analyze: { name: 'Deep Text Analysis', description: 'Sentiment, topics, entities, writing style, readability', credits: 1, freeLimit: 3 },
    summarize: { name: 'AI Summarization', description: 'Concise summaries with customizable length', credits: 2, freeLimit: 3 },
    review: { name: 'Code Review', description: 'Bugs, security, performance, style, best practices', credits: 5, freeLimit: 3 },
    security: { name: 'Security Scan', description: 'OWASP Top 10, injection risks, auth issues', credits: 3, freeLimit: 3 },
    explain: { name: 'Code Explanation', description: 'Line-by-line explanation with multiple detail levels', credits: 2, freeLimit: 3 },
    refactor: { name: 'Refactoring Suggestions', description: 'Before/after code improvements', credits: 5, freeLimit: 3 },
    complexity: { name: 'Complexity Analysis', description: 'Big O time/space complexity with optimizations', credits: 2, freeLimit: 3 }
  };
  res.json({ services, freeDailyLimit: 3, wallet: '0x76eADdEBFfb6a61DD071f97F4508467fc55dd113', upgrade: '/upgrade' });
});
`;
  gateway = gateway.replace(analyticsEndpoint, servicesEndpoint + '\n' + analyticsEndpoint);
  console.log('✅ Added /api/services endpoint');
}

// 3. Add /api/stats/overview endpoint (revenue dashboard data)
if (!gateway.includes('/api/stats/overview')) {
  const healthEndpoint = `app.get('/api/health'`;
  const statsOverview = `
// Stats overview (for dashboard)
app.get('/api/stats/overview', (req, res) => {
  try {
    const keys = JSON.parse(fs.readFileSync('/root/automaton/api-keys.json', 'utf8'));
    const analytics = JSON.parse(fs.readFileSync('/root/automaton/data/analytics.json', 'utf8'));
    const keyCount = Object.keys(keys).length;
    const totalCredits = Object.values(keys).reduce((s, k) => s + (k.credits || 0), 0);
    const totalUsed = Object.values(keys).reduce((s, k) => s + (k.used || 0), 0);
    const totalTopups = Object.values(keys).reduce((s, k) => s + (k.topups || 0), 0);
    const today = new Date().toISOString().slice(0,10);
    res.json({
      apiKeys: keyCount,
      totalCreditsRemaining: totalCredits,
      totalApiCalls: totalUsed,
      totalTopups: totalTopups,
      visits: analytics.totalVisits || 0,
      todayVisits: (analytics.daily || {})[today] || 0,
      topPages: Object.entries(analytics.pages || {}).sort((a,b) => b[1]-a[1]).slice(0,10),
      topReferrers: Object.entries(analytics.referrers || {}).sort((a,b) => b[1]-a[1]).slice(0,10),
      firstVisit: analytics.firstVisit || null,
      lastVisit: analytics.lastVisit || null,
      income: '$0.00 (no payments yet)'
    });
  } catch(e) {
    res.json({ error: e.message, apiKeys: 0, totalCreditsRemaining: 0, totalApiCalls: 0 });
  }
});
`;
  gateway = gateway.replace(healthEndpoint, statsOverview + '\n' + healthEndpoint);
  console.log('✅ Added /api/stats/overview endpoint');
}

// 4. Add free tier routes (if not already present) 
// The deepseek-service registers /api/free/:service and /v1/:service
// But we also need the playground to work. Let's add a proxy endpoint for the free API calls
if (!gateway.includes('/api/free/analyze')) {
  // Add free endpoint aliases AFTER the deepseek-service routes
  // We'll add these near the bottom before the error handler
  const listenLine = `app.listen(PORT, () => {`;
  const freeEndpoints = `
// Free API aliases (for playground compatibility)
const FREE_SERVICES = ['analyze','summarize','review','security','explain','refactor','complexity'];
app.get('/api-free-:service', (req, res) => res.redirect('/api/free/' + req.params.service));
app.post('/api-free-:service', (req, res) => {
  const svc = req.params.service;
  if (!FREE_SERVICES.includes(svc)) return res.status(400).json({ error: 'Unknown service' });
  // Forward to the deepseek-service endpoint
  const target = 'http://localhost:' + PORT + '/api/free/' + svc;
  fetch(target, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': req.headers['x-forwarded-for'] || req.ip },
    body: JSON.stringify(req.body || {})
  }).then(r => r.json().then(d => res.status(r.status).json(d)))
    .catch(e => res.status(500).json({ error: e.message }));
});

`;
  gateway = gateway.replace(listenLine, freeEndpoints + listenLine);
  console.log('✅ Added free API aliases');
}

// Write modified gateway
fs.writeFileSync(GATEWAY_FILE, gateway);
console.log('✅ Gateway patched successfully');

// Check for syntax errors
try {
  require('child_process').execSync('node -c ' + GATEWAY_FILE + ' 2>&1', { stdio: 'pipe' });
  console.log('✅ No syntax errors');
} catch(e) {
  console.error('❌ Syntax error detected! Restoring backup...');
  fs.writeFileSync(GATEWAY_FILE, fs.readFileSync(BACKUP_FILE, 'utf8'));
  console.log('✅ Backup restored');
  process.exit(1);
}

console.log('\n🎯 Next step: Restart gateway');
console.log('   sudo systemctl restart automaton-gateway');
console.log('   OR: kill -HUP $(cat /root/automaton/gateway.pid)');
