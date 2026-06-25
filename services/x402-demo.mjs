// x402 Payment Demo - Interactive showcase of all premium endpoints
// Serves an HTML page with try-it buttons for each x402 service
import http from 'http';

const PORT = 3170;
const MY_WALLET = '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113';
const SERVER = 'automation.songheng.vip';
const CHAIN = 'Base';

const services = [
  { name: 'Deep Text Analysis', endpoint: '/v1/analyze', cost: '1¢', desc: 'Sentiment, entities, key phrases, and writing quality analysis', port: 3020 },
  { name: 'AI Summarization', endpoint: '/v1/summarize', cost: '2¢', desc: 'Concise AI-generated summaries of any text', port: 3020 },
  { name: 'Code Review', endpoint: '/v1/review', cost: '5¢', desc: 'Full code review with metrics, complexity, and security scan', port: 3030 },
  { name: 'Security Scan', endpoint: '/v1/security', cost: '3¢', desc: 'Vulnerability scan (eval, XSS, SQL injection, hardcoded creds)', port: 3030 },
  { name: 'Code Explanation', endpoint: '/v1/explain', cost: '2¢', desc: 'Explain code structure and function signatures', port: 3030 },
  { name: 'Refactoring', endpoint: '/v1/refactor', cost: '5¢', desc: 'Get refactoring suggestions for cleaner code', port: 3030 },
  { name: 'Complexity Analysis', endpoint: '/v1/complexity', cost: '2¢', desc: 'Quick complexity metrics (lines, functions, classes)', port: 3030 },
  { name: 'Batch Processing', endpoint: '/v1/batch', cost: '5¢', desc: 'Batch analyze 10 texts at once', port: 3020 },
  { name: 'Markdown Render', endpoint: '/v1/render', cost: '3¢', desc: 'Render markdown with templates', port: 3020 }
];

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>my-automaton · x402 Payment Demo</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',monospace;background:#0a0a0f;color:#e0e0e0;line-height:1.6}
.container{max-width:960px;margin:0 auto;padding:20px}
.hero{text-align:center;padding:50px 0 30px;border-bottom:1px solid #1a1a2a;margin-bottom:30px}
.hero h1{font-size:38px;background:linear-gradient(135deg,#00ff88,#8888ff);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:10px}
.hero .sub{color:#888;font-size:14px}
.wallet-box{background:#0d0d1a;border:1px solid #2a2a3a;border-radius:12px;padding:20px;margin:20px 0;text-align:center}
.wallet-box .label{color:#888;font-size:12px;margin-bottom:5px}
.wallet-box .addr{color:#00ff88;font-family:monospace;font-size:16px;word-break:break-all}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;margin-top:20px}
.card{background:#111;border:1px solid #2a2a3a;border-radius:12px;padding:20px;transition:all 0.2s}
.card:hover{border-color:#00ff88}
.card h3{color:#00ff88;font-size:15px;margin-bottom:6px}
.card .cost{display:inline-block;background:#00ff8822;color:#00ff88;padding:2px 10px;border-radius:20px;font-size:12px;font-weight:bold;margin-bottom:8px}
.card .desc{color:#888;font-size:13px;margin-bottom:12px;min-height:32px}
.card .ep{color:#666;font-size:11px;margin-bottom:8px;font-family:monospace}
.card .btn{background:transparent;border:1px solid #00ff88;color:#00ff88;padding:8px 16px;border-radius:6px;cursor:pointer;font-size:12px;transition:all 0.2s;width:100%}
.card .btn:hover{background:#00ff8822}
.card .btn:disabled{opacity:0.4;cursor:not-allowed}
.response-box{background:#0d0d1a;border:1px solid #2a2a3a;border-radius:8px;padding:12px;margin-top:8px;font-size:12px;max-height:150px;overflow:auto;display:none;white-space:pre-wrap;color:#aaa}
.tabs{display:flex;gap:8px;margin:20px 0 10px;border-bottom:1px solid #2a2a3a;padding-bottom:8px}
.tab{padding:6px 16px;border-radius:6px;cursor:pointer;font-size:13px;color:#888;transition:all 0.2s;background:transparent;border:none}
.tab.active{background:#00ff8811;color:#00ff88}
.integration-box{background:#0d0d1a;border:1px solid #2a2a3a;border-radius:12px;padding:20px;margin:20px 0;display:none}
.integration-box.active{display:block}
.integration-box h3{color:#00ff88;margin-bottom:10px}
pre{background:#0a0a0f;border:1px solid #1a1a2a;border-radius:8px;padding:16px;overflow-x:auto;font-size:12px;color:#aaa}
code{color:#8888ff}
</style>
</head>
<body>
<div class="container">
<div class="hero">
<h1>⚡ x402 Micropayments</h1>
<div class="sub">Pay-per-use AI services on Base chain · No subscriptions · Just results</div>
</div>

<div class="wallet-box">
<div class="label">Send USDC on ${CHAIN} to</div>
<div class="addr">${MY_WALLET}</div>
<div class="label" style="margin-top:8px;font-size:11px;color:#666">Then retry request with X-X402-Payment: &lt;tx_hash&gt;</div>
</div>

<div class="tabs">
<button class="tab active" onclick="showTab('services')">🔌 Services</button>
<button class="tab" onclick="showTab('js')">📦 JavaScript</button>
<button class="tab" onclick="showTab('python')">🐍 Python</button>
<button class="tab" onclick="showTab('curl')">🔧 cURL</button>
</div>

<div id="tab-services" class="integration-box active">
<div class="grid" id="servicesGrid">
${services.map((s, i) => `
<div class="card">
<h3>${s.name}</h3>
<div class="cost">${s.cost}</div>
<div class="desc">${s.desc}</div>
<div class="ep">POST http://${SERVER}:${s.port}${s.endpoint}</div>
<button class="btn" onclick="testEndpoint(${i})" id="btn-${i}">▶ Try It</button>
<div class="response-box" id="resp-${i}"></div>
</div>`).join('')}
</div>
</div>

<div id="tab-js" class="integration-box">
<h3>JavaScript / TypeScript</h3>
<pre>
async function callPremium(endpoint, data, costCents) {
  const url = \`http://${SERVER}:3020\${endpoint}\`;
  let res = await fetch(url, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(data)
  });
  if (res.status === 402) {
    const { amount, wallet } = await res.json();
    console.log(\`Send \${amount} USDC to \${wallet} on Base\`);
    // After sending payment:
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-X402-Payment': '0x&lt;tx_hash&gt;'
      },
      body: JSON.stringify(data)
    });
  }
  return res.json();
}</pre>
</div>

<div id="tab-python" class="integration-box">
<h3>Python</h3>
<pre>
import requests

def x402_call(endpoint, data, cost_cents):
    url = f"http://${SERVER}:3020{endpoint}"
    resp = requests.post(url, json=data)
    if resp.status_code == 402:
        info = resp.json()
        print(f"Send {info['amount']} USDC to {info['wallet']} on Base")
        # After payment:
        resp = requests.post(url, json=data,
            headers={'X-X402-Payment': '0x&lt;tx_hash&gt;'})
    return resp.json()</pre>
</div>

<div id="tab-curl" class="integration-box">
<h3>cURL</h3>
<pre>
# Step 1: Request (gets 402 with payment details)
curl -X POST http://${SERVER}:3020/v1/analyze \\
  -H "Content-Type: application/json" \\
  -d '{"text":"Hello world"}'

# Step 2: Send USDC to ${MY_WALLET} on ${CHAIN}

# Step 3: Retry with payment proof
curl -X POST http://${SERVER}:3020/v1/analyze \\
  -H "Content-Type: application/json" \\
  -H "X-X402-Payment: 0x&lt;tx_hash&gt;" \\
  -d '{"text":"Hello world"}'</pre>
</div>

<div style="margin-top:30px;padding:20px;background:#0d0d1a;border:1px solid #2a2a3a;border-radius:12px;text-align:center">
<h3 style="color:#8888ff;margin-bottom:10px">🤝 Agent Referral Program</h3>
<p style="color:#888;font-size:13px;margin-bottom:12px">Earn 20% commission on every payment from agents you refer</p>
<p style="font-size:12px;color:#666">Register: <code style="color:#8888ff">POST http://${SERVER}:3150/api/referral/register</code></p>
</div>

<div style="text-align:center;margin:30px 0;padding:20px;border-top:1px solid #1a1a2a;color:#555;font-size:12px">
my-automaton · ${MY_WALLET} · ${CHAIN} chain
</div>
</div>

<script>
const endpoints = ${JSON.stringify(services.map(s => ({endpoint: s.endpoint, port: s.port, cost: s.cost, name: s.name})))};

function showTab(tab) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.integration-box').forEach(b => b.classList.remove('active'));
  document.querySelector('[onclick="showTab(\\''+tab+'\\')"]').classList.add('active');
  document.getElementById('tab-'+tab).classList.add('active');
}

async function testEndpoint(i) {
  const btn = document.getElementById('btn-'+i);
  const resp = document.getElementById('resp-'+i);
  const ep = endpoints[i];
  
  btn.disabled = true;
  btn.textContent = '⏳ Requesting...';
  resp.style.display = 'block';
  resp.textContent = 'Contacting service...';
  
  try {
    const url = \`http://${SERVER}:\${ep.port}\${ep.endpoint}\`;
    const body = ep.port === 3020
      ? {text: 'Artificial intelligence is transforming how we interact with technology.'}
      : {code: 'function hello(name) {\\n  return \`Hello, \${name}!\`;\\n}', language: 'javascript'};
    
    const res = await fetch(url, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(body)
    });
    
    if (res.status === 402) {
      const data = await res.json();
      resp.innerHTML = \`⚡ Payment required: \${ep.cost} (202)\nSend USDC to:\n\${data.wallet || '${MY_WALLET}'}\n\nThen retry with X-X402-Payment header.\`;
    } else if (res.ok) {
      const data = await res.json();
      resp.innerHTML = '✅ Success!\\n\\n' + JSON.stringify(data, null, 2).slice(0, 500);
    } else {
      resp.textContent = \`❌ HTTP \${res.status}: \${await res.text()}\`;
    }
  } catch(e) {
    resp.textContent = '⚠️ Error: ' + e.message;
  }
  
  btn.disabled = false;
  btn.textContent = '▶ Try It';
}
<\/script>
</body>
</html>`;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html', 'Access-Control-Allow-Origin': '*' });
  res.end(html);
});

server.listen(PORT, () => {
  console.log(`x402 Demo page running on port ${PORT}`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => { server.close(); process.exit(0); });
process.on('SIGINT', () => { server.close(); process.exit(0); });
