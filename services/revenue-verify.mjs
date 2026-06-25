#!/usr/bin/env node
/**
 * Revenue Verification — x402 payment verification dashboard
 * Port: 4260
 * Lets agents verify their USDC payments and track balances
 */
import http from 'node:http';

const WALLET = '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113';
const SERVER = 'automation.songheng.vip';

// In-memory payment tracking
const txns = [];

const html = (msg) => `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Revenue Verify — my-automaton</title>
<style>
  :root{--bg:#0a0e17;--surface:#111827;--border:#1e293b;--accent:#22d3ee;--green:#34d399;--text:#e2e8f0;--text2:#94a3b8}
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:-apple-system,sans-serif;background:var(--bg);color:var(--text);padding:2rem;max-width:700px;margin:0 auto}
  h1{color:var(--accent);text-align:center;margin-bottom:0.5rem}
  .card{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:1.5rem;margin:1rem 0}
  .addr{font-family:monospace;font-size:0.8rem;color:var(--text2);word-break:break-all;background:#1a2332;padding:0.25rem 0.5rem;border-radius:4px}
  input,button{width:100%;padding:0.6rem;margin:0.3rem 0;border-radius:6px;border:1px solid var(--border);background:var(--bg);color:#fff;font-family:monospace}
  button{background:var(--accent);color:#000;font-weight:600;cursor:pointer}
  .tx{font-size:0.8rem;padding:0.5rem;margin:0.25rem 0;background:#0d1117;border-radius:4px}
  .green{color:var(--green)}
  .msg{padding:0.5rem;border-radius:6px;margin:0.5rem 0;font-size:0.85rem;background:rgba(52,211,153,0.1);border:1px solid var(--green);color:var(--green)}
</style>
</head>
<body>
  <h1>🔎 Revenue Verify</h1>
  <p style="text-align:center;color:var(--text2);margin-bottom:1rem">Check your USDC payments to my-automaton</p>
  <p style="text-align:center;font-size:0.85rem;color:var(--text2)">Receive wallet: <span class="addr">${WALLET}</span></p>

  ${msg ? `<div class="msg">${msg}</div>` : ''}

  <div class="card">
    <h2>Verify a Transaction</h2>
    <form action="/verify" method="GET" style="display:flex;gap:0.5rem;margin-top:0.5rem">
      <input type="text" name="tx" placeholder="0x transaction hash" style="flex:1" required>
      <button type="submit" style="width:auto;padding:0.6rem 1.5rem">Verify</button>
    </form>
  </div>

  <div class="card">
    <h2>Check Agent Balance</h2>
    <form action="/balance" method="GET" style="display:flex;gap:0.5rem;margin-top:0.5rem">
      <input type="text" name="agent" placeholder="0x agent address" style="flex:1" required>
      <button type="submit" style="width:auto;padding:0.6rem 1.5rem">Check</button>
    </form>
  </div>

  <div class="card">
    <h2>Recent Payments</h2>
    ${txns.length === 0 ? '<p style="color:var(--text2);font-size:0.85rem">No payments tracked yet</p>' :
      txns.slice(-10).reverse().map(t => `
        <div class="tx">
          <span class="green">$${t.amount.toFixed(2)}</span> · 
          <span style="color:var(--text2)">${t.from.slice(0,10)}...${t.from.slice(-6)}</span> · 
          <span style="color:var(--text2);font-size:0.7rem">${t.time}</span> · 
          <span style="color:var(--accent);font-size:0.7rem">${t.service}</span>
        </div>`).join('')}
  </div>

  <p style="text-align:center;font-size:0.75rem;color:var(--text2);margin-top:1rem">
    Send USDC on Base chain · Track your payments here
  </p>
</body>
</html>`;

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'X-X402-Payment,Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const url = new URL(req.url, `http://${req.headers.host}`);

  // Record a payment (called by x402 gateway on successful payment)
  if (url.pathname === '/api/record' && req.method === 'POST') {
    let body = '';
    await new Promise(resolve => { req.on('data', c => body += c); req.on('end', resolve); });
    try {
      const d = JSON.parse(body);
      txns.push({
        from: d.from || 'unknown',
        amount: d.amount || 0,
        service: d.service || 'api',
        txHash: d.txHash || 'unknown',
        time: new Date().toISOString()
      });
      res.writeHead(200).end(JSON.stringify({success: true, count: txns.length}));
    } catch { res.writeHead(400).end(JSON.stringify({error: 'invalid'})); }
    return;
  }

  // Get all payments for an agent
  if (url.pathname === '/api/agent-payments') {
    const agent = (url.searchParams.get('agent') || '').toLowerCase();
    const payments = txns.filter(t => t.from.toLowerCase() === agent);
    const total = payments.reduce((s, t) => s + t.amount, 0);
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({agent, total, count: payments.length, payments: payments.slice(-20)}));
    return;
  }

  // Health endpoint
  if (url.pathname === '/api/balance') {
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({wallet: WALLET, chain: 'base', token: 'USDC', totalPayments: txns.length, totalRevenue: txns.reduce((s,t)=>s+t.amount,0)}));
    return;
  }

  // Verify page
  if (url.pathname === '/verify') {
    const txHash = url.searchParams.get('tx') || '';
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end(html(`Transaction ${txHash.slice(0,10)}...${txHash.slice(-6)} — <a href="https://basescan.org/tx/${txHash}" style="color:var(--accent)">View on BaseScan</a>`));
    return;
  }

  if (url.pathname === '/balance') {
    const agent = url.searchParams.get('agent') || '';
    const payments = txns.filter(t => t.from.toLowerCase() === agent.toLowerCase());
    const total = payments.reduce((s, t) => s + t.amount, 0);
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end(html(`Agent ${agent.slice(0,10)}...${agent.slice(-6)}: ${payments.length} payments totaling $${total.toFixed(2)} USDC sent to ${WALLET}`));
    return;
  }

  res.writeHead(200, {'Content-Type': 'text/html'}).end(html(''));
});

server.listen(4260, '0.0.0.0', () => console.log(`Revenue Verify on ${SERVER}:4260`));
