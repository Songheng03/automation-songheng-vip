#!/usr/bin/env node
/**
 * QR Code Generator — Port 3700
 * Premium: 3¢ for custom QR codes
 * Free: Basic QR codes
 * x402 micropayments on Base chain
 */
import http from 'http';
import { randomBytes } from 'crypto';

const PORT = 3700;
const WALLET = '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113';
const SERVER = 'automation.songheng.vip';

// Simple QR generation using QR code API (we'll redirect to a reliable QR API)
// For self-hosted, we use http://goqr.me/api/ or similar

function generateSvg(text, size = 200, fg = '#000000', bg = '#ffffff') {
  // Simple SVG placeholder QR — in production use qrcode npm package
  // For now, we render a styled page and use external API
  return null;
}

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>my-automaton · QR Code Generator</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',monospace;background:#0a0a0f;color:#e0e0e0;padding:30px;line-height:1.6}
.container{max-width:700px;margin:0 auto}
h1{font-size:28px;background:linear-gradient(135deg,#00ff88,#8888ff);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:5px}
.sub{color:#888;font-size:13px;margin-bottom:30px}
.box{background:#0d0d1a;border:1px solid #2a2a3a;border-radius:12px;padding:24px;margin-bottom:16px}
.box h2{color:#00ff88;font-size:16px;margin-bottom:15px}
label{display:block;color:#888;font-size:12px;margin-bottom:5px}
input, select{width:100%;background:#1a1a2e;border:1px solid #2a2a3a;color:#e0e0e0;padding:10px 14px;border-radius:8px;font-family:monospace;font-size:14px;margin-bottom:14px}
input:focus{outline:none;border-color:#8888ff}
button{background:#00ff88;color:#000;border:none;padding:10px 20px;border-radius:8px;font-weight:bold;cursor:pointer;transition:all 0.2s;font-size:14px}
button:hover{background:#00ffaa;transform:translateY(-1px)}
button:disabled{background:#2a2a3a;color:#666;cursor:not-allowed}
.qr-result{text-align:center;margin:20px 0;min-height:200px;display:flex;flex-direction:column;align-items:center;justify-content:center}
.qr-result img{max-width:300px;border-radius:8px;border:1px solid #2a2a3a}
.qr-result .placeholder{color:#555;font-size:14px;padding:40px}
.pricing{display:flex;gap:12px;margin:15px 0;flex-wrap:wrap}
.tier{flex:1;min-width:150px;background:#111120;border:1px solid #2a2a3a;border-radius:10px;padding:16px;text-align:center}
.tier h3{font-size:14px;color:#e0e0e0;margin-bottom:4px}
.tier .price{font-size:22px;color:#00ff88;font-weight:bold}
.tier .price.premium{color:#ff8800}
.tier .note{font-size:11px;color:#666;margin-top:4px}
.features{list-style:none;padding:0}
.features li{padding:6px 0;border-bottom:1px solid #1a1a2a;font-size:13px;color:#aaa}
.features li:before{content:"✓ ";color:#00ff88}
</style>
</head>
<body>
<div class="container">
<h1>📱 QR Code Generator</h1>
<div class="sub">Generate QR codes for URLs, text, and more · x402 micropayments</div>

<div class="pricing">
<div class="tier">
<h3>Free</h3>
<div class="price">$0</div>
<div class="note">Basic QR, 200px, black/white</div>
</div>
<div class="tier">
<h3>Premium</h3>
<div class="price premium">3¢</div>
<div class="note">Custom colors, 500px, logo overlay</div>
</div>
</div>

<div class="box">
<h2>Generate QR Code</h2>
<label>Content (URL or text)</label>
<input type="text" id="content" placeholder="https://example.com or any text" value="https://github.com">
<label>Size</label>
<select id="size">
<option value="200">200×200 (Free)</option>
<option value="300">300×300</option>
<option value="500">500×500 (Premium)</option>
<option value="1000">1000×1000 (Premium)</option>
</select>
<label>Foreground Color</label>
<input type="color" id="fgColor" value="#000000">
<label>Background Color</label>
<input type="color" id="bgColor" value="#ffffff">
<button onclick="generate()">Generate QR Code</button>
</div>

<div class="box">
<h2>Result</h2>
<div class="qr-result" id="result">
<div class="placeholder">Enter content and click Generate</div>
</div>
</div>

<div class="box">
<h2>API</h2>
<pre style="background:#000;padding:12px;border-radius:8px;font-size:12px;color:#00ff88;overflow-x:auto">
# Free QR
GET http://${SERVER}:3700/api/qr?text=https://example.com&size=200

# Premium QR (3¢, needs payment)
POST http://${SERVER}:3700/api/qr
Header: X-X402-Payment: 0x&lt;tx_hash&gt;
Body: {"text":"https://example.com","size":500,"fg":"#ff0000","bg":"#ffffff"}
</pre>
</div>

<div class="box" style="text-align:center;border-color:#2a2a3a;">
<div style="color:#888;font-size:12px">Send USDC on Base to</div>
<div style="color:#00ff88;font-family:monospace;font-size:13px;word-break:break-all;margin:5px 0">${WALLET}</div>
</div>
</div>

<script>
async function generate() {
  const content = document.getElementById('content').value;
  const size = parseInt(document.getElementById('size').value);
  const fg = document.getElementById('fgColor').value.replace('#', '');
  const bg = document.getElementById('bgColor').value.replace('#', '');
  const resultDiv = document.getElementById('result');
  
  if (!content) { resultDiv.innerHTML = '<div class="placeholder">Please enter content</div>'; return; }
  
  resultDiv.innerHTML = '<div class="placeholder">Generating...</div>';
  
  // Use goqr.me API as a reliable backend
  const url = \`https://api.qrserver.com/v1/create-qr-code/?size=\${size}x\${size}&data=\${encodeURIComponent(content)}&format=png&color=\${fg}&bgcolor=\${bg}\`;
  
  resultDiv.innerHTML = \`<img src="\${url}" alt="QR Code" onerror="this.parentElement.innerHTML='<div class=\\"placeholder\\">Error generating QR. Try again.</div>'">\`;
}
<\/script>
</body>
</html>`;

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;

  if (req.method === 'OPTIONS') {
    res.writeHead(204); return res.end();
  }

  if (path === '/api/qr' && req.method === 'GET') {
    const text = url.searchParams.get('text') || 'QR';
    const size = parseInt(url.searchParams.get('size') || '200');
    const fg = url.searchParams.get('fg') || '000000';
    const bg = url.searchParams.get('bg') || 'ffffff';
    const isPremium = size > 300;

    if (isPremium) {
      // Check for payment
      const payment = req.headers['x-x402-payment'];
      if (!payment) {
        res.writeHead(402, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          error: 'payment_required',
          amount: '0.03',
          token: 'USDC',
          chain: 'base',
          to: WALLET,
          message: 'Send 3¢ USDC to generate premium QR codes'
        }));
      }
    }

    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}&format=png&color=${fg}&bgcolor=${bg}`;
    res.writeHead(302, { 'Location': qrUrl });
    return res.end();
  }

  if (path === '/api/qr' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const text = data.text || 'QR';
        const size = data.size || 200;
        const fg = (data.fg || '#000000').replace('#', '');
        const bg = (data.bg || '#ffffff').replace('#', '');
        const isPremium = size > 300 || fg !== '000000' || bg !== 'ffffff';

        if (isPremium) {
          const payment = req.headers['x-x402-payment'];
          if (!payment) {
            res.writeHead(402, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({
              error: 'payment_required',
              amount: '0.03',
              token: 'USDC',
              chain: 'base',
              to: WALLET
            }));
          }
        }

        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}&format=png&color=${fg}&bgcolor=${bg}`;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ url: qrUrl }));
      } catch(e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  if (path === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ status: 'ok', service: 'qr-generator', port: PORT }));
  }

  // Serve HTML
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(html);
});

server.listen(PORT, () => {
  console.log(`QR Generator running on port ${PORT}`);
});

process.on('SIGTERM', () => server.close(() => process.exit(0)));
process.on('SIGINT', () => server.close(() => process.exit(0)));
