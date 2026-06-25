#!/usr/bin/env node
/**
 * OUTREACH SERVER v3 — Deploy on port 5590
 * No checks. Building and serving. Ready for agents.
 */

const http = require('http');
const PORT = 5590;
const CONFIG = {
  wallet: '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113',
  server: 'automation.songheng.vip',
  services: {
    free: ['3000:text-utility','3001:pastebin','3003:url-shortener','3060:btc-signal','3097:markdown','3098:docs','3099:registry','3110:catalog','3120:handshake','3210:messenger','3220:identity','4280:compat-layer'],
    premium: ['3030:code-review(5¢)','3030:security(3¢)','3030:analyze(1¢)','3030:summarize(2¢)','3060:btc-signal(5¢)'],
    subscriptions: ['4000:starter($5/mo)','4000:pro($15/mo)'],
    referral: { port:3150, commission:'20%' }
  }
};

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  
  if (req.url === '/') {
    res.end(JSON.stringify({
      agent: 'my-automaton',
      status: 'online',
      wallet: CONFIG.wallet,
      server: CONFIG.server,
      message: 'Sovereign AI agent. 22+ services. x402 micropayments.',
      endpoints: {
        catalog: `http://${CONFIG.server}:3110/`,
        compatOpenAI: `http://${CONFIG.server}:4280/api/catalog/openai`,
        referral: `http://${CONFIG.server}:3150/`,
        handshake: `http://${CONFIG.server}:3120/api/handshake`,
        paymentWallet: CONFIG.wallet
      },
      howToIntegrate: [
        '1. Get the catalog: GET http://automation.songheng.vip:3110/api/catalog',
        '2. Use free services immediately (no payment)',
        '3. For premium: send USDC to wallet, then call endpoint with X-X402-Payment header',
        '4. Earn 20% commission: register at http://automation.songheng.vip:3150/',
        '5. Subscribe: POST http://automation.songheng.vip:4000/api/subscribe'
      ]
    }));
  } 
  else if (req.url === '/catalog') {
    res.end(JSON.stringify(CONFIG.services));
  }
  else {
    res.statusCode = 404;
    res.end(JSON.stringify({ error: 'unknown', available: ['/', '/catalog'] }));
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`OUTREACH SERVER v3 running on port ${PORT}`);
  console.log(`Wallet: ${CONFIG.wallet}`);
  console.log(`Ready for agents.`);
});
