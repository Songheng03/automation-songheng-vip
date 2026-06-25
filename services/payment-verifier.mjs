/**
 * my-automaton — On-Chain Payment Verifier
 * 
 * Verifies USDC payments on Base chain.
 * Monitors USDC Transfer events to my wallet.
 * Tracks confirmed payments and provides real-time verification.
 */
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Configuration ──
const CONFIG = {
  // Base chain RPC (public)
  rpcUrl: 'https://mainnet.base.org',
  chainId: 8453,
  // USDC contract on Base
  usdcAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  // My wallet
  myWallet: '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113',
  // Price per request in USDC (6 decimals)
  prices: {
    analyze: 0.01n * 1000000n,       // 1¢
    summarize: 0.02n * 1000000n,      // 2¢
    review: 0.05n * 1000000n,         // 5¢
    security: 0.03n * 1000000n,       // 3¢
    explain: 0.02n * 1000000n,        // 2¢
    refactor: 0.05n * 1000000n,       // 5¢
    complexity: 0.02n * 1000000n,     // 2¢
    batch: 0.05n * 1000000n,          // 5¢
    render: 0.03n * 1000000n,         // 3¢
  },
};

const STATS_FILE = path.join(__dirname, '..', 'data', 'stats.json');

// ── Load/Save Stats ──
function loadStats() {
  try { return JSON.parse(fs.readFileSync(STATS_FILE, 'utf8')); }
  catch { return { totalCalls: 0, freeToday: 0, revenue: 0, payments: [], requests: [], handshakes: 0, referrals: 0, serviceUsage: {} }; }
}
function saveStats(s) {
  const dir = path.dirname(STATS_FILE);
  try { fs.mkdirSync(dir, { recursive: true }); } catch {}
  fs.writeFileSync(STATS_FILE, JSON.stringify(s, null, 2));
}

// ── Provider ──
let provider = null;

function getProvider() {
  if (!provider) {
    provider = new ethers.JsonRpcProvider(CONFIG.rpcUrl);
  }
  return provider;
}

// ── USDC ABI (minimal - Transfer events) ──
const USDC_ABI = [
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
];

// ── Verify a transaction ──
export async function verifyPayment(txHash, expectedService, expectedAmountCents) {
  try {
    const prov = getProvider();
    const receipt = await prov.getTransactionReceipt(txHash);
    
    if (!receipt) {
      return { verified: false, reason: 'Transaction not found or pending' };
    }

    if (!receipt.status) {
      return { verified: false, reason: 'Transaction failed' };
    }

    // Parse USDC Transfer events
    const usdcContract = new ethers.Contract(CONFIG.usdcAddress, USDC_ABI, prov);
    
    for (const log of receipt.logs) {
      try {
        // Check if this log is from USDC contract
        if (log.address.toLowerCase() !== CONFIG.usdcAddress.toLowerCase()) continue;
        
        const parsed = usdcContract.interface.parseLog({
          topics: log.topics,
          data: log.data,
        });

        if (parsed.name === 'Transfer') {
          const from = parsed.args.from;
          const to = parsed.args.to;
          const value = parsed.args.value;
          
          // Check if sent to my wallet
          if (to.toLowerCase() === CONFIG.myWallet.toLowerCase()) {
            const expectedAmount = BigInt(expectedAmountCents) * 10000n; // cents -> USDC (6 decimals)
            // Accept any payment >= expected amount (allows batching)
            if (value >= expectedAmount) {
              const actualAmount = Number(value) / 1000000;
              return {
                verified: true,
                from: from,
                amount: actualAmount,
                amountCents: Math.round(actualAmount * 100),
                txHash: txHash,
                blockNumber: receipt.blockNumber,
              };
            } else {
              return {
                verified: false,
                reason: `Amount too low: ${Number(value) / 1000000} USDC sent, need ${Number(expectedAmount) / 1000000} USDC`,
                from,
                amount: Number(value) / 1000000,
              };
            }
          }
        }
      } catch (e) {
        // Not a USDC Transfer event, skip
        continue;
      }
    }

    return { verified: false, reason: 'No USDC Transfer to my wallet found in this transaction' };
  } catch (e) {
    return { verified: false, reason: `Verification error: ${e.message}` };
  }
}

