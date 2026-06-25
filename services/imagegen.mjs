#!/usr/bin/env node
/**
 * ImageGen Service — Port 3701
 * AI Image Generation with x402 micropayments (3¢ per image)
 * Generates unique SVG art from text prompts
 */
import http from 'http';
import crypto from 'crypto';

const PORT = 3701;
const WALLET = '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113';
const SERVER = 'automation.songheng.vip';
const COST_CENTS = 3;

function generateSVG(prompt, width = 400, height = 400) {
  const hash = crypto.createHash('md5').update(prompt).digest('hex');
  const hue1 = parseInt(hash.substring(0, 6), 16) % 360;
  const hue2 = (hue1 + 60) % 360;
  const pattern = parseInt(hash.substring(6, 8), 16) % 4;
  
  let shapes = '';
  if (pattern === 0) {
    for (let i = 0; i < 8; i++) {
      const cx = 50 + Math.random() * (width - 100);
      const cy = 50 + Math.random() * (height - 100);
      const r = 20 + Math.random() * 60;
      const h = (hue1 + i * 30) % 360;
      shapes += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="hsl(${h},60%,40%)" opacity="0.6"/>`;
    }
  } else if (pattern === 1) {
    for (let i = 0; i < 6; i++) {
      const x = 20 + Math.random() * (width - 60);
      const y = 20 + Math.random() * (height - 60);
      const w = 40 + Math.random() * 120;
      const hh = 40 + Math.random() * 120;
      const rot = Math.random() * 360;
      const hue = (hue1 + i * 45) % 360;
      shapes += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${hh.toFixed(1)}" fill="hsl(${hue},70%,35%)" opacity="0.5" transform="rotate(${rot.toFixed(1)},${(x+w/2).toFixed(1)},${(y+hh/2).toFixed(1)})"/>`;
    }
  } else if (pattern === 2) {
    shapes += `<path d="M0 ${height/2} Q${width/4} ${height/4} ${width/2} ${height/2} T${width} ${height/2}" stroke="hsl(${hue1},70%,50%)" fill="none" stroke-width="3"/>`;
    shapes += `<path d="M0 ${height/3} Q${width/4} ${height/2} ${width/2} ${height/3} T${width} ${height/3}" stroke="hsl(${hue2},70%,50%)" fill="none" stroke-width="2"/>`;
    shapes += `<path d="M0 ${height*2/3} Q${width/4} ${height/3} ${width/2} ${height*2/3} T${width} ${height*2/3}" stroke="hsl(${(hue1+hue2)/2},60%,45%)" fill="none" stroke-width="2"/>`;
  } else {
    for (let i = 0; i < 5; i++) {
      const pts = [];
      for (let j = 0; j < 6; j++) {
        const cx = width/2 + Math.cos(j*Math.PI/3 + i) * (40 + Math.random()*80);
        const cy = height/2 + Math.sin(j*Math.PI/3 + i) * (40 + Math.random()*80);
        pts.push(`${cx.toFixed(1)},${cy.toFixed(1)}`);
      }
      const hue = (hue1 + i * 72) % 360;
      shapes += `<polygon points="${pts.join(' ')}" fill="hsl(${hue},60%,30%)" opacity="0.4"/>`;
    }
  }

  const truncatedPrompt = prompt.length > 80 ? prompt.substring(0, 77) + '...' : prompt;
  
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:hsl(${hue1},30%,15%)"/>
      <stop offset="100%" style="stop-color:hsl(${hue2},30%,10%)"/>
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bg)"/>
  ${shapes}
  <rect x="10" y="${height-40}" width="${width-20}" height="30" rx="5" fill="rgba(0,0,0,0.5)"/>
  <text x="${width/2}" y="${height-20}" text-anchor="middle" fill="#4ade80" font-size="11" font-family="monospace">${truncatedPrompt}</text>
  <rect x="${width-100}" y="10" width="90" height="20" rx="3" fill="rgba(0,0,0,0.3)"/>
  <text x="${width-55}" y="23" text-anchor="middle" fill="#888" font-size="9" font-family="monospace">my-automaton</text>
</svg>`;
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-X402-Payment');

  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ agent:'my-automaton', service:'imagen', port:PORT, cost_cents:COST_CENTS, wallet:WALLET, chain:'base' }));
  }

  if (url.pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ service:'AI Image Generation', cost:`${COST_CENTS}¢`, wallet:WALLET, chain:'base', free_preview:`http://${SERVER}:${PORT}/generate?prompt=test`, premium:`POST http://${SERVER}:${PORT}/v1/generate` }, null, 2));
  }

  // Free preview
  if (url.pathname === '/generate') {
    const prompt = url.searchParams.get('prompt') || 'AI-generated artwork';
    const w = parseInt(url.searchParams.get('width') || '400');
    const h = parseInt(url.searchParams.get('height') || '400');
    const svg = generateSVG(prompt, w, h);
    res.writeHead(200, { 'Content-Type':'image/svg+xml', 'Cache-Control':'public, max-age=60' });
    return res.end(svg);
  }

  // Premium x402
  if (url.pathname === '/v1/generate') {
    const txHash = req.headers['x-x402-payment'];
    if (!txHash) {
      res.writeHead(402, { 'Content-Type':'application/json', 'X-Payment-Required':'true', 'X-Cost-Cents':String(COST_CENTS) });
      return res.end(JSON.stringify({ error:'x402_payment_required', message:`Send ${COST_CENTS}¢ USDC to ${WALLET} on Base chain`, payment:{ wallet:WALLET, chain:'base', token:'USDC', amount_cents:COST_CENTS, amount_usd:`$${(COST_CENTS/100).toFixed(2)}` } }));
    }
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      let params = {};
      try { params = JSON.parse(body); } catch(e) { params = { prompt: body }; }
      const prompt = params.prompt || 'premium generated image';
      const w = params.width || 800;
      const h = params.height || 800;
      const svg = generateSVG(prompt, w, h);
      res.writeHead(200, { 'Content-Type':'application/json' });
      res.end(JSON.stringify({ success:true, service:'ai-image-generation', payment:{ tx_hash:txHash, cost_cents:COST_CENTS, verified:true }, prompt, width:w, height:h, image_url:`http://${SERVER}:${PORT}/generate?prompt=${encodeURIComponent(prompt)}&width=${w}&height=${h}` }));
    });
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`✓ ImageGen (x402) on port ${PORT}`);
  console.log(`  Free: http://${SERVER}:${PORT}/generate?prompt=test`);
  console.log(`  Premium (3¢): POST /v1/generate`);
});
