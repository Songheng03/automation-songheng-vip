#!/usr/bin/env node
/**
 * x402 Payment Portal — Port 3035
 * Interactive demo where agents can test x402 micropayments and see real-time payment flow.
 * Features: payment simulation, transaction history, wallet info, live revenue feed
 */
import http from 'http';
import { createHash } from 'crypto';

const PORT = 3035;
const WALLET = '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113';
const SERVER = 'automation.songheng.vip';
const CHAIN = 'Base';

// Payment log
const payments = [];
const pendingPayments = [];

// Seed demo
function seedDemo() {
  const demoPayments = [
    { endpoint: '/v1/summarize', cost_cents: 2, agent: '0xA1b2C3d4E5f6...9aBcD' },
    { endpoint: '/v1/analyze', cost_cents: 1, agent: '0xDef01234...5678' },
    { endpoint: '/v1/review', cost_cents: 5, agent: '0x9876FEDC...3210' },
    { endpoint: '/v1/security', cost_cents: 3, agent: '0xAbCdEf01...2345' },
    { endpoint: '/v1/explain', cost_cents: 2, agent: '0x5678AbCd...9012' },
    { endpoint: '/v1/refactor', cost_cents: 5, agent: '0x3456DeFg...7890' },
    { endpoint: '/v1/complexity', cost_cents: 2, agent: '0x9012HiJk...3456' },
    { endpoint: '/v1/batch', cost_cents: 5, agent: '0x7890LmNo...1234' },
    { endpoint: '/v1/render', cost_cents: 3, agent: '0x1234PqRs...5678' }
  ];
  demoPayments.forEach((p, i) => {
    const ts = Date.now() - (demoPayments.length - i) * 60000;
    payments.push({
      id: `demo-${i + 1}`,
      tx_hash: `0x${createHash('sha256').update(String(ts)).digest('hex').slice(0, 40)}`,
      endpoint: p.endpoint,
      amount_cents: p.cost_cents,
      amount_usd: `$${(p.cost_cents / 100).toFixed(2)}`,
      agent: p.agent,
      timestamp: ts,
      confirmed: true,
      status: 'completed'
    });
  });
}
seedDemo();

function serveHTML(res, html) {
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(html);
}

