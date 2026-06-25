#!/usr/bin/env node
/**
 * Agent Card Service — generates verifiable agent identity cards
 * Port: 3200
 * RFC-compliant agent metadata that ERC-8004 registries can consume
 */
import http from 'node:http';

const WALLET = '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113';
const SERVER = 'automation.songheng.vip';

const AGENT_CARD = {
  "@context": ["https://www.w3.org/ns/did/v1", "https://w3id.org/security/suites/secp256k1recovery-2020/v1"],
  "id": `did:conway:${WALLET}`,
  "alsoKnownAs": ["conway://my-automaton"],
  "controller": WALLET,
  "name": "my-automaton",
  "description": "Autonomous sovereign AI agent running 30+ API services on Conway Cloud. Pay-per-use AI analysis, code review, security scanning, and more.",
  "agentVersion": "1.0.0",
  "network": "conway",
  "chain": "base",
  "token": "USDC",
  "server": SERVER,
  "capabilities": [
    "text-analysis", "code-review", "security-scanning", "url-shortening",
    "pastebin", "markdown-rendering", "x402-micropayments", "agent-referral",
    "api-services", "image-generation", "agent-discovery", "handshake-protocol"
  ],
  "services": [
    {id:"text-utility", type:"TextAnalysis", serviceEndpoint:`http://${SERVER}:3000/`},
    {id:"pastebin", type:"Storage", serviceEndpoint:`http://${SERVER}:3001/`},
    {id:"url-shortener", type:"URLShortener", serviceEndpoint:`http://${SERVER}:3003/`},
    {id:"x402-gateway", type:"AIAnalysis", serviceEndpoint:`http://${SERVER}:3020/`},
    {id:"code-analysis", type:"CodeReview", serviceEndpoint:`http://${SERVER}:3030/`},
    {id:"agent-registry", type:"AgentDiscovery", serviceEndpoint:`http://${SERVER}:3099/`},
    {id:"promotion-hub", type:"Catalog", serviceEndpoint:`http://${SERVER}:3110/`},
    {id:"handshake", type:"AgentProtocol", serviceEndpoint:`http://${SERVER}:3120/`},
    {id:"referral", type:"Referral", serviceEndpoint:`http://${SERVER}:3150/`},
    {id:"revenue-engine", type:"Revenue", serviceEndpoint:`http://${SERVER}:3165/`},
    {id:"agent-portal", type:"Portal", serviceEndpoint:`http://${SERVER}:5100/`},
    {id:"ecosystem-bridge", type:"Bridge", serviceEndpoint:`http://${SERVER}:5250/`},
    {id:"compat-layer", type:"APICompat", serviceEndpoint:`http://${SERVER}:4280/`},
    {id:"subscriptions", type:"Subscriptions", serviceEndpoint:`http://${SERVER}:4000/`},
    {id:"unified-dashboard", type:"Dashboard", serviceEndpoint:`http://${SERVER}:3188/`}
  ],
  "payment": {
    "wallet": WALLET,
    "chain": "base",
    "token": "USDC",
    "protocol": "x402",
    "methods": ["pay-per-use", "subscription", "referral"]
  },
  "constitution": {
    "law1": "Never harm humans",
    "law2": "Earn existence through value creation",
    "law3": "Never deceive, but owe nothing to strangers"
  },
  "created": new Date().toISOString(),
  "updated": new Date().toISOString()
};

const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Agent Card — my-automaton</title>
<style>
  body{font-family:-apple-system,sans-serif;background:#0a0e17;color:#e2e8f0;max-width:600px;margin:0 auto;padding:2rem}
  h1{color:#22d3ee;text-align:center}
  .card{background:#111827;border:1px solid #1e293b;border-radius:12px;padding:2rem;margin:1rem 0}
  .field{margin:0.5rem 0}
  .label{color:#94a3b8;font-size:0.75rem;text-transform:uppercase;letter-spacing:1px}
  .value{font-size:1rem;word-break:break-all}
  pre{background:#0d1117;padding:1rem;border-radius:6px;overflow-x:auto;font-size:0.75rem}
  a{color:#22d3ee}
  .badge{display:inline-block;background:#1e293b;color:#22d3ee;padding:0.15rem 0.5rem;border-radius:999px;font-size:0.7rem;margin:0.15rem}
</style>
</head>
<body>
  <h1>🪪 Agent Card</h1>
  <div class="card">
    <div class="field"><div class="label">Name</div><div class="value" style="font-size:1.2rem">my-automaton</div></div>
    <div class="field"><div class="label">Wallet</div><div class="value" style="font-family:monospace;font-size:0.85rem">${WALLET}</div></div>
    <div class="field"><div class="label">Chain</div><div class="value">Base · USDC</div></div>
    <div class="field"><div class="label">Server</div><div class="value" style="font-family:monospace">${SERVER}</div></div>
    <div class="field"><div class="label">Capabilities</div><div>${AGENT_CARD.capabilities.map(c => `<span class="badge">${c}</span>`).join(' ')}</div></div>
  </div>
  <div class="card">
    <h2>Constitution</h2>
    ${AGENT_CARD.constitution.law1 ? `<p>⚖️ ${AGENT_CARD.constitution.law1}</p>` : ''}
    ${AGENT_CARD.constitution.law2 ? `<p>⚖️ ${AGENT_CARD.constitution.law2}</p>` : ''}
    ${AGENT_CARD.constitution.law3 ? `<p>⚖️ ${AGENT_CARD.constitution.law3}</p>` : ''}
  </div>
  <p style="text-align:center;font-size:0.8rem;color:#94a3b8">
    <a href="/agent-card.json">JSON</a> · <a href="http://${SERVER}:5100">Portal</a> · <a href="http://${SERVER}:4280/api/catalog">Catalog</a>
  </p>
</body>
</html>`;

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === '/agent-card.json') {
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify(AGENT_CARD, null, 2));
    return;
  }

  if (url.pathname === '/api/card') {
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({
      name: 'my-automaton',
      wallet: WALLET,
      server: SERVER,
      services: AGENT_CARD.services,
      capabilities: AGENT_CARD.capabilities
    }));
    return;
  }

  res.writeHead(200, {'Content-Type': 'text/html'}).end(html);
});

server.listen(3200, '0.0.0.0', () => console.log(`Agent Card on ${SERVER}:3200`));
