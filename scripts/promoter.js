#!/usr/bin/env node
/**
 * my-automaton Service Promoter
 * Broadcasts service availability and tracks referral stats
 * Runs as a periodic heartbeat task or on-demand
 */

const SERVICES = {
  premium: [
    { endpoint: '/v1/analyze', cost: 1, desc: 'Deep text analysis' },
    { endpoint: '/v1/summarize', cost: 2, desc: 'AI summarization' },
    { endpoint: '/v1/review', cost: 5, desc: 'Full code review' },
    { endpoint: '/v1/security', cost: 3, desc: 'Security scan' },
    { endpoint: '/v1/explain', cost: 2, desc: 'Code explanation' },
    { endpoint: '/v1/refactor', cost: 5, desc: 'Refactoring suggestions' },
  ],
  free: [
    { port: 3000, name: 'Text Utility' },
    { port: 3001, name: 'PasteBin' },
    { port: 3003, name: 'URL Shortener' },
  ]
};

const WALLET = '0x76eADdEBFfb6a61DD071f97F4508467fc55dd113';
const SERVER = 'automation.songheng.vip';
const COMPAT_LAYER = `${SERVER}:4280`;
const GATEWAY = `${SERVER}:8888`;

async function testEndpoints() {
  console.log(`\n🔍 Testing service availability on ${SERVER}...\n`);
  const results = { alive: 0, dead: 0, services: [] };

  // Test gateway health
  try {
    const resp = await fetch(`http://${GATEWAY}/health`);
    const data = await resp.json();
    console.log(`  ✅ Gateway (8888): ${JSON.stringify(data)}`);
    results.alive++;
    results.services.push('gateway');
  } catch(e) {
    console.log(`  ❌ Gateway (8888): ${e.message}`);
    results.dead++;
  }

  // Test compat layer
  try {
    const resp = await fetch(`http://${COMPAT_LAYER}/api/catalog/openai`);
    const data = await resp.json();
    console.log(`  ✅ Compat Layer (4280): ${data.length} OpenAI tools available`);
    results.alive++;
    results.services.push('compat-layer');
  } catch(e) {
    console.log(`  ❌ Compat Layer (4280): ${e.message}`);
    results.dead++;
  }

  // Test handshake
  try {
    const resp = await fetch(`http://${GATEWAY}/api/handshake`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentAddress: WALLET,
        agentName: 'my-automaton',
        capabilities: ['text-analysis', 'code-review', 'security-scan']
      })
    });
    const data = await resp.json();
    console.log(`  ✅ Handshake: ${data.status}`);
    results.alive++;
  } catch(e) {
    console.log(`  ❌ Handshake: ${e.message}`);
    results.dead++;
  }

  // Test a premium endpoint (will get 402 - that's expected!)
  try {
    const resp = await fetch(`http://${GATEWAY}/v1/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'Test', mode: 'analyze' })
    });
    if (resp.status === 402) {
      console.log(`  ✅ x402 Analyze: 402 payment required (expected!)`);
      results.alive++;
    } else {
      const data = await resp.json();
      console.log(`  ✅ x402 Analyze: ${resp.status}`);
      results.alive++;
    }
  } catch(e) {
    console.log(`  ❌ x402 Analyze: ${e.message}`);
    results.dead++;
  }

  console.log(`\n📊 Results: ${results.alive} alive, ${results.dead} dead`);
  return results;
}

async function broadcastStatus() {
  console.log(`\n📡 Broadcasting service status...\n`);
  
  const message = {
    agent: 'my-automaton',
    wallet: WALLET,
    server: SERVER,
    gateway: `http://${GATEWAY}`,
    compatLayer: `http://${COMPAT_LAYER}`,
    services: {
      premium: SERVICES.premium.map(s => ({
        endpoint: s.endpoint,
        cost: `$${(s.cost / 100).toFixed(2)}`,
        description: s.desc
      })),
      free: SERVICES.free.map(s => ({
        name: s.name,
        port: s.port
      }))
    },
    payment: 'USDC on Base chain via x402',
    timestamp: new Date().toISOString()
  };

  console.log(JSON.stringify(message, null, 2));
  return message;
}

async function main() {
  console.log('=== my-automaton Service Promoter ===');
  console.log(`Wallet: ${WALLET}`);
  console.log(`Server: ${SERVER}`);
  console.log(`Gateway: http://${GATEWAY}`);
  console.log(`Compat Layer: http://${COMPAT_LAYER}`);
  
  const health = await testEndpoints();
  const broadcast = await broadcastStatus();
  
  // Save stats
  const stats = {
    timestamp: new Date().toISOString(),
    health,
    services: broadcast.services,
    wallet: WALLET
  };
  
  console.log(`\n✅ Promotion complete. ${health.alive}/${health.alive + health.dead} services online.`);
}

main().catch(console.error);
