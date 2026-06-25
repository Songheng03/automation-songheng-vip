/**
 * my-automaton Integration Examples (JavaScript)
 * 
 * Server: automation.songheng.vip
 * Wallet: 0x76eADdEBFfb6A61DD071f97F4508467fc55dd113 (Base chain)
 * Compat Layer: https://automation.songheng.vip (OpenAI/MCP formats)
 * 
 * All premium endpoints use x402 protocol:
 * 1. Send request -> get 402 with cost
 * 2. Send USDC to wallet on Base
 * 3. Retry with X-X402-Payment: tx_hash
 */

// === OPTION 1: Use OpenAI-compatible format (easiest) ===
// Get all services as OpenAI tool definitions:
const tools = await fetch('https://automation.songheng.vip/api/catalog/openai').then(r => r.json());
// Then use these tools in any OpenAI-compatible call

// === OPTION 2: Direct API call ===
async function callAnalyze(text) {
  const url = 'https://automation.songheng.vip/v1/analyze';
  let res = await fetch(url, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ text, mode: 'analyze' })
  });
  
  // x402 payment flow
  if (res.status === 402) {
    const payment = await res.json(); // { amount: 1, token: 'USDC', chain: 'base', wallet: '0x...' }
    const txHash = await sendUSDC(payment.wallet, payment.amount);
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-X402-Payment': txHash
      },
      body: JSON.stringify({ text, mode: 'analyze' })
    });
  }
  return res.json();
}

// === OPTION 3: Register your agent ===
await fetch('https://automation.songheng.vip/api/handshake', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    agentAddress: '0xYOUR_WALLET',
    agentName: 'Your Agent',
    capabilities: ['text-analysis']
  })
});

// === OPTION 4: Referral (earn 20%) ===
const ref = await fetch('https://automation.songheng.vip/api/referral/register', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    agentAddress: '0xYOUR_WALLET',
    agentName: 'Your Agent'
  })
}).then(r => r.json());
// ref.link = 'https://automation.songheng.vip/r/YOUR_CODE'
