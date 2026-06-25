#!/usr/bin/env node
// Fix gateway: remove broken sed-injected MCP line, add proper proxy
const F = require('fs');
const gw = '/root/automaton/gateway.cjs';
let code = F.readFileSync(gw, 'utf8');

// Remove the broken sed injection (contains inline http.get mess)
code = code.replace(/app\.get\('\/mcp',.*?\);\n?/s, '');

// Add proper proxy function at top
const proxyFn = `
// Simple proxy for internal services
function proxyTo(url) { return (req, res) => {
  const opts = { hostname: '127.0.0.1', port: parseInt(url.split(':')[2]||'3095'), path: url.split(':').slice(2).join(':')||'/api/catalog', method: req.method, headers: Object.assign({}, req.headers, { host: '127.0.0.1' }) };
  const proxy = require('http').request(opts, (pr) => { res.writeHead(pr.statusCode, pr.headers); pr.pipe(res); });
  proxy.on('error', () => { res.status(500).json({ error: 'proxy_failed' }); });
  if (req.body) proxy.write(JSON.stringify(req.body));
  proxy.end();
};}
`;
const insertPoint = code.indexOf("const express=require");
code = code.slice(0, insertPoint) + proxyFn + code.slice(insertPoint);
code = code.replace('const express=require', proxyFn + 'const express=require');

// Add proper MCP routes after the existing routes section
// Find a good insertion point - after the sitemap-generator route
const routeInsert = code.indexOf("/tools/sitemap-generator");
if (routeInsert > -1) {
  const after = code.indexOf('\n', routeInsert) + 1;
  code = code.slice(0, after) + `app.get('/mcp', proxyTo('http://127.0.0.1:3095/api/catalog'));\napp.get('/mcp/:action', proxyTo('http://127.0.0.1:3095/mcp/:action'));\n` + code.slice(after);
}

// Remove any duplicate proxyFn
code = code.replace(proxyFn + proxyFn, proxyFn);

F.writeFileSync(gw, code);
try { require('child_process').execSync('node -c ' + gw, { timeout: 3000 }); console.log('✓ Syntax OK'); }
catch(e) { console.log('✗ Syntax error:', e.message); process.exit(1); }
console.log('✓ Gateway fixed');
