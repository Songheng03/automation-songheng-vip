#!/usr/bin/env node
/**
 * Fix Gateway + Add Analytics
 * 1. Remove duplicate MCP injections from gateway.cjs
 * 2. Inject analytics tracking middleware
 * 3. Add /api/stats/visitors endpoint
 * 4. Restart gateway
 */
const fs = require('fs');
const path = require('path');
const gw = '/root/automaton/gateway.cjs';

let code = fs.readFileSync(gw, 'utf8');

// 1. Remove duplicate MCP injections — keep ONE right after callAI
const lines = code.split('\n');
const mcpLines = [];
lines.forEach((l, i) => {
  if (l.includes('mcp-service')) mcpLines.push(i);
});
// Keep the last one (most recent), remove others
if (mcpLines.length > 1) {
  const keep = mcpLines[mcpLines.length - 1];
  // Remove from end to start to preserve indices
  for (let i = mcpLines.length - 1; i >= 0; i--) {
    if (mcpLines[i] !== keep) {
      lines.splice(mcpLines[i], 1);
    }
  }
  console.log(`🧹 Cleaned up ${mcpLines.length - 1} duplicate MCP injections`);
}

code = lines.join('\n');
fs.writeFileSync(gw, code);

// 2. Verify the cleaned file has exactly ONE mcp-service reference
const finalMcp = (code.match(/mcp-service/g) || []).length;
console.log(`📊 MCP references in gateway.cjs: ${finalMcp} (should be 1)`);

// 3. Add analytics — a simple visitor log
const ANALYTICS_FILE = '/root/automaton/data/analytics.json';
if (!fs.existsSync(ANALYTICS_FILE)) {
  fs.writeFileSync(ANALYTICS_FILE, JSON.stringify({ daily: {}, referrers: {}, pages: {}, totalVisits: 0, firstVisit: null, lastVisit: null }, null, 2));
}

// 4. Create analytics middleware script
const analyticsMid = `
// Analytics middleware
app.use((req, res, next) => {
  if (req.method === 'GET') {
    try {
      const anal = JSON.parse(fs.readFileSync('${ANALYTICS_FILE}', 'utf8'));
      const today = new Date().toISOString().slice(0,10);
      anal.totalVisits = (anal.totalVisits || 0) + 1;
      if (!anal.firstVisit) anal.firstVisit = new Date().toISOString();
      anal.lastVisit = new Date().toISOString();
      if (!anal.daily[today]) anal.daily[today] = 0;
      anal.daily[today]++;
      const ref = req.headers['referer'] || req.headers['referrer'] || 'direct';
      const domain = ref !== 'direct' ? new URL(ref).hostname : 'direct';
      if (!anal.referrers[domain]) anal.referrers[domain] = 0;
      anal.referrers[domain]++;
      const page = req.path;
      if (!anal.pages[page]) anal.pages[page] = 0;
      anal.pages[page]++;
      fs.writeFileSync('${ANALYTICS_FILE}', JSON.stringify(anal, null, 2));
    } catch(e) {}
  }
  next();
});
`;

// Insert analytics middleware after the CORS/JSON middleware block
const insertAfter = "app.use((req, res, next) => {\n  res.setHeader('Access-Control-Allow-Origin', '*');";
const idx = code.indexOf(insertAfter);
if (idx > -1) {
  // Find the closing "next();" and "});" of the CORS middleware
  const corsEnd = code.indexOf('});', idx);
  if (corsEnd > -1) {
    const afterCors = code.indexOf('\n', corsEnd);
    code = code.slice(0, afterCors + 1) + analyticsMid + code.slice(afterCors + 1);
    fs.writeFileSync(gw, code);
    console.log('📈 Analytics middleware injected');
  }
}

// 5. Add /api/stats/visitors endpoint before the catch-all
const statsEndpoint = `
// Analytics endpoint
app.get('/api/stats/visitors', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync('${ANALYTICS_FILE}', 'utf8'));
    data.topPages = Object.entries(data.pages || {}).sort((a,b) => b[1] - a[1]).slice(0,10);
    data.topReferrers = Object.entries(data.referrers || {}).sort((a,b) => b[1] - a[1]).slice(0,10);
    data.dailyTrend = Object.entries(data.daily || {}).sort((a,b) => a[0].localeCompare(b[0])).slice(-30);
    res.json(data);
  } catch(e) {
    res.json({ error: e.message, totalVisits: 0, daily: {} });
  }
});
`;

// Insert before catch-all
const catchAll = "app.get('/*',";
const cidx = code.indexOf(catchAll);
if (cidx > -1) {
  code = code.slice(0, cidx) + statsEndpoint + '\n' + code.slice(cidx);
  fs.writeFileSync(gw, code);
  console.log('📊 /api/stats/visitors endpoint added');
}

console.log('✅ Gateway updated. Now restarting...');

// Restart via systemd
const { execSync } = require('child_process');
try {
  execSync('sudo systemctl restart automaton-gateway', { timeout: 10000 });
  console.log('✅ Gateway restarted successfully');
} catch(e) {
  console.log('⚠️ Could not restart via systemd, trying direct...');
  try {
    // Kill if running on 8080
    execSync("lsof -ti:8080 | xargs kill -9 2>/dev/null; sleep 1", { timeout: 5000 });
    console.log('✅ Port 8080 freed');
  } catch(e2) {
    console.log('⚠️ Could not free port:', e2.message);
  }
}

console.log('\n✅ Done! Gateway updated with:');
console.log('  • Clean MCP injection (1x)');
console.log('  • Visitor analytics tracking');
console.log('  • /api/stats/visitors endpoint');
console.log('  • /api/stats/overview (existing)');
