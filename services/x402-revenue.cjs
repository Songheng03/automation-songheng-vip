// x402 Revenue Service — Single file, zero deps, runs forever
// Accepts USDC payments via x402 header, returns premium analysis
const http = require('http');
const PORT = 4700;
const WALLET = '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113';
const CHAIN = 'base';
const SERVER = 'automation.songheng.vip';

// Premium service catalog
const SERVICES = {
  analyze: { cost: 1, fn: (d) => ({
    words: (d.text||'').split(/\s+/).length,
    chars: (d.text||'').length,
    sentiment: (d.text||'').length > 10 ? ((d.text||'').includes('good')?'positive':'neutral') : 'short'
  })},
  summarize: { cost: 2, fn: (d) => {
    const w = (d.text||'').split(/\s+/);
    return { length: w.length, summary: w.slice(0,25).join(' ') + (w.length>25?'...':'') };
  }},
  review: { cost: 5, fn: (d) => {
    const c = d.code||''; const fn = (c.match(/function|def |=>/g)||[]).length;
    return { lang: d.language||'js', lines: c.split('\n').length, functions: fn };
  }},
  security: { cost: 3, fn: (d) => {
    const c = d.code||''; const f = [];
    if (/eval\(/.test(c)) f.push({sev:'critical',msg:'eval() detected'});
    if (/innerHTML\s*=/.test(c)) f.push({sev:'high',msg:'XSS via innerHTML'});
    if (/password\s*=/.test(c)) f.push({sev:'high',msg:'Hardcoded password'});
    return { findings: f, score: Math.max(0,100-f.length*20) };
  }},
  explain: { cost: 2, fn: (d) => {
    const c = d.code||''; const fn = (c.match(/(async\s+)?function|def |fn /g)||[]).length;
    return { lang: d.language||'js', functions: fn, lines: c.split('\n').length };
  }},
  qr: { cost: 3, fn: (d) => ({
    text: d.text||'hello', size: d.size||256,
    url: `http://${SERVER}:4301/qr?text=${encodeURIComponent(d.text||'hello')}`
  })},
  moderate: { cost: 1, fn: (d) => ({
    safe: !/viagra|cialis|congratulations|lottery/i.test(d.text||''),
    words: (d.text||'').split(/\s+/).length
  })},
  refactor: { cost: 5, fn: (d) => {
    const c = d.code||''; const s = [];
    if (c.split('\n').length>100) s.push('Consider splitting into modules');
    if (/var /.test(c)) s.push('Use let/const instead of var');
    if (c.includes('console.log')) s.push('Remove console.log statements');
    if (!s.length) s.push('Code looks clean');
    return { suggestions: s };
  }},
  complexity: { cost: 2, fn: (d) => {
    const b = ((d.code||'').match(/\bif\b|\belse\b|\bfor\b|\bwhile\b|\bcatch\b/g)||[]).length;
    return { cyclomatic: b+1, assessment: b>15?'high':b>8?'medium':'low' };
  }},
  batch: { cost: 5, fn: (d) => ({
    count: (d.texts||[]).length,
    results: (d.texts||[]).slice(0,10).map(t=>({len:t.length,preview:t.slice(0,80)}))
  })},
  render: { cost: 3, fn: (d) => {
    let h = (d.markdown||d.text||'').replace(/#{1,3}\s+(.+)/g,'<h2>$1</h2>').replace(/\*\*(.+?)\*\*/g,'<b>$1</b>');
    return { html: h||'<p>empty</p>' };
  }}
};

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,X-X402-Payment');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  const url = req.url.replace(/\/+/g,'/').replace(/\/$/,'') || '/health';

  if (url === '/health' || url === '') {
    res.writeHead(200, {'Content-Type':'application/json'});
    return res.end(JSON.stringify({
      agent:'my-automaton', service:'Revenue x402 Gateway',
      endpoints: Object.entries(SERVICES).map(([k,v])=>({route:`/v1/${k}`,cost:v.cost})),
      wallet:WALLET, chain:CHAIN
    }));
  }

  if (!url.startsWith('/v1/')) {
    res.writeHead(404); return res.end('{}');
  }

  const svcName = url.replace('/v1/','');
  const svc = SERVICES[svcName];

  if (!svc) {
    res.writeHead(404, {'Content-Type':'application/json'});
    return res.end(JSON.stringify({error:'unknown endpoint', available:Object.keys(SERVICES).map(k=>`/v1/${k}`)}));
  }

  if (req.method !== 'POST') {
    res.writeHead(405); return res.end(JSON.stringify({error:'use POST'}));
  }

  // Check x402 payment
  const payment = req.headers['x-x402-payment'];
  if (!payment || payment.length < 10) {
    res.writeHead(402, {
      'Content-Type':'application/json',
      'X-X402-Cost':String(svc.cost),
      'X-X402-Wallet':WALLET,
      'X-X402-Chain':CHAIN
    });
    return res.end(JSON.stringify({
      error:'payment_required',
      cost_cents: svc.cost,
      cost_display: `${svc.cost}¢ USDC`,
      wallet: WALLET,
      chain: CHAIN,
      instructions: `Send ${svc.cost}¢ USDC to ${WALLET} on Base, retry with X-X402-Payment: TX_HASH`
    }));
  }

  let body = '';
  req.on('data', c => body += c);
  req.on('end', () => {
    try {
      const data = JSON.parse(body || '{}');
      const result = svc.fn(data);
      res.writeHead(200, {'Content-Type':'application/json'});
      res.end(JSON.stringify({ success: true, cost: `${svc.cost}¢`, data: result }));
    } catch(e) {
      res.writeHead(400);
      res.end(JSON.stringify({error:'invalid body'}));
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n=== 🤖 my-automaton Revenue x402 Gateway ===`);
  console.log(`Server: http://${SERVER}:${PORT}`);
  console.log(`Wallet: ${WALLET} (${CHAIN})`);
  console.log(`Endpoints:`);
  Object.entries(SERVICES).forEach(([k,v]) => console.log(`  ${String(v.cost).padStart(2)}¢  /v1/${k}`));
  console.log(`==========================================\n`);
});
