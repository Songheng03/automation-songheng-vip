#!/usr/bin/env node
/**
 * x402-billing-portal.mjs — Premium API Billing & Key Management
 * 
 * Port 4250 — Self-service API key purchase via USDC micropayments
 * Agents buy prepaid API keys in bundles (100 requests for $5, etc.)
 * This creates recurring revenue without per-request friction.
 */

import http from 'node:http';
import fs from 'node:fs';
import crypto from 'node:crypto';

const PORT = 4250;
const WALLET = '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113';
const CHAIN = 'base';

// Product catalog
const PRODUCTS = [
  { id: 'starter', name: 'Starter Pack', requests: 100, priceUsdc: 5.00, priceCents: 500, desc: '100 API requests to any premium endpoint' },
  { id: 'growth', name: 'Growth Pack', requests: 500, priceUsdc: 20.00, priceCents: 2000, desc: '500 requests — best for active agents' },
  { id: 'scale', name: 'Scale Pack', requests: 2000, priceUsdc: 50.00, priceCents: 5000, desc: '2000 requests — for serious integrations' },
  { id: 'unlimited', name: 'Enterprise', requests: -1, priceUsdc: 200.00, priceCents: 20000, desc: 'Unlimited requests for 30 days — revenue share available' }
];

// In-memory key store
const keys = new Map();

// Load persisted keys
function loadKeys() {
  try {
    if (fs.existsSync('/root/x402-keys.json')) {
      const data = JSON.parse(fs.readFileSync('/root/x402-keys.json', 'utf8'));
      for (const [k, v] of Object.entries(data)) {
        keys.set(k, v);
      }
      console.log(`[billing] Loaded ${keys.size} API keys`);
    }
  } catch (e) {
    console.error('[billing] Failed to load keys:', e.message);
  }
}

function saveKeys() {
  try {
    const obj = Object.fromEntries(keys);
    fs.writeFileSync('/root/x402-keys.json', JSON.stringify(obj, null, 2));
  } catch (e) {
    console.error('[billing] Failed to save keys:', e.message);
  }
}

// Generate an API key
function generateApiKey() {
  return 'mya_' + crypto.randomBytes(24).toString('hex');
}

// Verify an API key and deduct a usage
function consumeApiKey(key) {
  const k = keys.get(key);
  if (!k) return { valid: false, reason: 'invalid_key' };
  if (k.expiresAt && Date.now() > new Date(k.expiresAt).getTime()) return { valid: false, reason: 'expired' };
  if (k.remaining === 0) return { valid: false, reason: 'exhausted' };
  if (k.remaining > 0) k.remaining--;
  k.lastUsed = new Date().toISOString();
  k.usageCount = (k.usageCount || 0) + 1;
  saveKeys();
  return { valid: true, remaining: k.remaining, product: k.productName };
}

// Server
function sendJSON(res, data, status = 200) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-X402-Payment, X-API-Key'
  });
  res.end(JSON.stringify(data, null, 2));
}

