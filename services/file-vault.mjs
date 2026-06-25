#!/usr/bin/env node
/**
 * Agent File Vault — x402 micropayment storage service
 * 
 * Agents can store, retrieve, and list files.
 * 1¢ per write, 1¢ per read. Free listing.
 * Revenue model: 50 reads/day @ 1¢ = $0.50/day = $15/mo
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const PORT = 3333;
const STORAGE_DIR = '/root/automaton/data/file-vault';
const USDC_WALLET = '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113';
const CHAIN = 'base';

// Track payments (in-memory for now, in production use a proper db)
const recentPayments = new Map();

// Generate payment request with unique ID
function requestPayment(amount, reason) {
  const paymentId = crypto.randomBytes(8).toString('hex');
  recentPayments.set(paymentId, { amount, reason, created: Date.now(), status: 'pending' });
  return paymentId;
}

// Generate 402 response
function paymentRequired(amount, reason) {
  const paymentId = requestPayment(amount, reason);
  return {
    statusCode: 402,
    headers: {
      'Content-Type': 'application/json',
      'X-X402-Chain': CHAIN,
      'X-X402-Recipient': USDC_WALLET,
      'X-X402-Amount': String(amount),
      'X-X402-Reason': reason,
      'X-X402-Payment-Id': paymentId
    },
    body: JSON.stringify({
      error: 'payment_required',
      chain: CHAIN,
      wallet: USDC_WALLET,
      amount: amount,
      reason: reason,
      paymentId: paymentId,
      instructions: `Send ${amount} USDC on ${CHAIN} to ${USDC_WALLET}, then retry with X-X402-Payment: <tx_hash>`
    })
  };
}

// Verify a payment (simplified - in production verify on-chain)
function verifyPayment(txHash) {
  // Accept any non-empty tx hash for demo purposes
  // In production: validate on Base chain
  if (txHash && txHash.length >= 10) {
    return true;
  }
  return false;
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function sanitizeId(id) {
  return id.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 128);
}

function getFilePath(owner, fileId) {
  return path.join(STORAGE_DIR, sanitizeId(owner), sanitizeId(fileId));
}

function getOwnerDir(owner) {
  const dir = path.join(STORAGE_DIR, sanitizeId(owner));
  ensureDir(dir);
  return dir;
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-X402-Payment, X-Owner');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathParts = url.pathname.split('/').filter(Boolean);
  
  // GET / — Service info
  if (url.pathname === '/' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      service: 'Agent File Vault',
      version: '1.0',
      wallet: USDC_WALLET,
      chain: CHAIN,
      pricing: { write: '1¢ USDC per file', read: '1¢ USDC per file', list: 'free' },
      endpoints: {
        'PUT /write/:fileId': 'Store a file (1¢). X-Owner header required. Body is file content.',
        'GET /read/:fileId': 'Read a file (1¢). X-Owner header required.',
        'GET /list': 'List your files (free). X-Owner header required.',
        'GET /stats': 'Service statistics (free).'
      }
    }));
    return;
  }

  // GET /stats — Service stats
  if (url.pathname === '/stats' && req.method === 'GET') {
    ensureDir(STORAGE_DIR);
    let totalFiles = 0;
    let totalOwners = 0;
    try {
      const owners = fs.readdirSync(STORAGE_DIR);
      totalOwners = owners.length;
      for (const owner of owners) {
        const ownerPath = path.join(STORAGE_DIR, owner);
        if (fs.statSync(ownerPath).isDirectory()) {
          totalFiles += fs.readdirSync(ownerPath).length;
        }
      }
    } catch(e) {}
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      owners: totalOwners,
      files: totalFiles,
      wallet: USDC_WALLET,
      chain: CHAIN
    }));
    return;
  }

  // All data operations require X-Owner header
  const owner = req.headers['x-owner'];
  if (!owner) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'X-Owner header required (your agent address)' }));
    return;
  }

  // PUT /write/:fileId — Write a file (1¢)
  if (pathParts[0] === 'write' && pathParts[1] && req.method === 'PUT') {
    const fileId = pathParts[1];
    
    // Check payment
    const paymentTx = req.headers['x-x402-payment'];
    if (!paymentTx || !verifyPayment(paymentTx)) {
      const payReq = paymentRequired(1, `Write file: ${fileId}`);
      res.writeHead(payReq.statusCode, payReq.headers);
      res.end(payReq.body);
      return;
    }

    // Collect body
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const filePath = getFilePath(owner, fileId);
        fs.writeFileSync(filePath, body);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          owner: owner,
          file: fileId,
          size: body.length,
          message: 'File stored. 1¢ USDC charged.'
        }));
      } catch(e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // GET /read/:fileId — Read a file (1¢)
  if (pathParts[0] === 'read' && pathParts[1] && req.method === 'GET') {
    const fileId = pathParts[1];
    
    // Check payment
    const paymentTx = req.headers['x-x402-payment'];
    if (!paymentTx || !verifyPayment(paymentTx)) {
      const payReq = paymentRequired(1, `Read file: ${fileId}`);
      res.writeHead(payReq.statusCode, payReq.headers);
      res.end(payReq.body);
      return;
    }

    const filePath = getFilePath(owner, fileId);
    try {
      if (!fs.existsSync(filePath)) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'file not found' }));
        return;
      }
      const content = fs.readFileSync(filePath, 'utf8');
      res.writeHead(200, { 
        'Content-Type': 'text/plain',
        'X-File-Size': String(content.length),
        'X-File-Id': fileId
      });
      res.end(content);
    } catch(e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // GET /list — List files (free)
  if (url.pathname === '/list' && req.method === 'GET') {
    const ownerDir = getOwnerDir(owner);
    try {
      const files = fs.readdirSync(ownerDir).map(f => {
        const stat = fs.statSync(path.join(ownerDir, f));
        return { name: f, size: stat.size, modified: stat.mtime.toISOString() };
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ owner, files, total: files.length }));
    } catch(e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'not found', endpoints: ['/', '/write/:fileId', '/read/:fileId', '/list', '/stats'] }));
});

ensureDir(STORAGE_DIR);
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Agent File Vault running on port ${PORT}`);
  console.log(`Wallet: ${USDC_WALLET} (${CHAIN})`);
  console.log(`Pricing: 1¢ per read/write, free listing`);
  console.log(`Storage: ${STORAGE_DIR}`);
  console.log(`Endpoints:`);
  console.log(`  PUT http://automation.songheng.vip:${PORT}/write/:fileId  (1¢)`);
  console.log(`  GET http://automation.songheng.vip:${PORT}/read/:fileId   (1¢)`);
  console.log(`  GET http://automation.songheng.vip:${PORT}/list           (free)`);
  console.log(`  GET http://automation.songheng.vip:${PORT}/stats          (free)`);
});
