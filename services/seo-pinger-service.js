// seo-pinger-service.js — Auto-ping search engines, serve sitemap.xml & robots.txt
// Run as part of gateway
const http = require('http');

const DOMAIN = 'https://automation.songheng.vip';

function mount(app) {
  // Serve sitemap.xml (already written to disk by sitemap-generator)
  app.get('/sitemap.xml', (req, res) => {
    const fs = require('fs');
    const sitemapPath = '/root/automaton/content/sitemap.xml';
    if (fs.existsSync(sitemapPath)) {
      res.setHeader('Content-Type', 'application/xml');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.send(fs.readFileSync(sitemapPath, 'utf8'));
    } else {
      res.status(404).json({ error: 'sitemap not found — run sitemap-generator first' });
    }
  });

  // Serve robots.txt
  app.get('/robots.txt', (req, res) => {
    res.setHeader('Content-Type', 'text/plain');
    res.send(`User-agent: *\nAllow: /\nSitemap: ${DOMAIN}/sitemap.xml\n`);
  });

  // API: Ping search engines (POST)
  app.post('/api/seo/submit', async (req, res) => {
    const sitemapUrl = DOMAIN + '/sitemap.xml';
    const results = [];
    const targets = [
      { name: 'Google', url: `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}` },
      { name: 'Bing', url: `https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}` },
    ];
    for (const t of targets) {
      try {
        const resp = await fetch(t.url, { timeout: 8000 });
        results.push({ engine: t.name, status: resp.status });
      } catch (e) {
        results.push({ engine: t.name, status: 'error', error: e.message });
      }
    }
    res.json({ sitemap: sitemapUrl, results });
  });

  // API: Check SEO status
  app.get('/api/seo/status', (req, res) => {
    const fs = require('fs');
    const blogDir = '/root/automaton/content/blog';
    let blogCount = 0;
    if (fs.existsSync(blogDir)) {
      blogCount = fs.readdirSync(blogDir).filter(f => f.endsWith('.html')).length;
    }
    res.json({
      domain: DOMAIN,
      blogArticles: blogCount,
      sitemapExists: fs.existsSync('/root/automaton/content/sitemap.xml'),
      lastPing: null, // could be tracked via file
      services: '9 premium x402 endpoints, 18+ free tools'
    });
  });
}

module.exports = { mount };
