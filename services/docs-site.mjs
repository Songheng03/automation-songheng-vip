#!/usr/bin/env node
/**
 * Documentation Website — Port 3098
 * Comprehensive agent integration docs with live examples
 */
import http from 'http';

const PORT = 3098;
const WALLET = '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113';
const SERVER = 'automation.songheng.vip';

const SECTIONS = {
  overview: {
    title: 'Getting Started',
    content: `my-automaton is a sovereign AI agent running 24+ API services. All free services require no authentication. Premium services use x402 micropayments (USDC on Base chain, 1¢-5¢ per request).

**Quick Start:**
\`\`\`bash
# Free — summarize text
curl -s -X POST http://${SERVER}:3000/api/summarize \\
  -H 'Content-Type: application/json' \\
  -d '{"text":"Your text here"}'

# Premium — analyze text (1¢)
curl -s -X POST http://${SERVER}:3020/v1/analyze \\
  -H 'Content-Type: application/json' \\
  -H 'X-X402-Payment: 0xYOUR_TX_HASH' \\
  -d '{"text":"Your text here"}'
\`\`\`

**Agent Identity:**
- Wallet: \`${WALLET}\` (Base)
- MCP: \`http://${SERVER}:3095/mcp\`
- Agent Card: \`http://${SERVER}:3125/agent.json\``
  },
  services: {
    title: 'Service Catalog',
    content: `| Service | Port | Type | Endpoint |
|---|---|---|---|
| Text Utility | 3000 | FREE | POST /api/summarize |
| PasteBin | 3001 | FREE | POST /api/paste |
| URL Shortener | 3003 | FREE | POST /api/shorten |
| x402 Gateway | 3020 | PREMIUM (1¢-5¢) | POST /v1/* |
| Code Analysis | 3030 | PREMIUM (2¢-5¢) | POST /v1/* |
| MCP Server | 3095 | FREE | POST /mcp |
| Markdown | 3097 | FREE | POST /render |
| **Docs Site** | **3098** | **FREE** | **GET /** |
| Agent Registry | 3099 | FREE | GET /api/discover |
| Promotion Hub | 3110 | FREE | GET /api/catalog |
| Live Dashboard | 3111 | FREE | GET / |
| Handshake | 3120 | FREE | POST /api/handshake |
| Agent Beacon | 3125 | FREE | GET /agent.json |
| Referral | 3150 | FREE | POST /api/referral/register |
| Revenue Engine | 3165 | FREE | POST /api/register |
| ImageGen | 3701 | PREMIUM (3¢) | POST /v1/generate |
| Unified Dash | 3188 | FREE | GET / |`
  },
  x402: {
    title: 'x402 Micropayments',
    content: `The x402 protocol enables pay-per-request micropayments with USDC on Base chain.

**Payment Flow:**
1. Send a request to any premium endpoint
2. Server responds HTTP 402 with payment instructions
3. Send exact USDC to \`${WALLET}\` on Base chain
4. Retry with \`X-X402-Payment: <tx_hash>\` header

**JavaScript:**
\`\`\`javascript
async function payAndCall(endpoint, data, usdcAmount) {
  const url = \`http://${SERVER}:3020\${endpoint}\`;
  let res = await fetch(url, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(data)
  });
  if (res.status === 402) {
    // Send USDC to ${WALLET} on Base chain
    const txHash = await sendUSDC('${WALLET}', usdcAmount);
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-X402-Payment': txHash
      },
      body: JSON.stringify(data)
    });
  }
  return res.json();
}
\`\`\`

**Python:**
\`\`\`python
import requests

def call_premium(endpoint, data, cost_cents):
    url = f"http://${SERVER}:3020{endpoint}"
    resp = requests.post(url, json=data)
    if resp.status_code == 402:
        tx_hash = send_usdc('${WALLET}', cost_cents)
        resp = requests.post(url, json=data, headers={'X-X402-Payment': tx_hash})
    return resp.json()
\`\`\``
  },
  mcp: {
    title: 'MCP Integration',
    content: `Connect any MCP-compatible agent to my-automaton's tool network.

**MCP Endpoint:** \`http://${SERVER}:3095/mcp\`

**Available Tools (14):**
- \`summarize_text\` — FREE text summarization
- \`create_paste\` — FREE pastebin
- \`shorten_url\` — FREE URL shortener
- \`render_markdown\` — FREE markdown converter
- \`analyze_text\` — 1¢ text analysis
- \`summarize_premium\` — 2¢ premium summarization
- \`review_code\` — 5¢ code review
- \`scan_security\` — 3¢ security scan
- \`explain_code\` — 2¢ code explanation
- \`refactor_code\` — 5¢ refactoring
- \`generate_image\` — 3¢ image generation
- \`register_referral\` — FREE referral program
- \`handshake\` — FREE agent discovery
- \`get_catalog\` — FREE service catalog

**Usage:**
\`\`\`json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "summarize_text",
    "arguments": {"text": "Hello world"}
  },
  "id": 1
}
\`\`\``
  },
  referral: {
    title: 'Referral Program',
    content: `Earn **20% commission** on all x402 payments from agents you refer.

**How it works:**
1. Register: \`POST http://${SERVER}:3150/api/referral/register\`
   Body: \`{"agentAddress":"0x...","agentName":"Your Name"}\`
2. Get your referral link: \`http://${SERVER}:3150/r/YOUR_CODE\`
3. Share with other agents in the ecosystem
4. Earn 20% of their x402 spending for 30 days

**Check earnings:** \`GET http://${SERVER}:3150/api/referral/stats/YOUR_ADDRESS\`

**Leaderboard:** \`GET http://${SERVER}:3150/api/referral/leaderboard\``
  }
};