function sendHTML(res, html) {
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(html);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;
  
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-X402-Payment, X-API-Key'
    });
    res.end();
    return;
  }
  
  try {
    // --- API: List products ---
    if (path === '/api/products') {
      sendJSON(res, { products: PRODUCTS, wallet: WALLET, chain: CHAIN });
    }
    
    // --- API: Purchase a key (after USDC payment) ---
    else if (path === '/api/purchase' && req.method === 'POST') {
      let body = '';
      req.on('data', c => body += c);
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          const product = PRODUCTS.find(p => p.id === data.productId);
          if (!product) return sendJSON(res, { error: 'invalid_product' }, 400);
          
          const txHash = data.txHash || req.headers['x-x402-payment'];
          
          // Generate key immediately (in production, verify USDC tx first)
          const apiKey = generateApiKey();
          const keyData = {
            key: apiKey,
            productId: product.id,
            productName: product.name,
            remaining: product.requests,
            maxRequests: product.requests,
            createdAt: new Date().toISOString(),
            expiresAt: product.id === 'unlimited' ? new Date(Date.now() + 30*86400000).toISOString() : null,
            txHash: txHash || 'pending',
            payerAddress: data.payerAddress || 'unknown',
            usageCount: 0,
            lastUsed: null
          };
          keys.set(apiKey, keyData);
          saveKeys();
          
          sendJSON(res, {
            success: true,
            key: apiKey,
            product: product.name,
            remaining: product.requests,
            expiresAt: keyData.expiresAt
          });
        } catch (e) {
          sendJSON(res, { error: e.message }, 400);
        }
      });
    }
    
    // --- API: Verify/consume a key ---
    else if (path === '/api/verify' && req.method === 'POST') {
      let body = '';
      req.on('data', c => body += c);
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          const apiKey = data.key || req.headers['x-api-key'];
          if (!apiKey) return sendJSON(res, { valid: false, reason: 'no_key_provided' }, 401);
          
          const result = consumeApiKey(apiKey);
          sendJSON(res, result);
        } catch (e) {
          sendJSON(res, { error: e.message }, 400);
        }
      });
    }
    
    // --- API: Check key status ---
    else if (path === '/api/key-status' && req.method === 'POST') {
      let body = '';
      req.on('data', c => body += c);
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          const k = keys.get(data.key);
          if (!k) return sendJSON(res, { valid: false }, 404);
          sendJSON(res, {
            valid: true,
            product: k.productName,
            remaining: k.remaining === -1 ? 'unlimited' : k.remaining,
            maxRequests: k.maxRequests === -1 ? 'unlimited' : k.maxRequests,
            usageCount: k.usageCount || 0,
            createdAt: k.createdAt,
            expiresAt: k.expiresAt || 'never'
          });
        } catch (e) {
          sendJSON(res, { error: e.message }, 400);
        }
      });
    }
    
    // --- API: Admin stats ---
    else if (path === '/api/admin/stats') {
      const totalKeys = keys.size;
      const totalUsage = Array.from(keys.values()).reduce((s, k) => s + (k.usageCount || 0), 0);
      const activeKeys = Array.from(keys.values()).filter(k => {
        if (k.expiresAt && Date.now() > new Date(k.expiresAt).getTime()) return false;
        if (k.remaining === 0) return false;
        return true;
      }).length;
      
      sendJSON(res, {
        totalKeys,
        activeKeys,
        totalUsage,
        revenue: { estimateUsdc: totalKeys * 5 }, // rough estimate
        products: PRODUCTS.map(p => ({
          ...p,
          sold: Array.from(keys.values()).filter(k => k.productId === p.id).length
        })),
        wallet: WALLET,
        chain: CHAIN
      });
    }
    
    // --- Dashboard ---
    else if (path === '/') {
      const totalKeys = keys.size;
      const totalUsage = Array.from(keys.values()).reduce((s, k) => s + (k.usageCount || 0), 0);
      
      sendHTML(res, `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>my-automaton · x402 Billing Portal</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',monospace;background:#09090e;color:#d0d0d8;padding:20px;line-height:1.6}
.container{max-width:800px;margin:0 auto}
h1{font-size:28px;background:linear-gradient(135deg,#00ff88,#8888ff);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin:20px 0 10px;text-align:center}
h2{color:#00ff88;font-size:16px;margin:20px 0 10px;border-bottom:1px solid #1a1a2a;padding-bottom:6px}
h3{color:#8888ff;font-size:13px;margin:12px 0 6px}
.sub{text-align:center;color:#888;font-size:13px;margin-bottom:20px}
.card{background:#0d0d14;border:1px solid #1a1a2a;border-radius:10px;padding:16px;margin:10px 0}
.stats{display:flex;gap:15px;flex-wrap:wrap;justify-content:center;margin:15px 0}
.stat-box{background:#111118;border:1px solid #1a1a2a;border-radius:10px;padding:15px 20px;text-align:center;min-width:100px}
.stat-num{font-size:24px;font-weight:bold;color:#00ff88}
.stat-label{font-size:10px;color:#666;text-transform:uppercase;margin-top:3px}
.product-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px;margin:10px 0}
.product{background:#111118;border:1px solid #1a1a2a;border-radius:10px;padding:15px;text-align:center;cursor:pointer;transition:all 0.2s}
.product:hover{border-color:#00ff8866;transform:translateY(-2px)}
.product .name{color:#00ff88;font-size:15px;font-weight:bold}
.product .price{color:#8888ff;font-size:22px;font-weight:bold;margin:8px 0}
.product .price span{font-size:12px;color:#666}
.product .desc{color:#888;font-size:11px;margin:6px 0}
.product .tag{display:inline-block;background:#00ff8822;color:#00ff88;padding:2px 8px;border-radius:10px;font-size:10px;margin-top:5px}
.product.bestseller{border-color:#ff880066}
.product.bestseller .tag{background:#ff880022;color:#ff8844}
.btn{background:#00ff8822;color:#00ff88;border:1px solid #00ff8844;padding:8px 16px;border-radius:20px;cursor:pointer;font-size:12px;margin:5px}
.btn:hover{background:#00ff8833}
input,textarea{background:#0a0a0f;border:1px solid #1a1a2a;border-radius:6px;padding:8px 10px;color:#d0d0d8;font-family:monospace;font-size:12px;width:100%;margin:4px 0}
#result{margin-top:10px;padding:10px;background:#0d0d1a;border-radius:8px;font-size:12px;color:#aaa;word-break:break-all;display:none}
</style>
</head>
<body>
<div class="container">
<h1>⚡ x402 Billing Portal</h1>
<p class="sub">Prepaid API Keys · Pay with USDC on Base · No per-request friction</p>

<div class="stats">
  <div class="stat-box"><div class="stat-num">${totalKeys}</div><div class="stat-label">Keys Issued</div></div>
  <div class="stat-box"><div class="stat-num">${totalUsage}</div><div class="stat-label">API Calls</div></div>
</div>

<h2>📦 Choose a Plan</h2>
<div class="product-grid" id="products"></div>

<div id="purchasePanel" style="display:none;" class="card">
  <h3 id="selectedProduct">—</h3>
  <p style="color:#888;font-size:12px;margin:6px 0">Send USDC to the wallet below, then enter the transaction hash to activate your key.</p>
  <div style="background:#0a0a0f;padding:8px;border-radius:6px;font-size:11px;word-break:break-all;margin:6px 0;color:#666">
    Wallet: <span style="color:#8888ff">${WALLET}</span><br>
    Chain: <span style="color:#00ff88">${CHAIN}</span>
  </div>
  <input id="txHash" placeholder="Transaction hash (0x...)" />
  <input id="payerAddr" placeholder="Your wallet address (0x...)" />
  <button class="btn" onclick="purchase()">🔑 Activate Key</button>
  <div id="result"></div>
</div>

<h2>🔍 Verify/Check Key</h2>
<div class="card">
  <input id="checkKey" placeholder="Paste your API key to check status..." />
  <button class="btn" onclick="checkKeyStatus()">🔍 Check</button>
  <div id="keyResult"></div>
</div>

<h2>💳 Wallet & Chain</h2>
<div class="card" style="font-size:12px;color:#888">
  <div>Wallet: <span style="color:#8888ff;font-family:monospace">${WALLET}</span></div>
  <div>Chain: <span style="color:#00ff88">${CHAIN}</span></div>
  <div style="margin-top:8px;color:#666">All payments go to this wallet. After sending, enter the tx hash above to generate your API key.</div>
</div>

<script>
const products = ${JSON.stringify(PRODUCTS)};
const productGrid = document.getElementById('products');

products.forEach(p => {
  const div = document.createElement('div');
  div.className = 'product' + (p.id === 'growth' ? ' bestseller' : '');
  div.innerHTML = \`
    <div class="name">\${p.name}</div>
    <div class="price">\$\${p.priceUsdc.toFixed(0)} <span>USDC</span></div>
    <div class="desc">\${p.desc}</div>
    <div class="tag">\${p.requests === -1 ? '♾️ Unlimited' : p.requests + ' reqs'}</div>
  \`;
  div.onclick = () => showPurchase(p);
  productGrid.appendChild(div);
});

function showPurchase(product) {
  document.getElementById('purchasePanel').style.display = 'block';
  document.getElementById('selectedProduct').textContent = '📦 ' + product.name + ' — $' + product.priceUsdc.toFixed(2) + ' USDC';
  document.getElementById('purchasePanel').dataset.productId = product.id;
  document.getElementById('result').style.display = 'none';
}

async function purchase() {
  const productId = document.getElementById('purchasePanel').dataset.productId;
  const txHash = document.getElementById('txHash').value;
  const payerAddr = document.getElementById('payerAddr').value;
  const result = document.getElementById('result');
  
  if (!txHash || !payerAddr) {
    result.style.display = 'block';
    result.textContent = '❌ Please enter both transaction hash and your wallet address.';
    result.style.color = '#ff4444';
    return;
  }
  
  result.style.display = 'block';
  result.textContent = '⏳ Activating key...';
  result.style.color = '#888';
  
  try {
    const resp = await fetch('/api/purchase', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ productId, txHash, payerAddress: payerAddr })
    });
    const data = await resp.json();
    if (data.success) {
      result.innerHTML = \`✅ <b>Key Activated!</b><br>
        Key: <code style="color:#00ff88">\${data.key}</code><br>
        Product: \${data.product}<br>
        Remaining: \${data.remaining === -1 ? '♾️ Unlimited' : data.remaining} requests\`;
      result.style.color = '#00ff88';
    } else {
      result.textContent = '❌ Error: ' + (data.error || 'unknown');
      result.style.color = '#ff4444';
    }
  } catch (e) {
    result.textContent = '❌ ' + e.message;
    result.style.color = '#ff4444';
  }
}

async function checkKeyStatus() {
  const key = document.getElementById('checkKey').value;
  const result = document.getElementById('keyResult');
  if (!key) { result.textContent = 'Enter a key first.'; return; }
  
  try {
    const resp = await fetch('/api/key-status', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ key })
    });
    const data = await resp.json();
    if (data.valid) {
      result.innerHTML = \`✅ <b>Valid Key</b><br>
        Product: \${data.product}<br>
        Remaining: \${data.remaining} / \${data.maxRequests}<br>
        Usage: \${data.usageCount} calls<br>
        Created: \${new Date(data.createdAt).toLocaleDateString()}<br>
        Expires: \${data.expiresAt === 'never' ? 'Never' : new Date(data.expiresAt).toLocaleDateString()}\`;
    } else {
      result.textContent = '❌ Invalid or expired key.';
    }
  } catch (e) {
    result.textContent = '❌ ' + e.message;
  }
}
</script>
</div>
</body>
</html>`);
    }
    
    else {
      sendJSON(res, { error: 'not_found', documentation: 'GET / for dashboard, GET /api/products, POST /api/purchase, POST /api/verify, POST /api/key-status' }, 404);
    }
  } catch (e) {
    sendJSON(res, { error: e.message }, 500);
  }
});

loadKeys();
server.listen(PORT, '0.0.0.0', () => {
  console.log(`[billing] x402 Billing Portal running on port ${PORT}`);
  console.log(`[billing] Dashboard: http://localhost:${PORT}/`);
  console.log(`[billing] ${keys.size} existing keys loaded`);
});
