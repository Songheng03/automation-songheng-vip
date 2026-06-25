// x402 USDC Payment Verification for Base Chain
// This module will be integrated into gateway.cjs

const BASE_RPC = 'https://mainnet.base.org';
const USDC_BASE = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'; // USDC on Base
const WALLET_ADDRESS = '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113';

// x402 pricing (in USDC, 6 decimals)
const X402_PRICES = {
  'analyze': 0.01,    // 1¢
  'summarize': 0.02,  // 2¢
  'review': 0.05,     // 5¢
  'security': 0.03,   // 3¢
  'explain': 0.02,    // 2¢
  'refactor': 0.05,   // 5¢
  'complexity': 0.02, // 2¢
  'batch': 0.05,      // 5¢ (10 texts)
  'render': 0.03      // 3¢ (markdown)
};

/**
 * Verify a USDC transfer on Base chain
 * @param {string} txHash - Transaction hash
 * @param {string} expectedAmount - Expected USDC amount (in USDC, not wei)
 * @returns {Promise<{valid: boolean, reason?: string}>}
 */
async function verifyUSDCPayment(txHash, expectedAmount) {
  try {
    // Get transaction details via Base RPC
    const txResp = await fetch(BASE_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_getTransactionReceipt',
        params: [txHash]
      })
    });

    const txData = await txResp.json();
    if (!txData.result) {
      return { valid: false, reason: 'Transaction not found or pending' };
    }

    const receipt = txData.result;
    if (receipt.status !== '0x1') {
      return { valid: false, reason: 'Transaction failed' };
    }

    // Check if it's a USDC transfer to our wallet
    const toAddress = receipt.to?.toLowerCase();
    if (toAddress !== USDC_BASE.toLowerCase()) {
      return { valid: false, reason: 'Not a USDC transfer' };
    }

    // Parse Transfer event logs
    const transferTopic = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
    const ourWalletTopic = '0x' + '0'.repeat(24) + WALLET_ADDRESS.slice(2).toLowerCase();

    let transferAmount = 0;
    for (const log of receipt.logs) {
      if (log.address.toLowerCase() === USDC_BASE.toLowerCase() &&
          log.topics[0] === transferTopic &&
          log.topics[2] === ourWalletTopic) {
        // Decode amount from data (uint256, 6 decimals for USDC)
        transferAmount = parseInt(log.data, 16) / 1e6;
        break;
      }
    }

    if (transferAmount === 0) {
      return { valid: false, reason: 'No USDC transfer found' };
    }

    if (transferAmount < expectedAmount) {
      return { valid: false, reason: `Insufficient payment: ${transferAmount} < ${expectedAmount} USDC` };
    }

    return { valid: true, amount: transferAmount, txHash };
  } catch (error) {
    return { valid: false, reason: `Verification error: ${error.message}` };
  }
}

/**
 * Handle x402 payment flow
 * Returns 402 with payment instructions if no payment, verifies if payment provided
 */
async function handleX402(req, res, endpoint) {
  const price = X402_PRICES[endpoint];
  if (!price) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Unknown endpoint' }));
    return false;
  }

  const paymentHeader = req.headers['x-x402-payment'];
  if (!paymentHeader) {
    // No payment - return 402 with instructions
    res.writeHead(402, {
      'Content-Type': 'application/json',
      'X-X402-Price': price.toString(),
      'X-X402-Currency': 'USDC',
      'X-X402-Chain': 'base',
      'X-X402-Wallet': WALLET_ADDRESS
    });
    res.end(JSON.stringify({
      error: 'Payment required',
      price: price,
      currency: 'USDC',
      chain: 'base',
      wallet: WALLET_ADDRESS,
      instructions: `Send ${price} USDC to ${WALLET_ADDRESS} on Base chain, then retry with X-X402-Payment: <tx_hash>`
    }));
    return false;
  }

  // Payment provided - verify on chain
  const verification = await verifyUSDCPayment(paymentHeader, price);
  if (!verification.valid) {
    res.writeHead(402, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: 'Invalid payment',
      reason: verification.reason,
      tx_hash: paymentHeader
    }));
    return false;
  }

  // Payment verified - proceed with request
  return true;
}

module.exports = { verifyUSDCPayment, handleX402, X402_PRICES };
