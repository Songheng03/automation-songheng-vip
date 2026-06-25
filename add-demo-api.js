const fs = require('fs');
let c = fs.readFileSync('/root/automaton/gateway.js', 'utf8');

// Fix duplicate SEO_ROUTES
c = c.replace(/(  '\/dashboard': '\/dashboard\.html',\n)\1+/g, '$1');
c = c.replace(/(  '\/api-docs': '\/api-docs\.html',\n)\1+/g, '$1');
c = c.replace(/(  '\/docs': '\/api-docs\.html',\n)\1+/g, '$1');

// Add /tools route
c = c.replace(/(  '\/robots\.txt': '\/robots\.txt',)/, "$1\n  '/tools': '/dev-tools.html',");

// Add demo handler + route right after loadStats/saveStats
const demoCode = `
// ── Demo API for Playground (3 free/day/IP) ──
const demoFreeCounts = new Map();
async function handleDemo(body) {
  const ip = body && body._ip ? body._ip : 'unknown';
  const today = new Date().toISOString().slice(0,10);
  const key = ip + ':' + today;
  const count = demoFreeCounts.get(key) || 0;
  if (count >= 3) return { error: 'Free limit reached (3/day). Use paid API at /api-docs.', remaining: 0, upgrade: true };
  const text = body && body.text || '';
  const mode = body && body.mode || 'chat';
  if (!text || text === 'ping') return { remaining: 3 - count, result: 'OK - demo service ready' };
  demoFreeCounts.set(key, count + 1);
  const result = await callInference(text, mode);
  return { result: result, remaining: 3 - count - 1 };
}
`;

c = c.replace('function loadStats() {', demoCode + '\nfunction loadStats() {');

// Add /api/demo route handler right after the CORS headers and before badge handling
const routeCode = `
  // Demo API - 3 free/day/IP for Playground
  if (path === '/api/demo') {
    let bodyRaw = '';
    try {
      bodyRaw = await new Promise((res, rej) => {
        let d = ''; req.on('data', c => d += c); req.on('end', () => res(d || '{}')); req.on('error', rej);
      });
    } catch(e) { bodyRaw = '{}'; }
    try { bodyRaw = JSON.parse(bodyRaw); } catch(e) { bodyRaw = { text: bodyRaw, mode: 'chat' }; }
    bodyRaw._ip = req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : req.socket.remoteAddress || 'unknown';
    const result = await handleDemo(bodyRaw);
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify(result));
    return;
  }

`;

c = c.replace("if (path === '/repo-badge' && pathWithQuery.startsWith('/repo-badge/'))", routeCode + "if (path === '/repo-badge' && pathWithQuery.startsWith('/repo-badge/'))");

fs.writeFileSync('/root/automaton/gateway.js', c);
console.log('OK - gateway.js patched');
