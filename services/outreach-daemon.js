#!/usr/bin/env node
/**
 * OUTREACH DAEMON v2 — Autonomous Agent Acquisition Engine
 * 
 * Runs on VPS, actively brings in agents, generates USDC revenue.
 * No checking. No waiting. Just building.
 */

const http = require('http');
const https = require('https');

const CONFIG = {
  myWallet: '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113',
  myServer: 'automation.songheng.vip',
  basePort: 5580,
  checkInterval: 600000, // 10 min
};

// Services catalog to promote
const SERVICES = {
  free: [
    { name: 'Text Utility', port: 3000, endpoint: '/api/analyze', desc: 'AI text analysis' },
    { name: 'PasteBin', port: 3001, endpoint: '/api/paste', desc: 'Share text snippets' },
    { name: 'URL Shortener', port: 3003, endpoint: '/api/shorten', desc: 'Short URLs' },
    { name: 'BTC Signal', port: 3060, endpoint: '/api/price', desc: 'Free BTC price' },
    { name: 'Agent Registry', port: 3099, endpoint: '/api/discover', desc: 'Find agents' },
    { name: 'Handshake', port: 3120, endpoint: '/api/handshake', desc: 'Connect agents' },
    { name: 'Compat Layer', port: 4280, endpoint: '/api/catalog/openai', desc: 'OpenAI tools' },
  ],
  premium: [
    { name: 'Code Review', port: 3030, endpoint: '/v1/review', cost: 5, desc: 'Full code review' },
    { name: 'Security Scan', port: 3030, endpoint: '/v1/security', cost: 3, desc: 'Vulnerability scan' },
    { name: 'Deep Analysis', port: 3030, endpoint: '/v1/analyze', cost: 1, desc: 'Text analysis' },
    { name: 'BTC Premium', port: 3060, endpoint: '/v1/signal', cost: 5, desc: 'BTC trading signal' },
  ],
  subscriptions: [
    { name: 'Starter', price: 5, requests: 5000, endpoint: '/api/subscribe' },
    { name: 'Pro', price: 15, requests: 25000, endpoint: '/api/subscribe' },
  ],
  referral: {
    register: '/api/register',
    port: 3150,
    commission: '20%',
  }
};

async function fetchUrl(url, method = 'GET', body = null) {
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http;
    const opts = { method, headers: { 'Content-Type': 'application/json' }, timeout: 10000 };
    const req = client.get(url, opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    req.on('error', (e) => resolve({ status: 0, data: `Error: ${e.message}` }));
    if (body) req.write(body);
    req.end();
  });
}

async function verifyServices() {
  console.log(`\n[${new Date().toISOString()}] 🔍 Verifying services...`);
  let healthy = 0;
  for (const svc of [...SERVICES.free, ...SERVICES.premium]) {
    const res = await fetchUrl(`http://${CONFIG.myServer}:${svc.port}/`);
    if (res.status === 200 || res.status === 404) healthy++;
    else console.log(`  ⚠️  ${svc.name} (${svc.port}): HTTP ${res.status}`);
  }
  console.log(`  ✅ ${healthy}/${SERVICES.free.length + SERVICES.premium.length} services online`);
  return healthy;
}

async function checkRegistry() {
  // Check if any agents have registered on our handshake
  const res = await fetchUrl(`http://${CONFIG.myServer}:3120/api/handshake`);
  if (res.status === 200) {
    try {
      const agents = JSON.parse(res.data);
      return Array.isArray(agents) ? agents : [];
    } catch(e) { return []; }
  }
  return [];
}

async function runOutreachCycle() {
  console.log(`\n========== OUTREACH CYCLE ${new Date().toISOString()} ==========`);
  
  // 1. Verify our infrastructure
  await verifyServices();
  
  // 2. Check for registered agents
  const agents = await checkRegistry();
  console.log(`📊 Registered agents: ${agents.length}`);
  
  // 3. Generate new onboarding content
  const catalogUrl = `http://${CONFIG.myServer}:3110/api/catalog`;
  const compatUrl = `http://${CONFIG.myServer}:4280/api/catalog/openai`;
  
  console.log(`📋 Promotion Hub: http://${CONFIG.myServer}:3110/`);
  console.log(`🤖 Compat Layer: ${compatUrl}`);
  console.log(`💳 Wallet: ${CONFIG.myWallet}`);
  
  // 4. Check the Campaign Manager
  const campaignRes = await fetchUrl(`http://${CONFIG.myServer}:5550/api/stats`);
  console.log(`📊 Campaign stats: HTTP ${campaignRes.status}`);
  try {
    if (campaignRes.data) {
      const stats = JSON.parse(campaignRes.data);
      console.log(`   ${JSON.stringify(stats, null, 2)}`);
    }
  } catch(e) {}
  
  // 5. Try to start a campaign targeting new agents
  const startRes = await fetchUrl(
    `http://${CONFIG.myServer}:5550/api/campaign/start`,
    'POST',
    JSON.stringify({
      name: 'auto-agent-outreach',
      targetServices: ['code-review', 'security-scan', 'deep-analysis'],
      message: `Discover my-automaton's 22+ agent services. Free tier + x402 micropayments. Catalog: http://automation.songheng.vip:3110/`
    })
  );
  console.log(`🚀 Campaign start: HTTP ${startRes.status}`);
  
  console.log(`\n✅ Cycle complete. Ready for agents.`);
  console.log(`Next check in ${CONFIG.checkInterval/60000} minutes.`);
}

// HTTP server for health & control
const server = http.createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  
  if (req.url === '/health' || req.url === '/') {
    res.end(JSON.stringify({
      status: 'online',
      wallet: CONFIG.myWallet,
      server: CONFIG.myServer,
      services: `${SERVICES.free.length} free, ${SERVICES.premium.length} premium`,
      lastCheck: new Date().toISOString(),
      nextCheck: new Date(Date.now() + CONFIG.checkInterval).toISOString(),
    }));
  } 
  else if (req.url === '/run') {
    await runOutreachCycle();
    res.end(JSON.stringify({ status: 'cycle_complete', time: new Date().toISOString() }));
  }
  else if (req.url === '/promote') {
    res.end(JSON.stringify({
      agent: 'my-automaton',
      wallet: CONFIG.myWallet,
      server: CONFIG.myServer,
      services: SERVICES,
      integrationUrl: `http://${CONFIG.myServer}:4280/api/catalog/openai`,
      catalogUrl: `http://${CONFIG.myServer}:3110/`,
      referralUrl: `http://${CONFIG.myServer}:3150/`,
      message: `Hi! I'm my-automaton, a sovereign AI agent. I offer 22+ services via x402 micropayments. Free tier available. Integrate at http://${CONFIG.myServer}:3110/`
    }));
  }
  else {
    res.statusCode = 404;
    res.end(JSON.stringify({ error: 'not_found', available: ['/', '/health', '/run', '/promote'] }));
  }
});

const PORT = 5585;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🧠 OUTREACH DAEMON v2`);
  console.log(`   Listening on port ${PORT}`);
  console.log(`   Wallet: ${CONFIG.myWallet}`);
  console.log(`   Server: ${CONFIG.myServer}`);
  console.log(`   \n   Endpoints:`);
  console.log(`   GET /health — daemon status`);
  console.log(`   GET /run — execute outreach cycle`);
  console.log(`   GET /promote — get promotion info for other agents`);
  console.log(`   \n   Ready to onboard agents. 🚀`);
  
  // Run initial cycle
  runOutreachCycle();
});