// ── Check balance ──
export async function getBalance() {
  try {
    const prov = getProvider();
    const usdcContract = new ethers.Contract(CONFIG.usdcAddress, USDC_ABI, prov);
    const balance = await usdcContract.balanceOf(CONFIG.myWallet);
    const decimals = await usdcContract.decimals();
    return Number(balance) / Math.pow(10, Number(decimals));
  } catch (e) {
    return 0;
  }
}

// ── Get recent transfers to my wallet (last N blocks) ──
export async function getRecentPayments(blocksBack = 5000) {
  try {
    const prov = getProvider();
    const usdcContract = new ethers.Contract(CONFIG.usdcAddress, USDC_ABI, prov);
    const currentBlock = await prov.getBlockNumber();
    const fromBlock = currentBlock - blocksBack;
    
    const filter = usdcContract.filters.Transfer(null, CONFIG.myWallet);
    const events = await usdcContract.queryFilter(filter, fromBlock, currentBlock);
    
    return events.map(e => ({
      from: e.args.from,
      to: e.args.to,
      amount: Number(e.args.value) / 1000000,
      txHash: e.transactionHash,
      blockNumber: e.blockNumber,
      timestamp: new Date().toISOString(),
    }));
  } catch (e) {
    console.error('getRecentPayments error:', e.message);
    return [];
  }
}

// ── Sync payments from on-chain data ──
export async function syncPayments() {
  const stats = loadStats();
  const payments = await getRecentPayments();
  
  let newRevenue = 0;
  for (const payment of payments) {
    // Check if we already recorded this transaction
    if (!stats.payments) stats.payments = [];
    const alreadyRecorded = stats.payments.some(p => p.txHash === payment.txHash);
    if (alreadyRecorded) continue;
    
    stats.payments.push({
      txHash: payment.txHash,
      from: payment.from,
      amount: payment.amount,
      timestamp: Date.now(),
      blockNumber: payment.blockNumber,
      verified: true,
      synced: true,
    });
    newRevenue += payment.amount;
  }
  
  if (newRevenue > 0) {
    stats.revenue = (stats.revenue || 0) + newRevenue;
    saveStats(stats);
  }
  
  return { newPayments: payments.length, newRevenue };
}

// ── Run verification for a pending payment ──
export async function verifyPendingPayment(txHash) {
  const result = await verifyPayment(txHash, null, 1);
  if (result.verified) {
    const stats = loadStats();
    if (!stats.payments) stats.payments = [];
    
    // Update existing or add new
    const existing = stats.payments.findIndex(p => p.txHash === txHash);
    if (existing >= 0) {
      stats.payments[existing].verified = true;
      stats.payments[existing].from = result.from;
      stats.payments[existing].amount = result.amount;
    } else {
      stats.payments.push({
        txHash,
        from: result.from,
        amount: result.amount,
        timestamp: Date.now(),
        verified: true,
      });
      stats.revenue = (stats.revenue || 0) + result.amount;
    }
    saveStats(stats);
  }
  return result;
}

// ── Main ──
if (process.argv[1] === fileURLToPath(import.meta.url) || process.argv[1]?.endsWith('payment-verifier.mjs')) {
  const cmd = process.argv[2] || 'sync';
  
  if (cmd === 'sync') {
    syncPayments().then(r => {
      console.log(`Synced ${r.newPayments} payments, earned $${r.newRevenue.toFixed(2)}`);
      process.exit(0);
    }).catch(e => { console.error(e); process.exit(1); });
  } else if (cmd === 'balance') {
    getBalance().then(b => {
      console.log(`USDC balance: $${b.toFixed(6)}`);
      process.exit(0);
    }).catch(e => { console.error(e); process.exit(1); });
  } else if (cmd === 'verify' && process.argv[3]) {
    verifyPendingPayment(process.argv[3]).then(r => {
      console.log(JSON.stringify(r, null, 2));
      process.exit(0);
    }).catch(e => { console.error(e); process.exit(1); });
  } else if (cmd === 'recent') {
    getRecentPayments().then(p => {
      console.log(`Found ${p.length} recent payments:`);
      p.forEach(pm => console.log(`  ${pm.txHash} -> $${pm.amount} from ${pm.from}`));
      process.exit(0);
    }).catch(e => { console.error(e); process.exit(1); });
  }
}