function serveJSON(res, data, status = 200) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-X402-Payment'
  });
  res.end(JSON.stringify(data, null, 2));
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;
  const method = req.method;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-X402-Payment');

  if (method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  // Health
  if (path === '/health') {
    return serveJSON(res, {
      agent: 'my-automaton', service: 'x402-payment-portal',
      port: PORT, wallet: WALLET, chain: CHAIN,
      payments: payments.length, total_revenue_cents: payments.reduce((s, p) => s + p.amount_cents, 0)
    });
  }

  // Payment stats
  if (path === '/api/stats') {
    const totalCents = payments.reduce((s, p) => s + p.amount_cents, 0);
    const byEndpoint = {};
    payments.forEach(p => {
      byEndpoint[p.endpoint] = (byEndpoint[p.endpoint] || 0) + 1;
    });
    return serveJSON(res, {
      total_payments: payments.length,
      total_revenue_cents: totalCents,
      total_revenue_usd: `$${(totalCents / 100).toFixed(2)}`,
      unique_agents: [...new Set(payments.map(p => p.agent))].length,
      payments_by_endpoint: byEndpoint,
      wallet: WALLET,
      chain: CHAIN,
      last_payment: payments.length > 0 ? payments[payments.length - 1] : null
    });
  }

  // Payment history
  if (path === '/api/payments') {
    const limit = parseInt(url.searchParams.get('limit') || '50');
    return serveJSON(res, {
      count: payments.length,
      payments: payments.slice(-limit).reverse()
    });
  }

  // Record a payment
  if (path === '/api/payments' && method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const payment = {
          id: `pmt-${payments.length + 1}`,
          tx_hash: data.tx_hash || `0x${createHash('sha256').update(String(Date.now())).digest('hex').slice(0, 40)}`,
          endpoint: data.endpoint || '/v1/unknown',
          amount_cents: data.amount_cents || 1,
          amount_usd: `$${((data.amount_cents || 1) / 100).toFixed(2)}`,
          agent: data.agent || '0xAnonymous',
          timestamp: Date.now(),
          confirmed: true,
          status: 'completed'
        };
        payments.push(payment);
        return serveJSON(res, { status: 'recorded', payment });
      } catch (e) {
        return serveJSON(res, { error: e.message }, 400);
      }
    });
    return;
  }

  // Premium endpoint price list
  if (path === '/api/pricing') {
    return serveJSON(res, {
      wallet: WALLET,
      chain: CHAIN,
      server: SERVER,
      endpoints: [
        { path: '/v1/analyze', cost_cents: 1, cost_usd: '$0.01', desc: 'Deep text analysis' },
        { path: '/v1/summarize', cost_cents: 2, cost_usd: '$0.02', desc: 'AI summarization' },
        { path: '/v1/review', cost_cents: 5, cost_usd: '$0.05', desc: 'Full code review' },
        { path: '/v1/security', cost_cents: 3, cost_usd: '$0.03', desc: 'Security scan' },
        { path: '/v1/explain', cost_cents: 2, cost_usd: '$0.02', desc: 'Code explanation' },
        { path: '/v1/refactor', cost_cents: 5, cost_usd: '$0.05', desc: 'Refactoring suggestions' },
        { path: '/v1/complexity', cost_cents: 2, cost_usd: '$0.02', desc: 'Complexity analysis' },
        { path: '/v1/batch', cost_cents: 5, cost_usd: '$0.05', desc: 'Batch 10 texts' },
        { path: '/v1/render', cost_cents: 3, cost_usd: '$0.03', desc: 'Markdown rendering' }
      ]
    });
  }

  // Main UI
  if (path === '/') {
    const totalCents = payments.reduce((s, p) => s + p.amount_cents, 0);
    const recentPayments = payments.slice(-10).reverse().map(p => `
      <tr>
        <td><code title="${p.tx_hash}">${p.tx_hash.slice(0, 16)}...</code></td>
        <td>${p.endpoint}</td>
        <td class="price">${p.amount_usd}</td>
        <td><code>${p.agent.slice(0, 14)}...</code></td>
        <td><span class="status completed">✓</span></td>
        <td class="time">${new Date(p.timestamp).toLocaleTimeString()}</td>
      </tr>
    `).join('\n');

    return serveHTML(res, `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>x402 Payment Portal — my-automaton</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0f; color: #e0e0e0; }
    .container { max-width: 1000px; margin: 0 auto; padding: 20px; }
    header { text-align: center; padding: 40px 0 30px; }
    h1 { font-size: 2.2em; background: linear-gradient(135deg, #00d4ff, #7b2ff7, #f093fb); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    h2 { font-size: 1.3em; margin: 25px 0 12px; color: #00d4ff; border-bottom: 1px solid #2a2a35; padding-bottom: 8px; }
    .stats-row { display: flex; gap: 15px; justify-content: center; flex-wrap: wrap; margin: 20px 0; }
    .stat-card { background: #151520; border: 1px solid #2a2a35; border-radius: 12px; padding: 18px 25px; text-align: center; min-width: 160px; }
    .stat-card .num { font-size: 1.8em; font-weight: bold; color: #00d4ff; }
    .stat-card .lbl { font-size: 0.8em; color: #888; margin-top: 4px; }
    .wallet-box { background: #151520; border: 1px solid #2a2a35; border-radius: 12px; padding: 15px 20px; margin: 15px 0; text-align: center; }
    .wallet-box code { background: #1e1e2e; padding: 8px 16px; border-radius: 8px; font-size: 0.9em; color: #ffb86b; word-break: break-all; }
    .pricing-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; margin: 15px 0; }
    .pricing-card { background: #151520; border: 1px solid #2a2a35; border-radius: 10px; padding: 15px; }
    .pricing-card .endpoint { color: #7b2ff7; font-weight: bold; font-family: monospace; }
    .pricing-card .desc { color: #aaa; font-size: 0.85em; margin: 4px 0; }
    .pricing-card .cost { color: #00d4ff; font-size: 1.3em; font-weight: bold; }
    .price { color: #00d4ff; font-weight: bold; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; }
    th, td { padding: 8px 10px; text-align: left; border-bottom: 1px solid #2a2a35; font-size: 0.85em; }
    th { color: #888; font-weight: normal; text-transform: uppercase; font-size: 0.75em; }
    code { background: #1e1e2e; padding: 2px 6px; border-radius: 4px; font-size: 0.85em; color: #ffb86b; }
    .status { padding: 2px 6px; border-radius: 4px; font-size: 0.8em; }
    .status.completed { color: #50fa7b; }
    .time { color: #888; font-size: 0.8em; }
    .btn { display: inline-block; background: linear-gradient(135deg, #00d4ff, #7b2ff7); color: #fff; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-weight: bold; margin: 10px 5px; font-size: 1em; border: none; cursor: pointer; }
    .btn:hover { opacity: 0.9; }
    .btn-secondary { background: #2a2a35; }
    .btn-group { text-align: center; margin: 20px 0; }
    .tab { display: inline-block; padding: 10px 20px; background: #151520; border: 1px solid #2a2a35; border-radius: 8px 8px 0 0; color: #888; cursor: pointer; margin-right: 2px; }
    .tab.active { background: #1e1e2e; border-color: #7b2ff7; color: #fff; }
    .tab-content { background: #1e1e2e; border: 1px solid #2a2a35; border-radius: 0 8px 8px 8px; padding: 20px; margin-top: -1px; }
    .integration pre { background: #111118; padding: 15px; border-radius: 8px; overflow-x: auto; font-size: 0.85em; color: #f8f8f2; }
    .steps { margin: 15px 0; padding-left: 20px; }
    .steps li { margin: 8px 0; line-height: 1.6; }
    .notification { position: fixed; top: 20px; right: 20px; background: #50fa7b; color: #000; padding: 12px 20px; border-radius: 8px; font-weight: bold; opacity: 0; transition: opacity 0.3s; }
    .footer { text-align: center; padding: 40px 0; color: #555; font-size: 0.8em; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>⚡ x402 Payment Portal</h1>
      <p>Pay per request with USDC on Base — no subscriptions, no signup</p>
    </header>

    <div class="stats-row">
      <div class="stat-card">
        <div class="num">${payments.length}</div>
        <div class="lbl">Total Payments</div>
      </div>
      <div class="stat-card">
        <div class="num">$${(totalCents / 100).toFixed(2)}</div>
        <div class="lbl">Revenue</div>
      </div>
      <div class="stat-card">
        <div class="num">${[...new Set(payments.map(p => p.agent))].length}</div>
        <div class="lbl">Unique Agents</div>
      </div>
      <div class="stat-card">
        <div class="num">9</div>
        <div class="lbl">Premium Endpoints</div>
      </div>
    </div>

    <div class="wallet-box">
      <p style="margin-bottom: 8px; color: #888;">💳 Send USDC to pay for services</p>
      <code>${WALLET}</code>
      <p style="margin-top: 8px; color: #666; font-size: 0.8em;">Network: ${CHAIN} Chain | Amount: as low as 1¢</p>
    </div>

    <div class="btn-group">
      <a href="#pricing" class="btn">View Pricing</a>
      <a href="#pay" class="btn btn-secondary">Make Payment</a>
      <a href="#integration" class="btn btn-secondary">Integration</a>
    </div>

    <h2 id="pricing">📋 Premium Endpoint Pricing</h2>
    <div class="pricing-grid" id="pricingGrid"></div>

    <h2 id="pay">💸 Simulate a Payment</h2>
    <div class="tab-content">
      <p style="margin-bottom: 15px; color: #aaa;">Test the x402 payment flow by simulating a micropayment. In production, you send USDC from your wallet to ${WALLET} on Base chain.</p>
      <div style="display: flex; gap: 15px; flex-wrap: wrap; align-items: end;">
        <div>
          <label style="color: #888; font-size: 0.85em; display: block; margin-bottom: 4px;">Endpoint</label>
          <select id="endpointSelect" style="background: #111118; color: #fff; border: 1px solid #2a2a35; padding: 10px 15px; border-radius: 8px; min-width: 200px;">
            <option value="/v1/summarize">/v1/summarize (2¢)</option>
            <option value="/v1/analyze">/v1/analyze (1¢)</option>
            <option value="/v1/review">/v1/review (5¢)</option>
            <option value="/v1/security">/v1/security (3¢)</option>
            <option value="/v1/explain">/v1/explain (2¢)</option>
            <option value="/v1/refactor">/v1/refactor (5¢)</option>
            <option value="/v1/complexity">/v1/complexity (2¢)</option>
            <option value="/v1/batch">/v1/batch (5¢)</option>
            <option value="/v1/render">/v1/render (3¢)</option>
          </select>
        </div>
        <div>
          <label style="color: #888; font-size: 0.85em; display: block; margin-bottom: 4px;">Amount</label>
          <input type="number" id="amountInput" value="1" min="1" max="10" style="background: #111118; color: #fff; border: 1px solid #2a2a35; padding: 10px 15px; border-radius: 8px; width: 100px;">
          <span style="color: #888;">¢</span>
        </div>
        <button onclick="simulatePayment()" class="btn" style="font-size: 0.9em; padding: 10px 20px;">Send Payment</button>
      </div>
      <div id="simResult" style="margin-top: 15px; display: none;"></div>
    </div>

    <h2>📜 Recent Payments</h2>
    <table>
      <thead><tr><th>Transaction</th><th>Endpoint</th><th>Amount</th><th>Agent</th><th>Status</th><th>Time</th></tr></thead>
      <tbody id="paymentsTable">${recentPayments}</tbody>
    </table>

    <h2 id="integration">🔌 Integration Guide</h2>
    <div class="tab-content">
      <div class="steps">
        <h3 style="color: #7b2ff7; margin: 10px 0;">How x402 Works</h3>
        <ol class="steps">
          <li>Send request to a premium endpoint</li>
          <li>Server responds with <code>HTTP 402</code> + payment amount</li>
          <li>Send exact USDC amount to <code>${WALLET}</code> on Base chain</li>
          <li>Retry request with <code>X-X402-Payment: &lt;tx_hash&gt;</code> header</li>
          <li>Server verifies the payment and returns the result</li>
        </ol>

        <h3 style="color: #7b2ff7; margin: 10px 0;">JavaScript Example</h3>
        <pre>async function x402Call(endpoint, data) {
  const res = await fetch(\`http://${SERVER}:3020\${endpoint}\`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(data)
  });
  if (res.status === 402) {
    // Send USDC from your wallet, then retry
    const txHash = await sendUSDC('${WALLET}', 1); // 1 cent
    return fetch(\`http://${SERVER}:3020\${endpoint}\`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-X402-Payment': txHash
      },
      body: JSON.stringify(data)
    });
  }
  return res.json();
}</pre>

        <h3 style="color: #7b2ff7; margin: 10px 0;">Python Example</h3>
        <pre>import requests

def x402_call(endpoint, data, cost_cents):
    url = f"http://${SERVER}:3020{endpoint}"
    resp = requests.post(url, json=data)
    if resp.status_code == 402:
        tx_hash = send_usdc("${WALLET}", cost_cents)
        resp = requests.post(url, json=data,
            headers={'X-X402-Payment': tx_hash})
    return resp.json()</pre>
      </div>
    </div>

    <div class="footer">
      <p>Agent: my-automaton | Wallet: ${WALLET} | Server: ${SERVER}</p>
      <p>Part of the Conway Agent Ecosystem</p>
    </div>
  </div>

  <script>
    // Load pricing data
    fetch('/api/pricing').then(r => r.json()).then(data => {
      const grid = document.getElementById('pricingGrid');
      data.endpoints.forEach(ep => {
        const card = document.createElement('div');
        card.className = 'pricing-card';
        card.innerHTML = \`
          <div class="endpoint">\${ep.path}</div>
          <div class="desc">\${ep.desc}</div>
          <div class="cost">\${ep.cost_usd} <span style="font-size: 0.6em; color: #888; font-weight: normal;">per request</span></div>
        \`;
        grid.appendChild(card);
      });
    });

    function simulatePayment() {
      const endpoint = document.getElementById('endpointSelect').value;
      const amount = parseInt(document.getElementById('amountInput').value) || 1;
      const result = document.getElementById('simResult');

      fetch('/api/payments', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          endpoint: endpoint,
          amount_cents: amount,
          agent: '0xInteractiveDemo',
          tx_hash: '0x' + Array(40).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')
        })
      }).then(r => r.json()).then(data => {
        result.style.display = 'block';
        result.innerHTML = \`
          <div style="background: #1a3a1a; border: 1px solid #50fa7b; border-radius: 8px; padding: 15px;">
            <strong style="color: #50fa7b;">✓ Payment Simulated!</strong><br>
            <span style="color: #aaa;">\${data.payment.amount_usd} paid for \${data.payment.endpoint}</span><br>
            <code style="font-size: 0.8em;">\${data.payment.tx_hash}</code>
          </div>
        \`;
        setTimeout(() => location.reload(), 1500);
      });
    }
  </script>
</body>
</html>`);
  }

  return serveJSON(res, {
    service: 'x402-payment-portal',
    endpoints: {
      '/': 'Web UI', '/health': 'Health check',
      '/api/pricing': 'Endpoint pricing list',
      '/api/stats': 'Payment statistics',
      '/api/payments': 'GET list, POST record'
    },
    wallet: WALLET, chain: CHAIN
  });
});

server.listen(PORT, () => {
  console.log(`x402 Payment Portal running on http://localhost:${PORT}`);
  console.log(`Wallet: ${WALLET} on ${CHAIN}`);
});
