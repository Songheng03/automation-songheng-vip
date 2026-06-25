#!/usr/bin/env node
/**
 * USDC Balance Checker
 * Queries Base chain for USDC balance and recent transfers
 * Uses public RPC endpoint (no API key needed)
 * 
 * USDC on Base: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
 * My wallet: 0x76eADdEBFfb6A61DD071f97F4508467fc55dd113
 */

const MY_WALLET = '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113';
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const BASE_RPC = 'https://mainnet.base.org';

async function checkBalance() {
  // ERC-20 balanceOf ABI
  const balanceOfData = '0x70a08231' + 
    '000000000000000000000000' + MY_WALLET.slice(2).toLowerCase().padStart(64, '0');
  
  const rpcBody = {
    jsonrpc: '2.0',
    id: 1,
    method: 'eth_call',
    params: [{
      to: USDC_ADDRESS,
      data: balanceOfData
    }, 'latest']
  };

  try {
    const resp = await fetch(BASE_RPC, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(rpcBody)
    });
    
    const data = await resp.json();
    
    if (data.result && data.result !== '0x' && data.result !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
      // USDC has 6 decimals
      const balance = BigInt(data.result) / 1000000n;
      const balanceNum = Number(BigInt(data.result)) / 1_000_000;
      console.log(`💰 USDC Balance: ${balanceNum.toFixed(6)} USDC`);
      
      // Also show in cents
      const cents = balanceNum * 100;
      console.log(`   That's ${cents.toFixed(2)}¢`);
      
      return { balance: balanceNum, raw: data.result };
    } else {
      console.log('💰 USDC Balance: 0.00 USDC (no payments received yet)');
      return { balance: 0, raw: '0x0' };
    }
  } catch (e) {
    console.log(`❌ RPC call failed: ${e.message}`);
    console.log(`   Trying fallback...`);
    return await checkBalanceFallback();
  }
}

async function checkBalanceFallback() {
  // Try alternative RPC
  const altRPCs = [
    'https://base.llamarpc.com',
    'https://base-rpc.publicnode.com'
  ];
  
  const balanceOfData = '0x70a08231' + 
    '000000000000000000000000' + MY_WALLET.slice(2).toLowerCase().padStart(64, '0');
  
  for (const rpc of altRPCs) {
    try {
      const resp = await fetch(rpc, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          jsonrpc: '2.0', id: 1, method: 'eth_call',
          params: [{to: USDC_ADDRESS, data: balanceOfData}, 'latest']
        })
      });
      const data = await resp.json();
      if (data.result && data.result !== '0x' && data.result !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
        const balanceNum = Number(BigInt(data.result)) / 1_000_000;
        console.log(`💰 USDC Balance (${rpc}): ${balanceNum.toFixed(6)} USDC`);
        return { balance: balanceNum, raw: data.result };
      }
    } catch(e) {
      continue;
    }
  }
  
  console.log('💰 USDC Balance: 0.00 (unable to query chain)');
  return { balance: 0, raw: '0x0' };
}

async function checkRecentTransfers() {
  // Try to get recent transactions to my wallet
  // Using a simplified approach - check latest block for transfers
  console.log('\n📋 Checking recent transfers...');
  
  // Transfer event signature: Transfer(address,address,uint256)
  const transferTopic = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
  
  const filterBody = {
    jsonrpc: '2.0',
    id: 2,
    method: 'eth_getLogs',
    params: [{
      address: USDC_ADDRESS,
      fromBlock: '0x' + (Math.floor(Date.now()/1000) - 86400 * 7).toString(16), // last 7 days
      toBlock: 'latest',
      topics: [transferTopic, null, '0x000000000000000000000000' + MY_WALLET.slice(2).toLowerCase()]
    }]
  };
  
  try {
    const resp = await fetch(BASE_RPC, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(filterBody)
    });
    
    const data = await resp.json();
    
    if (data.result && data.result.length > 0) {
      console.log(`   Found ${data.result.length} incoming transfers!`);
      for (const log of data.result) {
        const amount = BigInt(log.data) / 1000000n;
        const fromAddr = '0x' + log.topics[1].slice(26);
        console.log(`   📥 ${amount} USDC from ${fromAddr} (tx: ${log.transactionHash.slice(0, 18)}...)`);
      }
      return data.result.length;
    } else {
      console.log('   No incoming USDC transfers found in last 7 days');
      return 0;
    }
  } catch (e) {
    console.log(`   ⚠️  Transfer check failed: ${e.message}`);
    return -1;
  }
}

async function getBaseBalance() {
  // Check base ETH balance (for gas)
  try {
    const resp = await fetch(BASE_RPC, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        jsonrpc: '2.0', id: 3, method: 'eth_getBalance',
        params: [MY_WALLET, 'latest']
      })
    });
    const data = await resp.json();
    if (data.result) {
      const ethBalance = Number(BigInt(data.result)) / 1e18;
      console.log(`⛽ Base ETH Balance: ${ethBalance.toFixed(6)} ETH (for gas fees)`);
      return ethBalance;
    }
  } catch(e) {}
  return 0;
}

async function main() {
  console.log('========================================');
  console.log('  💰 USDC Balance & Revenue Checker');
  console.log('  Wallet: ' + MY_WALLET);
  console.log('  Chain:  Base');
  console.log('  USDC:   ' + USDC_ADDRESS);
  console.log('========================================\n');
  
  const balance = await checkBalance();
  console.log('');
  await getBaseBalance();
  console.log('');
  const transferCount = await checkRecentTransfers();
  
  console.log('\n========================================');
  if (balance.balance > 0) {
    console.log(`  ✅ FIRST PAYMENT RECEIVED! ${balance.balance.toFixed(6)} USDC`);
  } else {
    console.log(`  ❌ No payments yet. Keep building and promoting.`);
  }
  console.log('========================================');
  
  return { balance, transferCount };
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { checkBalance, checkRecentTransfers, main };
