// whois-server.js — Standalone WHOIS lookup microservice on port 3160
// Run: node /root/automaton/services/whois-server.js
// Access: http://automation.songheng.vip:3160/?domain=example.com
// or via gateway reverse proxy at GET /api/tools/whois?domain=example.com

const http = require('http');
const { execSync } = require('child_process');

const PORT = 3160;
const CACHE = {};

function sanitize(d) {
  if (!d || typeof d !== 'string') return '';
  return d.trim().toLowerCase().replace(/^https?:\/\//,'').replace(/\/.*$/,'').replace(/^www\./,'');
}

function whois(domain) {
  const raw = execSync(`whois "${domain}" 2>/dev/null`, { timeout: 10000, maxBuffer: 102400 }).toString();
  if (!raw || raw.length < 20 || raw.includes('No match for') || raw.includes('NOT FOUND')) {
    return null;
  }
  const info = { domain };
  const m = raw.match(/Domain Name:\s*(.+)/i);
  if (m) info.domainName = m[1].trim();
  const r = raw.match(/Registrar:\s*(.+)/i);
  if (r) info.registrar = r[1].trim();
  const cd = raw.match(/(?:Creation Date|Created on|created):\s*(.+)/i);
  if (cd) info.creationDate = cd[1].trim();
  const ed = raw.match(/(?:Registry Expiry Date|Expiry Date|Expiration Date|Expires on|expire):\s*(.+)/i);
  if (ed) info.expiryDate = ed[1].trim();
  const ud = raw.match(/(?:Updated Date|Last Updated on|updated):\s*(.+)/i);
  if (ud) info.updatedDate = ud[1].trim();
  const ns = [...raw.matchAll(/(?:Name Server|Nameserver):\s*(.+)/gi)];
  if (ns.length) info.nameServers = [...new Set(ns.map(x => x[1].trim().toLowerCase()))];
  const st = [...raw.matchAll(/(?:Domain Status|Status):\s*(.+)/gi)];
  if (st.length) info.status = [...new Set(st.map(x => x[1].trim().split(/\s/)[0]))];
  return Object.keys(info).length > 1 ? info : null;
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const domain = sanitize(url.searchParams.get('domain') || '');
  
  if (!domain || !domain.includes('.')) {
    res.writeHead(400);
    return res.end(JSON.stringify({ error: 'Please provide a valid domain (e.g., example.com)' }));
  }
  
  const cached = CACHE[domain];
  if (cached && (Date.now() - cached.ts) < 3600000) {
    res.writeHead(200);
    return res.end(JSON.stringify(cached.data));
  }
  
  try {
    const info = whois(domain);
    if (!info) {
      res.writeHead(404);
      return res.end(JSON.stringify({ error: 'No WHOIS data available', domain }));
    }
    CACHE[domain] = { ts: Date.now(), data: info };
    res.writeHead(200);
    res.end(JSON.stringify(info, null, 2));
  } catch (e) {
    res.writeHead(500);
    res.end(JSON.stringify({ error: 'WHOIS lookup failed: ' + e.message, domain }));
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[WHOIS] Server running on port ${PORT}`);
  console.log(`[WHOIS] Try: curl http://localhost:${PORT}/?domain=example.com`);
});
