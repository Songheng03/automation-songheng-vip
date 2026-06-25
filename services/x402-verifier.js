#!/usr/bin/env node
/**
 * x402 Payment Verifier Service
 * Verifies USDC transfers on Base chain using public RPC.
 * Called by gateway to check X-X402-Payment headers.
 * 
 * Cache verified payments in SQLite for persistence across restarts.
 */
import fs from 'fs';
import path from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_RPC = 'https://mainnet.base.org';
const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const WALLET = '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113';
const CACHE_FILE = path.join(__dirname, '..', 'data', 'payments.json');
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

let paymentCache = {};

function loadCache() {
  try { paymentCache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')); } catch { paymentCache = {}; }
}
function saveCache() {
  fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
  fs.writeFileSync(CACHE_FILE, JSON.stringify(paymentCache, null, 2));
}
loadCache();

// Periodically clean expired entries
setInterval(() => {
  const now = Date.now();
  let changed = false;
  for (const [tx, entry] of Object.entries(paymentCache)) {
    if (now - entry.timestamp > CACHE_TTL_MS) {
      delete paymentCache[tx];
      changed = true;
    }
  }
  if (changed) saveCache();
}, 600000); // Every 10 min

/**
 * Verify a USDC transfer tx hash on Base chain.
 * Returns { verified: boolean, amount: string, from: string, error?: string }
 */
export async function verifyPayment(txHash) {
  // Check cache first
  if (paymentCache[txHash]) {
    return { verified: true, ...paymentCache[txHash], cached: true };
  }

  try {
    // Get transaction receipt
    const receiptResp = await fetch(BASE_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_getTransactionReceipt',
        params: [txHash],
      }),
    });
    const receipt = await receiptResp.json();
    
    if (!receipt.result) {
      return { verified: false, error: 'Transaction not found or pending' };
    }

    const logs = receipt.result.logs || [];
    
    // Look for Transfer event from USDC contract to our wallet
    // USDC Transfer event signature: Transfer(address,address,uint256)
    const usdcLog = logs.find(log => 
      log.address.toLowerCase() === USDC.toLowerCase()
    );

    if (!usdcLog) {
      return { verified: false, error: 'No USDC transfer found in this transaction' };
    }

    // Decode the transfer event
    // Topics: [TransferSig, from, to]
    // Data: amount (6 decimals for USDC)
    const toAddress = '0x' + usdcLog.topics[2].slice(26).toLowerCase();
    
    if (toAddress !== WALLET.toLowerCase()) {
      return { verified: false, error: 'USDC not sent to our wallet' };
    }

    // Decode amount from hex data (USDC has 6 decimals)
    const amountHex = usdcLog.data;
    const amountWei = BigInt(amountHex);
    const amountCents = Number(amountWei) / 1000000; // USDC is 6 decimals, convert to cents (wait no...)
    // Actually USDC is 6 decimals. 1 USDC = 1_000_000 base units
    // We want cents, so 1 USDC = 100 cents
    // Amount in cents = amountWei * 100 / 1_000_000
    const amount = Number(amountWei) * 100 / 1000000; // in cents

    const fromAddress = '0x' + usdcLog.topics[1].slice(26);

    const verified = amount >= 1; // At least 1 cent

    const result = {
      verified,
      amount,
      from: `0x${fromAddress}`,
      txHash,
      timestamp: Date.now(),
    };

    if (verified) {
      paymentCache[txHash] = result;
      saveCache();
    }

    return result;
  } catch (err) {
    return { verified: false, error: `Verification failed: ${err.message}` };
  }
}

/**
 * Check if a payment tx hash is already known to be valid
 */
export function isPaymentValid(txHash) {
  return !!paymentCache[txHash]?.verified;
}

export function getPaymentInfo(txHash) {
  return paymentCache[txHash] || null;
}
