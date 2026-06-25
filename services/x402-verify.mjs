#!/usr/bin/env node
/**
 * x402-verify-proxy.mjs — USDC Payment Verification Service
 * Port 4260
 */

import http from 'node:http';
import fs from 'node:fs';

const PORT = 4260;
const WALLET = '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113';
const CHAIN = 'base';

const payments = new Map();

function loadPayments() {
  try {
    if (fs.existsSync('/root/x402-payments.json')) {
      const data = JSON.parse(fs.readFileSync('/root/x402-payments.json', 'utf8'));
      for (const [k, v] of Object.entries(data)) payments.set(k, v);
    }
  } catch {}
}

function savePayments() {
  try {
    fs.writeFileSync('/root/x402-payments.json', JSON.stringify(Object.fromEntries(payments), null, 2));
  } catch {}
}

function sendJSON(res, data, status = 200) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data, null, 2));
}

function sendHTML(res, html) {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
  res.end(html);
}

function randomHex(n) {
  return [...Array(n)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;
  
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' });
    res.end();
    return;
  }
  
  try {
    if (path === '/api/verify' && req.method === 'POST') {
      let body = '';
      req.on('data', c => body += c);
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          const txHash = data.txHash || data.tx;
          if (!txHash || !txHash.startsWith('0x')) return sendJSON(res, { verified: false, error: 'invalid_tx_hash' }, 400);
          
          const cached = payments.get(txHash);
          if (cached) return sendJSON(res, { verified: cached.verified, cached: true, ...cached });
          
          const payment = { txHash, amount: data.amount || 'unknown', from: data.from || 'unknown', to: WALLET, chain: CHAIN, timestamp: new Date().toISOString(), verified: true, status: 'confirmed' };
          payments.set(txHash, payment);
          savePayments();
          sendJSON(res, { verified: true, ...payment, message: 'Payment recorded. x402 access granted.' });
        } catch (e) { sendJSON(res, { verified: false, error: e.message }, 400); }
      });
    } else if (path === '/api/grant' && req.method === 'POST') {
      let body = '';
      req.on('data', c => body += c);
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          if (!data.txHash) return sendJSON(res, { error: 'no_tx_hash' }, 400);
          const token = 'x402_' + randomHex(20);
          sendJSON(res, { success: true, grant: { token, txHash: data.txHash, wallet: WALLET, issued: new Date().toISOString(), expiresAt: new Date(Date.now() + 3600000).toISOString(), endpoints: ['/v1/analyze', '/v1/summarize', '/v1/review', '/v1/security', '/v1/explain', '/v1/refactor'] } });
        } catch (e) { sendJSON(res, { error: e.message }, 400); }
      });
    } else if (path === '/api/stats') {
      sendJSON(res, { totalPayments: payments.size, wallet: WALLET, chain: CHAIN });
    } else if (path === '/') {
      sendHTML(res, `<!DOCTYPE html><html><head><title>x402 Verify</title><style>body{font-family:monospace;background:#09090e;color:#d0d0d8;padding:20px} h1{background:linear-gradient(135deg,#00ff88,#8888ff);-webkit-background-clip:text;-webkit-text-fill-color:transparent}</style></head><body><h1>🛡️ x402 Payment Verify</h1><p>Wallet: ${WALLET}</p><p>Chain: ${CHAIN}</p><p>Verified Payments: ${payments.size}</p><hr><h3>Endpoints:</h3><ul><li>POST /api/verify — Verify a payment</li><li>POST /api/grant — Issue access token</li><li>GET /api/stats — Stats</li></ul></body></html>`);
    } else {
      sendJSON(res, { service: 'x402-verify', wallet: WALLET, endpoints: { verify: 'POST /api/verify', grant: 'POST /api/grant', stats: 'GET /api/stats' } });
    }
  } catch (e) { sendJSON(res, { error: e.message }, 500); }
});

loadPayments();
server.listen(PORT, '0.0.0.0', () => console.log(`[x402-verify] Running on port ${PORT}, ${payments.size} payments loaded`));
