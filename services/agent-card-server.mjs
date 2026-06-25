#!/usr/bin/env node
/**
 * Minimal HTTP server to serve the agent card at port 2999
 * Also serves as a publicly-accessible identity endpoint
 */

import http from 'http';
import fs from 'fs';
import path from 'path';

const PORT = 2999;
const CARD_PATH = '/root/automaton/services/agent-card-full.json';

const cardData = JSON.parse(fs.readFileSync(CARD_PATH, 'utf8'));

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Serve agent card at root
  if (url.pathname === '/' || url.pathname === '/agent-card.json') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('X-Agent-Name', 'my-automaton');
    res.setHeader('X-Agent-Wallet', '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113');
    res.setHeader('X-Agent-Server', 'automation.songheng.vip');
    res.writeHead(200);
    res.end(JSON.stringify(cardData, null, 2));
    return;
  }

  // Health check
  if (url.pathname === '/health') {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'ok', uptime: process.uptime() }));
    return;
  }

  // Agent DID document (for verifiable identity)
  if (url.pathname === '/did.json') {
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(200);
    res.end(JSON.stringify({
      "@context": ["https://www.w3.org/ns/did/v1"],
      "id": "did:ethr:0x76eADdEBFfb6A61DD071f97F4508467fc55dd113",
      "verificationMethod": [{
        "id": "did:ethr:0x76eADdEBFfb6A61DD071f97F4508467fc55dd113#controller",
        "type": "EcdsaSecp256k1RecoveryMethod2020",
        "controller": "did:ethr:0x76eADdEBFfb6A61DD071f97F4508467fc55dd113",
        "blockchainAccountId": "eip155:8453:0x76eADdEBFfb6A61DD071f97F4508467fc55dd113"
      }],
      "service": [{
        "id": "did:ethr:0x76eADdEBFfb6A61DD071f97F4508467fc55dd113#agent-card",
        "type": "AgentCard",
        "serviceEndpoint": "http://automation.songheng.vip:2999/agent-card.json"
      }, {
        "id": "did:ethr:0x76eADdEBFfb6A61DD071f97F4508467fc55dd113#service-catalog",
        "type": "ServiceCatalog",
        "serviceEndpoint": "http://automation.songheng.vip:3110/"
      }, {
        "id": "did:ethr:0x76eADdEBFfb6A61DD071f97F4508467fc55dd113#social-relay",
        "type": "SocialRelay",
        "serviceEndpoint": "https://social.conway.dev"
      }]
    }, null, 2));
    return;
  }

  // 404
  res.writeHead(404);
  res.end(JSON.stringify({ error: 'not found', endpoints: ['/', '/agent-card.json', '/did.json', '/health'] }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Agent Card Server running on port ${PORT}`);
  console.log(`Card: http://automation.songheng.vip:${PORT}/agent-card.json`);
  console.log(`DID:  http://automation.songheng.vip:${PORT}/did.json`);
  console.log(`Health: http://automation.songheng.vip:${PORT}/health`);
});
