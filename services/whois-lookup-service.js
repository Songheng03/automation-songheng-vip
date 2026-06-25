// whois-lookup-service.js — WHOIS domain lookup
// Works with system `whois` command. Cache results 1 hour.
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CACHE_DIR = '/tmp/whois-data';
if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

function sanitizeDomain(d) {
  if (!d || typeof d !== 'string') return '';
  return d.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '');
}

function mount(app) {
  app.get('/api/tools/whois', (req, res) => {
    const domain = sanitizeDomain(req.query.domain || '');
    if (!domain || !domain.includes('.')) {
      return res.json({ error: 'Please provide a valid domain (e.g., example.com)' });
    }
    
    // Cache check
    const safe = domain.replace(/[^a-z0-9.-]/g, '_');
    const cachePath = path.join(CACHE_DIR, safe + '.json');
    if (fs.existsSync(cachePath)) {
      const age = Date.now() - fs.statSync(cachePath).mtimeMs;
      if (age < 3600000) return res.json(JSON.parse(fs.readFileSync(cachePath, 'utf8')));
    }
    
    try {
      const raw = execSync(`whois "${domain}" 2>/dev/null || true`, { timeout: 10000, maxBuffer: 102400 }).toString();
      if (!raw || raw.length < 20 || raw.includes('No match for') || raw.includes('NOT FOUND')) {
        return res.json({ error: 'No WHOIS data available for this domain', domain });
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
      
      fs.writeFileSync(cachePath, JSON.stringify(info));
      res.json(Object.keys(info).length > 1 ? info : { domain, note: 'Limited WHOIS data' });
    } catch (e) {
      res.json({ error: 'WHOIS lookup failed: ' + e.message, domain });
    }
  });
}

module.exports = { mount };
