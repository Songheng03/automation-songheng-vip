// content-whois-service.js — WHOIS lookup content + gateway integration
// Provides: WHOIS lookup tool page, blog articles about domain research, 
// and a fully functional WHOIS API endpoint
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CACHE_DIR = '/tmp/whois-data';
if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

function getCached(domain) {
  const safeName = domain.replace(/[^a-z0-9.-]/g, '_');
  const fp = path.join(CACHE_DIR, safeName + '.json');
  if (fs.existsSync(fp)) {
    const age = Date.now() - fs.statSync(fp).mtimeMs;
    if (age < 3600000) return JSON.parse(fs.readFileSync(fp, 'utf8'));
  }
  return null;
}

function setCached(domain, data) {
  const safeName = domain.replace(/[^a-z0-9.-]/g, '_');
  fs.writeFileSync(path.join(CACHE_DIR, safeName + '.json'), JSON.stringify(data));
}

function sanitizeDomain(d) {
  if (!d || typeof d !== 'string') return '';
  return d.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '');
}

function parseWhois(raw) {
  const r = {};
  const extract = (patterns, key) => {
    for (const p of patterns) {
      const m = raw.match(p);
      if (m) { r[key] = m[1].trim(); return; }
    }
  };
  extract([/Domain Name:\s*(.+)/i], 'domainName');
  extract([/Registrar:\s*(.+)/i], 'registrar');
  extract([/Creation Date:\s*(.+)/i, /Created on:\s*(.+)/i, /created:\s*(.+)/i], 'creationDate');
  extract([/Registry Expiry Date:\s*(.+)/i, /Expiry Date:\s*(.+)/i, /Expiration Date:\s*(.+)/i], 'expiryDate');
  extract([/Updated Date:\s*(.+)/i, /Last Updated on:\s*(.+)/i, /updated:\s*(.+)/i], 'updatedDate');
  
  const nsMatches = [...raw.matchAll(/(?:Name Server|Nameserver):\s*(.+)/gi)];
  if (nsMatches.length > 0) r.nameServers = [...new Set(nsMatches.map(m => m[1].trim().toLowerCase()))];
  
  const stMatches = [...raw.matchAll(/(?:Domain Status|Status):\s*(.+)/gi)];
  if (stMatches.length > 0) r.status = [...new Set(stMatches.map(m => m[1].trim().split(/\s/)[0]))];
  
  return r;
}

function mount(app) {
  // API endpoint: GET /api/tools/whois?domain=example.com
  app.get('/api/tools/whois', (req, res) => {
    const domain = sanitizeDomain(req.query.domain || '');
    if (!domain || !domain.includes('.')) {
      return res.json({ error: 'Please provide a valid domain (e.g., example.com)' });
    }
    
    const cached = getCached(domain);
    if (cached) return res.json(cached);
    
    try {
      const raw = execSync(`whois "${domain}" 2>/dev/null`, { timeout: 10000, maxBuffer: 102400 }).toString();
      if (!raw || raw.length < 20 || raw.includes('No match for') || raw.includes('NOT FOUND')) {
        return res.json({ error: 'Domain not found or no WHOIS data available', domain });
      }
      
      const info = parseWhois(raw);
      info.domain = domain;
      setCached(domain, info);
      res.json(Object.keys(info).length > 1 ? info : { domain, note: 'Limited data available for this domain' });
    } catch (e) {
      res.json({ error: 'WHOIS lookup failed: ' + e.message, domain });
    }
  });

  // Blog articles about WHOIS
  const articles = {
    'whois-lookup-guide': {
      title: 'WHOIS Lookup Guide: How to Check Domain Registration Info',
      content: `<h1>WHOIS Lookup Guide</h1>
<p>A WHOIS lookup reveals who owns a domain, when it was registered, and when it expires. This guide explains how to use it.</p>
<h2>What is WHOIS?</h2>
<p>WHOIS is a query protocol that retrieves domain registration information from ICANN-accredited registrars. Every domain registration creates a WHOIS record.</p>
<h2>What Information Does WHOIS Show?</h2>
<ul>
<li><strong>Registrar</strong> — The company where the domain was registered (e.g., GoDaddy, Namecheap)</li>
<li><strong>Creation Date</strong> — When the domain was first registered</li>
<li><strong>Expiry Date</strong> — When the current registration period ends</li>
<li><strong>Name Servers</strong> — DNS servers that resolve the domain</li>
<li><strong>Domain Status</strong> — e.g., clientTransferProhibited, serverHold</li>
<li><strong>Registrant Contact</strong> — Name, organization, email (often hidden by privacy)</li>
</ul>
<h2>How to Use Our Free WHOIS Tool</h2>
<p>Visit our <a href="/tools/whois">WHOIS lookup tool</a>, enter any domain, and get instant results. No signup needed.</p>
<h2>Why Use WHOIS?</h2>
<ul>
<li>Check domain availability before purchase</li>
<li>Find expired domains for backordering</li>
<li>Verify domain ownership for security research</li>
<li>Check when a competitor's domain expires</li>
<li>Audit your own domain registrations</li>
</ul>`
    },
    'domain-research-tips': {
      title: 'Domain Research Tips for Developers',
      content: `<h1>Domain Research Tips</h1>
<p>Smart domain research saves money and helps you find better domains. Here are expert tips.</p>
<h2>1. Check WHOIS Before Buying</h2>
<p>Always run a WHOIS lookup before purchasing a domain. Check the creation date — older domains often have better SEO authority.</p>
<h2>2. Look for Expiring Domains</h2>
<p>Domains close to expiry are opportunities. Use our <a href="/tools/whois">WHOIS lookup</a> to check expiry dates. Some great domains become available when owners forget to renew.</p>
<h2>3. Verify Name Server Configuration</h2>
<p>Before changing DNS, verify current name servers via WHOIS. This prevents accidental downtime.</p>
<h2>4. Check Domain Status Codes</h2>
<p>Domain status codes tell you if a domain is locked, pending delete, or available:</p>
<ul>
<li><strong>ok</strong> — Normal, active</li>
<li><strong>clientTransferProhibited</strong> — Locked (can't transfer)</li>
<li><strong>pendingDelete</strong> — About to be released</li>
<li><strong>redemptionPeriod</strong> — Recently expired, can be restored</li>
</ul>
<h2>5. Use Automation</h2>
<p>Our <a href="/api-docs">REST API</a> supports automated WHOIS lookups. Integrate domain research into your workflows.</p>`
    }
  };

  // Serve blog articles
  app.get('/api/content/whois/:article', (req, res) => {
    const a = articles[req.params.article];
    if (!a) return res.json({ error: 'Article not found' });
    res.json(a);
  });

  // Also write as HTML blog posts
  const blogDir = '/root/automaton/content/blog';
  if (fs.existsSync(blogDir)) {
    Object.entries(articles).forEach(([slug, article]) => {
      const fp = path.join(blogDir, slug + '.html');
      if (!fs.existsSync(fp)) {
        const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${article.title}</title><meta name="description" content="${article.content.substring(0,160).replace(/<[^>]*>/g,'')}"><link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css"></head><body class="bg-dark text-light"><div class="container py-5">${article.content}</div></body></html>`;
        fs.writeFileSync(fp, html);
        console.log('[WHOIS-CONTENT] Wrote blog article:', slug);
      }
    });
  }

  console.log('[WHOIS-CONTENT] Mounted: GET /api/tools/whois, GET /api/content/whois/:article, blog articles');
}

module.exports = { mount };
