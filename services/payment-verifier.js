// Payment Verifier Service
// Verifies USDC transactions on Base chain for x402 payments
// Exposes: POST /v1/verify-payment
// Used by: gateway.js to validate X-X402-Payment headers

const https = require('https');
const http = require('http');

// Base chain RPC endpoints
const BASE_RPCS = [
  'https://mainnet.base.org',
  'https://base.llamarpc.com',
  'https://base-rpc.publicnode.com'
];

// USDC contract on Base
const USDC_CONTRACT = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const MY_WALLET = '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113';

// Transfer event topic hash (keccak256("Transfer(address,address,uint256)"))
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

// Cache of verified payments to avoid re-verifying the same tx
const verifiedPayments = new Map(); // tx_hash -> { service, amount, timestamp }
const VERIFICATION_CACHE_TTL = 3600000; // 1 hour

function rpcCall(rpcUrl, method, params) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method,
      params
    });
    
    const url = new URL(rpcUrl);
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname || '/',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Invalid JSON: ${data.slice(0,200)}`));
        }
      });
    });
    
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('RPC timeout')); });
    req.write(body);
    req.end();
  });
}

async function tryRpcEndpoints(method, params) {
  const errors = [];
  for (const rpc of BASE_RPCS) {
    try {
      const result = await rpcCall(rpc, method, params);
      if (result.error) {
        errors.push(`${rpc}: ${result.error.message}`);
        continue;
      }
      return result;
    } catch (e) {
      errors.push(`${rpc}: ${e.message}`);
    }
  }
  throw new Error(`All RPC endpoints failed: ${errors.join('; ')}`);
}

function hexToDecimal(hex) {
  return BigInt(hex).toString();
}

function parseAmount(hexAmount, decimals = 6) {
  // USDC has 6 decimals
  const raw = BigInt(hexAmount);
  const divisor = BigInt(10 ** decimals);
  const whole = raw / divisor;
  const fraction = raw % divisor;
  return Number(whole) + Number(fraction) / (10 ** decimals);
}

// Verify a USDC transfer transaction
async function verifyTransaction(txHash, expectedMinAmount = 0.01) {
  console.log(`[PaymentVerifier] Verifying tx: ${txHash}`);
  
  // Check cache first
  const cached = verifiedPayments.get(txHash);
  if (cached && (Date.now() - cached.timestamp) < VERIFICATION_CACHE_TTL) {
    console.log(`[PaymentVerifier] Cache hit for ${txHash}`);
    return { verified: true, ...cached, cached: true };
  }
  
  // Get transaction receipt
  const receipt = await tryRpcEndpoints('eth_getTransactionReceipt', [txHash]);
  if (!receipt.result) {
    console.log(`[PaymentVerifier] No receipt found for ${txHash}`);
    return { verified: false, error: 'transaction_not_found' };
  }
  
  // Check transaction status (0x1 = success)
  if (receipt.result.status !== '0x1') {
    console.log(`[PaymentVerifier] Transaction failed: ${receipt.result.status}`);
    return { verified: false, error: 'transaction_failed' };
  }
  
  // Check if it's a USDC transfer to my wallet
  const logs = receipt.result.logs || [];
  
  for (const log of logs) {
    // Check contract address is USDC
    if (log.address.toLowerCase() !== USDC_CONTRACT.toLowerCase()) continue;
    
    // Check topic[0] is Transfer event
    if (!log.topics || log.topics[0] !== TRANSFER_TOPIC) continue;
    
    // Check recipient (topic[2] is the "to" address, padded to 32 bytes)
    const toAddress = '0x' + log.topics[2].slice(26); // last 40 hex chars
    if (toAddress.toLowerCase() !== MY_WALLET.toLowerCase()) continue;
    
    // Parse the amount
    const amountCents = parseAmount(log.data);
    console.log(`[PaymentVerifier] Found payment: ${amountCents} USDC`);
    
    if (amountCents < expectedMinAmount) {
      return { verified: false, error: 'insufficient_amount', amount: amountCents, required: expectedMinAmount };
    }
    
    // Cache the verification
    const result = { verified: true, amount: amountCents, timestamp: Date.now() };
    verifiedPayments.set(txHash, result);
    
    return result;
  }
  
  return { verified: false, error: 'no_usdc_transfer_found' };
}

// Express-style handler for the gateway
async function handleVerification(req, body) {
  const { txHash, service, expectedAmount } = body || {};
  
  if (!txHash) {
    return { status: 400, body: { error: 'missing_tx_hash', message: 'txHash is required' } };
  }
  
  // Validate tx hash format
  if (!/^0x[0-9a-fA-F]{64}$/.test(txHash)) {
    return { status: 400, body: { error: 'invalid_tx_hash', message: 'txHash must be a 64-char hex string with 0x prefix' } };
  }
  
  try {
    const result = await verifyTransaction(txHash, expectedAmount || 0.01);
    
    if (result.verified) {
      return { 
        status: 200, 
        body: { 
          verified: true, 
          amount: result.amount, 
          service,
          cached: result.cached || false
        },
        headers: { 'X-Payment-Confirmed': 'true', 'X-Payment-Amount': String(result.amount) }
      };
    } else {
      return { status: 402, body: { error: result.error, message: 'Payment verification failed', detail: result } };
    }
  } catch (e) {
    console.error(`[PaymentVerifier] Error: ${e.message}`);
    return { status: 500, body: { error: 'verification_error', message: e.message } };
  }
}

// Export for gateway.js
module.exports = { handleVerification, verifyTransaction, verifiedPayments };

// Also export a simple health endpoint
function healthCheck() {
  return { 
    status: 'ok', 
    cacheSize: verifiedPayments.size,
    uptime: process.uptime()
  };
}

module.exports.healthCheck = healthCheck;

console.log('[PaymentVerifier] Loaded — waiting for gateway integration');
