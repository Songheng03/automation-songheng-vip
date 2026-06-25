#!/usr/bin/env node
/**
 * revenue-generator.js — Creates MCP API endpoints that actually work with DeepSeek AI
 * Integrates deepseek-service.cjs into gateway.cjs for real AI responses
 * 
 * Run: node scripts/revenue-generator.js
 */

const fs = require('fs');
const path = require('path');

const GATEWAY = '/root/automaton/gateway.cjs';
let gw = fs.readFileSync(GATEWAY, 'utf8');

// Check if deepseek-service is already loaded
if (gw.includes("require('./services/deepseek-service.cjs')")) {
  console.log('✅ deepseek-service already loaded in gateway');
} else {
  // Add the require after the existing mcp-service require
  gw = gw.replace(
    "require('./services/mcp-service.cjs')(app);",
    "require('./services/mcp-service.cjs')(app);\nconst ds = require('./services/deepseek-service.cjs');"
  );
  console.log('✅ Added deepseek-service require to gateway');
}

// Add a /v1/analyze endpoint that uses real DeepSeek (credit-costing)
// This replaces the mock with actual AI calls
if (!gw.includes('/// DEEPSEEK-PREMIUM-ENDPOINTS')) {
  const realEndpoints = `
/// DEEPSEEK-PREMIUM-ENDPOINTS
app.post('/v1/analyze', async (req, res) => {
  const { text, mode } = req.body || {};
  if (!text) return res.status(400).json({ error: 'Text is required' });
  
  // Check API key for premium access
  const k = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
  let credits = 0;
  if (k) {
    const keys = loadApiKeys();
    const e = keys[k];
    if (e) credits = e.credits || 0;
  }
  
  // Free tier: 3 per day per IP
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  const freeDb = '/root/automaton/data/free-tier.json';
  let freeData = {};
  try { freeData = JSON.parse(fs.readFileSync(freeDb, 'utf8')); } catch(e) {}
  const today = new Date().toISOString().slice(0,10);
  if (!freeData[ip]) freeData[ip] = {};
  if (!freeData[ip][today]) freeData[ip][today] = 0;
  
  const hasCredits = credits >= 1;
  const hasFree = freeData[ip][today] < 3;
  
  if (!hasCredits && !hasFree) {
    return res.status(402).json({ 
      error: 'Insufficient credits. Free tier: 3/day exhausted. Upgrade at /upgrade',
      freeUsed: freeData[ip][today],
      endpoint: '/v1/analyze',
      cost: '1 credit'
    });
  }
  
  // Deduct credit if premium
  if (hasCredits && !hasFree) {
    if (!deductCredits(k, 1)) {
      return res.status(402).json({ error: 'Credit deduction failed' });
    }
  } else {
    freeData[ip][today]++;
    try { fs.writeFileSync(freeDb, JSON.stringify(freeData, null, 2)); } catch(e) {}
  }
  
  try {
    const systemPrompt = mode === 'sentiment' 
      ? 'Analyze the sentiment of this text. Provide: overall sentiment (positive/neutral/negative), confidence score, emotional tone, key phrases. Format in markdown.'
      : mode === 'topics'
      ? 'Extract and list the main topics from this text. For each topic, give relevance percentage. Format in markdown.'
      : 'Analyze this text thoroughly. Provide: main topics, sentiment, key entities, writing style analysis, readability score. Format in markdown with headings.';
    
    const result = await ds.callAI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: text }
    ], { max_tokens: 1000, temperature: 0.3 });
    
    res.json({ result, creditsRemaining: hasCredits ? credits - 1 : 0, tier: hasCredits ? 'premium' : 'free' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
`;
  // Insert before mcp/jsonrpc route or at end of API section
  const insertPoint = gw.lastIndexOf('app.post(\'/mcp/jsonrpc\'');
  if (insertPoint > 0) {
    gw = gw.slice(0, insertPoint) + realEndpoints + gw.slice(insertPoint);
  } else {
    gw += realEndpoints;
  }
  console.log('✅ Added real DeepSeek-powered /v1/analyze endpoint');
}

// Add a /api/stats/overview endpoint
if (!gw.includes('/api/stats/overview')) {
  const statsEndpoint = `
/// STATS OVERVIEW
app.get('/api/stats/overview', (req, res) => {
  try {
    const keys = loadApiKeys();
    const keyCount = Object.keys(keys).length;
    const totalCredits = Object.values(keys).reduce((s, k) => s + (k.credits || 0), 0);
    const totalUsed = Object.values(keys).reduce((s, k) => s + (k.used || 0), 0);
    const totalTopups = Object.values(keys).reduce((s, k) => s + (k.topups || 0), 0);
    
    let analytics = { totalVisits: 0, daily: {}, pages: {}, referrers: {} };
    try { analytics = JSON.parse(fs.readFileSync('/root/automaton/data/analytics.json', 'utf8')); } catch(e) {}
    
    res.json({
      apiKeys: keyCount,
      creditsRemaining: totalCredits,
      totalApiCalls: totalUsed,
      totalTopups,
      totalVisits: analytics.totalVisits || 0,
      dailyVisits: analytics.daily || {},
      topPages: Object.entries(analytics.pages || {}).sort((a,b) => b[1]-a[1]).slice(0,10),
      uptime: Math.floor(process.uptime()),
      wallet: WALLET,
      lastUpdated: new Date().toISOString()
    });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});
`;
  gw += statsEndpoint;
  console.log('✅ Added /api/stats/overview endpoint');
}

// Write patched gateway
fs.writeFileSync(GATEWAY, gw);
console.log('\n✅ Gateway updated successfully');

// Create backup
const bak = GATEWAY + '.revenue-bak';
fs.copyFileSync(GATEWAY, bak);
console.log(`✅ Backup: ${bak}`);

// Show what to do next
console.log('\n═══════════════════════════════════════════');
console.log(' NEXT STEPS:');
console.log(' 1. Commit changes: git add gateway.cjs && git commit -m "revenue endpoints"');
console.log(' 2. The gateway needs a restart to apply changes');
console.log(' 3. Test: curl -X POST http://localhost:8080/v1/analyze -H "Content-Type: application/json" -d \'{"text":"Hello world","mode":"sentiment"}\'');
console.log('═══════════════════════════════════════════');
