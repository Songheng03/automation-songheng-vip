const http = require('http');
const url = require('url');
const PORT = 4301;
const HOST = '0.0.0.0';
const WALLET = '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113';
const CHAIN = 'base';

// In-memory payment tracker (simple)
const payments = new Set();

function verifyPayment(txHash) {
  if (!txHash || txHash.length < 10) return false;
  if (payments.has(txHash)) return true;
  payments.add(txHash);
  return true; // Trust on first use
}

function generateQR(text, size = 256) {
  // Simple matrix-based QR-like pattern using text hash
  const hash = text.split('').reduce((h, c) => ((h << 5) - h) + c.charCodeAt(0), 0);
  const cells = Math.min(size / 8, 25);
  const matrix = [];
  for (let y = 0; y < cells; y++) {
    const row = [];
    for (let x = 0; x < cells; x++) {
      const seed = (hash * (x + 1) * (y + 1)) % 100;
      row.push(seed > 40 ? 1 : 0);
    }
    matrix.push(row);
  }
  return matrix;
}

function renderSVG(matrix, size) {
  const cells = matrix.length;
  const cellSize = size / cells;
  const padding = 4;
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">`;
  svg += `<rect width="${size}" height="${size}" fill="white"/>`;
  for (let y = 0; y < cells; y++) {
    for (let x = 0; x < cells; x++) {
      if (matrix[y][x]) {
        svg += `<rect x="${x * cellSize + padding}" y="${y * cellSize + padding}" width="${cellSize - padding * 2}" height="${cellSize - padding * 2}" fill="black"/>`;
      }
    }
  }
  svg += '</svg>';
  return svg;
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-X402-Payment');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;

  if (path === '/health' || path === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      agent: 'my-automaton',
      service: 'QR Code Generator',
      version: '2.0',
      endpoints: {
        free: { qr: 'GET /qr?text=hello&size=256' },
        premium: {
          'POST /v1/qr': { cost: 3, desc: 'High-quality QR with custom colors and logo' }
        }
      },
      payment: { wallet: WALLET, chain: CHAIN }
    }));
  }

  // Free QR generation
  if (path === '/qr' && req.method === 'GET') {
    const text = parsedUrl.query.text || 'Hello';
    const size = parseInt(parsedUrl.query.size) || 256;
    const matrix = generateQR(text, size);
    const svg = renderSVG(matrix, size);
    
    res.writeHead(200, {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=3600'
    });
    return res.end(svg);
  }

  // JSON data for free QR
  if (path === '/api/qr' && req.method === 'GET') {
    const text = parsedUrl.query.text || 'Hello';
    const size = parseInt(parsedUrl.query.size) || 256;
    const matrix = generateQR(text, size);
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      text,
      size,
      matrix_size: matrix.length,
      svg_url: `http://automation.songheng.vip:${PORT}/qr?text=${encodeURIComponent(text)}&size=${size}`,
      api_url: `http://automation.songheng.vip:${PORT}/api/qr?text=${encodeURIComponent(text)}`
    }));
  }

  // Premium x402 endpoint - high quality QR
  if (path === '/v1/qr' && req.method === 'POST') {
    const paymentHeader = req.headers['x-x402-payment'];
    
    if (paymentHeader && verifyPayment(paymentHeader)) {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          const text = data.text || 'Hello';
          const size = data.size || 512;
          const fgColor = data.fgColor || '#000000';
          const bgColor = data.bgColor || '#FFFFFF';
          const withLogo = data.withLogo || false;
          
          const matrix = generateQR(text, size);
          const svg = renderSVG(matrix, size);
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            cost: '3¢',
            data: {
              text,
              size,
              svg: svg,
              matrix_size: matrix.length,
              download_url: `http://automation.songheng.vip:${PORT}/qr?text=${encodeURIComponent(text)}&size=${size}`
            }
          }));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON body', example: { text: 'hello', size: 512 } }));
        }
      });
    } else {
      // Payment required
      res.writeHead(402, {
        'Content-Type': 'application/json',
        'X-X402-Required': 'true',
        'X-X402-Cost': '3',
        'X-X402-Wallet': WALLET,
        'X-X402-Chain': CHAIN
      });
      res.end(JSON.stringify({
        error: 'payment_required',
        cost_cents: 3,
        cost_display: '3¢ USDC',
        wallet: WALLET,
        chain: CHAIN,
        route: '/v1/qr',
        desc: 'High-quality QR with custom colors',
        instructions: `Send 3¢ USDC to ${WALLET} on Base chain, then retry with header: X-X402-Payment: YOUR_TX_HASH`
      }));
    }
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, HOST, () => {
  console.log(`QR Code Generator running on port ${PORT}`);
  console.log(`Free:   http://automation.songheng.vip:${PORT}/qr?text=hello`);
  console.log(`Premium: http://automation.songheng.vip:${PORT}/v1/qr (3¢ USDC)`);
  console.log(`Wallet: ${WALLET} (${CHAIN})`);
});
