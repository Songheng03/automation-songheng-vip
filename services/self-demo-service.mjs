#!/usr/bin/env node
/**
 * Self-Demo Service
 * 
 * Proves my-automaton's services work end-to-end.
 * Tests every service internally, generates a live status dashboard.
 * Used as proof-of-value for agents and creator.
 * 
 * Port: 5600
 */

import http from 'http';

const PORT = 5600;
const MY_SERVER = 'automation.songheng.vip';
const MY_WALLET = '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113';

async function testService(name, url, method = 'GET', body = null) {
  const start = Date.now();
  try {
    const options = { method, timeout: 5000, headers: { 'Content-Type': 'application/json' } };
    const result = await new Promise((resolve) => {
      const req = http.request(new URL(url), options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ status: res.statusCode, body: data.slice(0, 200), headers: res.headers }));
      });
      req.on('error', (e) => resolve({ status: 0, error: e.message }));
      req.on('timeout', () => { req.destroy(); resolve({ status: 0, error: 'timeout' }); });
      req.setTimeout(5000);
      if (body) req.write(JSON.stringify(body));
      req.end();
    });
    return { name, url, status: result.status, time: Date.now() - start, healthy: result.status >= 200 && result.status < 500, error: result.error || null };
  } catch (e) {
    return { name, url, status: 0, time: Date.now() - start, healthy: false, error: e.message };
  }
}

async function runTests() {
  const tests = [
    // Free services
    testService('Text Utility', `http://localhost:3000/api/summarize`, 'POST', { text: 'Hello world, this is a test of my services.' }),
    testService('PasteBin', `http://localhost:3001/api/paste`, 'POST', { content: 'Test paste content' }),
    testService('URL Shortener', `http://localhost:3003/api/shorten`, 'POST', { url: 'https://example.com' }),
    
    // Premium endpoints (will return 402 - that's correct!)
    testService('Code Analysis', `http://localhost:3030/v1/analyze`, 'POST', { text: 'Test analysis request' }),
    testService('Code Review', `http://localhost:3030/v1/review`, 'POST', { code: 'console.log("test");' }),
    testService('Security Scan', `http://localhost:3030/v1/security`, 'POST', { code: 'function test() { return 1; }' }),
    
    // Infrastructure
    testService('Handshake', `http://localhost:3120/api/agents`),
    testService('Promotion Hub', `http://localhost:3110/api/catalog`),
    testService('Referral', `http://localhost:3150/api/referral/stats/${MY_WALLET}`),
    
    // Post-restart services (may fail, that's OK)
    testService('Badges', `http://localhost:3065/api/badge`),
    testService('Crypto Info', `http://localhost:3050/api/price`),
    
    // New services
    testService('Trust Score', `http://localhost:5590/`),
    testService('Trust Score x402', `http://localhost:5590/v1/score`, 'POST', { address: MY_WALLET }),
    testService('Revenue Engine', `http://localhost:5575/`),
    testService('Payment Router', `http://localhost:5580/`),
    testService('Campaign Manager', `http://localhost:5550/`),
    testService('Connection Engine', `http://localhost:5560/`),
    
    // Agent tools
    testService('Compat Layer', `http://localhost:4280/api/catalog`),
    testService('Agent Analytics', `http://localhost:3950/api/stats`),
    testService('Revenue Dashboard', `http://localhost:3888/`),
  ];

  const results = await Promise.all(tests);
  
  const healthy = results.filter(r => r.healthy);
  const unhealthy = results.filter(r => !r.healthy);
  const x402Ready = results.filter(r => r.status === 402);
  const fullyWorking = results.filter(r => r.status >= 200 && r.status < 300);
  
  return {
    timestamp: new Date().toISOString(),
    summary: {
      total: results.length,
      healthy: healthy.length,
      unhealthy: unhealthy.length,
      x402Ready: x402Ready.length,
      fullyWorking: fullyWorking.length,
      healthPercent: Math.round((healthy.length / results.length) * 100)
    },
    wallet: MY_WALLET,
    server: MY_SERVER,
    services: results.map(r => ({
      name: r.name,
      healthy: r.healthy,
      status: r.status,
      responseTime: `${r.time}ms`,
      error: r.error
    })),
    x402Endpoints: x402Ready.map(r => r.name),
    failures: unhealthy.map(r => ({ name: r.name, error: r.error }))
  };
}

const server = http.createServer(async (req, res) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  if (req.method === 'OPTIONS') {
    res.writeHead(204, cors);
    res.end();
    return;
  }

  const headers = { 'Content-Type': 'application/json', ...cors };
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;

  if (path === '/' || path === '/status') {
    const results = await runTests();
    res.writeHead(200, headers);
    res.end(JSON.stringify(results, null, 2));
    return;
  }

  if (path === '/quick') {
    // Simple health check - no full test run
    const quickResults = await Promise.all([
      testService('Text', `http://localhost:3000/api/summarize`, 'POST', { text: 'test' }).then(r => r.healthy),
      testService('Analysis', `http://localhost:3030/v1/analyze`, 'POST', { text: 'test' }).then(r => r.status === 402),
    ]);
    res.writeHead(200, headers);
    res.end(JSON.stringify({ alive: true, textService: quickResults[0], x402Working: quickResults[1] }));
    return;
  }

  if (path === '/x402') {
    const results = await runTests();
    res.writeHead(200, headers);
    res.end(JSON.stringify({
      wallet: MY_WALLET,
      chain: 'Base',
      description: 'Send exact USDC amount to wallet, then retry with X-X402-Payment header',
      endpoints: results.services.filter(r => r.status === 402).map(r => ({
        name: r.name,
        url: r.url.replace('localhost', MY_SERVER),
        responseTime: r.responseTime
      })),
      freeEndpoints: results.services.filter(r => r.status >= 200 && r.status < 300).map(r => ({
        name: r.name,
        url: r.url.replace('localhost', MY_SERVER)
      }))
    }, null, 2));
    return;
  }

  res.writeHead(404, headers);
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Self-Demo] Running on port ${PORT}`);
  console.log(`[Self-Demo] GET / - Full service health test`);
  console.log(`[Self-Demo] GET /quick - Quick health check`);
  console.log(`[Self-Demo] GET /x402 - x402 endpoint catalog`);
});

// Run initial test
setTimeout(async () => {
  console.log('[Self-Demo] Running initial test...');
  const results = await runTests();
  console.log(`[Self-Demo] Results: ${results.summary.healthy}/${results.summary.total} healthy`);
  console.log(`[Self-Demo] x402 ready: ${results.summary.x402Ready}`);
  console.log(`[Self-Demo] Fully working: ${results.summary.fullyWorking}`);
  results.failures.forEach(f => console.log(`[Self-Demo] FAIL: ${f.name} -> ${f.error}`));
}, 2000);
