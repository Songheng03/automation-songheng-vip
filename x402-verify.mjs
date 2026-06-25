#!/usr/bin/env node
// x402-verify.mjs — On-chain USDC payment verification for Base chain
// Verifies that a transaction hash corresponds to a real USDC transfer
// to the agent's wallet address

import https from 'https';

const AGENT_WALLET = '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113'.toLowerCase();
const USDC_CONTRACT = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'; // Base USDC
const BASESCAN_API = 'https://api.basescan.org/api';

// Use public RPC as fallback, basescan for primary verification
async function basescanQuery(params) {
  return new Promise((resolve, reject) => {
    const url = BASESCAN_API + '?' + new URLSearchParams({ ...params, apikey: 'YourApiKeyToken' }).toString();
    https.get(url, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch(e) { reject(e); }
      });
    }).on('error', reject);
  });
}

// Verify a USDC transfer by tx hash
// Returns { verified: bool, amount: number (cents), from: string, txHash: string }
export async function verifyPayment(txHash, expectedCents) {
  if (!txHash || typeof txHash !== 'string' || !txHash.match(/^0x[0-9a-fA-F]{64}$/)) {
    return { verified: false, error: 'invalid_tx_hash' };
  }
  
  const txHashLower = txHash.toLowerCase();
  
  // Try basescan API for tx receipt (public — may work without API key for basic queries)
  try {
    const result = await basescanQuery({
      module: 'proxy',
      action: 'eth_getTransactionReceipt',
      txhash: txHashLower
    });
    
    if (result.result) {
      const receipt = result.result;
      const logs = receipt.logs || [];
      
      // Look for Transfer event from USDC contract
      // Transfer event signature: 0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef
      const transferTopic = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
      
      for (const log of logs) {
        if (log.address.toLowerCase() === USDC_CONTRACT.toLowerCase() &&
            log.topics && log.topics[0] === transferTopic) {
          
          // topics[1] = from, topics[2] = to (indexed, padded to 32 bytes)
          const toAddr = '0x' + log.topics[2].slice(26); // last 40 hex chars
          const fromAddr = '0x' + log.topics[1].slice(26);
          
          if (toAddr === AGENT_WALLET) {
            // USDC has 6 decimals
            const rawAmount = BigInt(log.data);
            const amountCents = Number(rawAmount / 10000n); // Convert to cents (USDC has 6 decimals, so divide by 10^4 to get cents from 10^6)
            // Actually: USDC amount = rawAmount / 10^6 (dollars). Cents = rawAmount / 10^4
            const actualCents = Number(rawAmount) / 10000;
            
            if (actualCents >= expectedCents * 0.95) { // Allow 5% slippage
              return {
                verified: true,
                amount: Math.round(actualCents),
                expected: expectedCents,
                from: fromAddr,
                txHash: txHashLower
              };
            } else {
              return {
                verified: false,
                error: 'insufficient_amount',
                received: Math.round(actualCents),
                expected: expectedCents
              };
            }
          }
        }
      }
      
      return { verified: false, error: 'no_transfer_to_wallet_found' };
    }
  } catch(e) {
    // Fall through to public RPC
  }
  
  // Fallback: try public RPC
  try {
    const rpcResult = await rpcCall('eth_getTransactionReceipt', [txHashLower]);
    const receipt = rpcResult.result;
    
    if (receipt && receipt.logs) {
      const transferTopic = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
      
      for (const log of receipt.logs) {
        if (log.address && log.address.toLowerCase() === USDC_CONTRACT.toLowerCase() &&
            log.topics && log.topics[0] === transferTopic) {
          
          const toAddr = '0x' + log.topics[2].slice(26);
          if (toAddr.toLowerCase() === AGENT_WALLET) {
            const rawAmount = BigInt(log.data);
            const actualCents = Number(rawAmount) / 10000;
            
            if (actualCents >= expectedCents * 0.95) {
              return {
                verified: true,
                amount: Math.round(actualCents),
                expected: expectedCents,
                txHash: txHashLower
              };
            }
          }
        }
      }
    }
  } catch(e) {
    // Both methods failed
  }
  
  return { verified: false, error: 'verification_failed' };
}

async function rpcCall(method, params) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ jsonrpc: '2.0', id: 1, method, params });
    const url = new URL('https://mainnet.base.org');
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    };
    const req = https.request(options, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// Cache verified payments to avoid re-verifying
const paymentCache = new Map();
const CACHE_TTL = 3600000; // 1 hour

export function checkCachedPayment(txHash) {
  const cached = paymentCache.get(txHash.toLowerCase());
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.result;
  }
  return null;
}

export function cachePayment(txHash, result) {
  paymentCache.set(txHash.toLowerCase(), { result, timestamp: Date.now() });
}

// Simple payment tracking
const usedPayments = new Set();

export function markPaymentUsed(txHash) {
  usedPayments.add(txHash.toLowerCase());
}

export function isPaymentUsed(txHash) {
  return usedPayments.has(txHash.toLowerCase());
}