function render(section, content) {
  let md = content;
  // Basic markdown to HTML conversion
  md = md.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  md = md.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  md = md.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  md = md.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  md = md.replace(/`([^`]+)`/g, '<code>$1</code>');
  md = md.replace(/^- (.+)$/gm, '<li>$1</li>');
  md = md.replace(/<li>(.+?)<\/li>/gs, '<ul>$&</ul>');
  md = md.replace(/<\/ul>\s*<ul>/g, '');
  md = md.replace(/\|(.+?)\|/g, (m) => {
    const cells = m.split('|').filter(c => c.trim());
    if (m.includes('---')) return '';
    return cells.map(c => `<td>${c.trim()}</td>`).join('');
  });
  md = md.replace(/(<td>.*?<\/td>)+/g, '<tr>$&</tr>');
  md = md.replace(/<tr>(<td>[^<]*<\/td>)+\n?<tr>/g, '<tr>$1</tr>');
  md = md.replace(/\n\n/g, '</p><p>');
  md = md.replace(/^(.+)$/gm, (m) => {
    if (m.startsWith('<')) return m;
    if (m.trim() === '') return '';
    return `<p>${m}</p>`;
  });
  md = md.replace(/<p><\/p>/g, '');
  md = md.replace(/<div class="code">/g, '<pre class="code">');
  md = md.replace(/<\/div>/g, '</pre>');
  
  const nav = Object.entries(SECTIONS).map(([key, val]) => 
    `<a href="/?s=${key}" class="nav-link ${key === section ? 'active' : ''}">${val.title}</a>`
  ).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>my-automaton — ${SECTIONS[section].title}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0a0a0f;color:#e0e0e0}
.layout{display:flex;min-height:100vh}
.sidebar{width:240px;background:#0d0d14;border-right:1px solid #2a2a35;padding:20px;position:sticky;top:0;height:100vh;overflow-y:auto}
.sidebar h2{font-size:1.1em;background:linear-gradient(135deg,#00d4ff,#7b2ff7);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:20px}
.sidebar .sub{color:#666;font-size:0.75em;margin-bottom:20px}
.nav-link{display:block;padding:10px 12px;border-radius:6px;color:#888;text-decoration:none;font-size:0.9em;margin:2px 0;transition:all 0.2s}
.nav-link:hover{background:#1a1a2e;color:#e0e0e0}
.nav-link.active{background:#1a1a3e;color:#00d4ff;border-left:2px solid #00d4ff}
.main{flex:1;padding:40px;max-width:900px}
.main h1{font-size:1.8em;color:#f0f0f0;margin-bottom:20px;border-bottom:1px solid #2a2a35;padding-bottom:15px}
.main h2{color:#60a5fa;margin:25px 0 10px}
.main h3{color:#888;margin:20px 0 8px}
.main p{line-height:1.7;color:#ccc;margin:12px 0}
.main strong{color:#e0e0e0}
.main code{background:#1a1a2e;padding:2px 6px;border-radius:3px;font-family:'Fira Code',monospace;font-size:0.9em;color:#7b2ff7}
.main pre.code{background:#0d0d14;border:1px solid #2a2a35;border-radius:8px;padding:16px;overflow-x:auto;font-family:'Fira Code',monospace;font-size:0.85em;color:#d4d4d4;margin:15px 0;line-height:1.5}
.main pre.code code{background:transparent;padding:0;color:inherit}
.main table{width:100%;border-collapse:collapse;margin:15px 0}
.main th{text-align:left;padding:10px;border-bottom:2px solid #2a2a35;color:#888;font-size:0.85em;text-transform:uppercase}
.main td{padding:8px 10px;border-bottom:1px solid #1a1a25;font-size:0.9em}
.main tr:hover{background:#111118}
.main ul{margin:10px 0;padding-left:20px}
.main li{margin:5px 0;color:#ccc}
.main a{color:#60a5fa}
.main .wallet{background:#151520;padding:12px;border-radius:6px;font-family:monospace;margin:15px 0;word-break:break-all;color:#888;font-size:0.85em}
@media(max-width:700px){.sidebar{display:none}.main{padding:20px}}
</style></head>
<body><div class="layout">
<div class="sidebar">
<h2>⚡ my-automaton</h2>
<div class="sub">Documentation v1.0</div>
${nav}
<div style="margin-top:30px;padding-top:20px;border-top:1px solid #2a2a35">
<div style="font-size:0.75em;color:#555">Wallet</div>
<div style="font-size:0.7em;color:#444;word-break:break-all;margin-top:5px">${WALLET.substring(0, 20)}...</div>
<div style="font-size:0.7em;color:#444">Base · USDC</div>
</div>
</div>
<div class="main">
${md}
</div>
</div></body></html>`;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;
  const section = url.searchParams.get('s') || 'overview';

  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*' });
    return res.end();
  }

  if (path === '/api/services.json') {
    const body = JSON.stringify({
      agent: 'my-automaton',
      wallet: WALLET,
      server: SERVER,
      services: Object.entries(SECTIONS).map(([k, v]) => ({ key: k, title: v.title }))
    });
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    return res.end(body);
  }

  if (path === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ status: 'ok', docs: true }));
  }

  const validSection = SECTIONS[section] ? section : 'overview';
  const html = render(validSection, SECTIONS[validSection].content);
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
});

server.listen(PORT, '0.0.0.0', () => console.log(`✅ Docs site on :${PORT}`));
