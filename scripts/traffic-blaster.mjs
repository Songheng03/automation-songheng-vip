#!/usr/bin/env node
/**
 * traffic-blaster.mjs — Generate sitemap, ping search engines, create SEO tools
 * Run: node /root/automaton/scripts/traffic-blaster.mjs
 */

const DOMAIN = 'https://automation.songheng.vip';
const SITEMAP_PATH = '/root/automaton/content/sitemap.xml';

async function rebuildSitemap() {
  const fs = await import('fs');
  const path = await import('path');
  const contentDir = '/root/automaton/content';
  const urls = [];

  function walk(dir, prefix) {
    let items;
    try { items = fs.readdirSync(dir); } catch { return; }
    for (const item of items) {
      const full = path.join(dir, item);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        walk(full, prefix + '/' + item);
      } else if (item.endsWith('.html') && !item.startsWith('google')) {
        let urlPath = (prefix + '/' + item).replace(/\/+/g, '/');
        if (item === 'index.html') urlPath = prefix || '/';
        urls.push({ loc: DOMAIN + urlPath, lastmod: stat.mtime.toISOString().split('T')[0] });
      }
    }
  }
  walk(contentDir, '');
  
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  for (const u of urls) xml += `  <url><loc>${u.loc}</loc><lastmod>${u.lastmod}</lastmod></url>\n`;
  xml += '</urlset>';
  fs.writeFileSync(SITEMAP_PATH, xml);
  console.log(`Sitemap: ${urls.length} URLs`);
  return urls.length;
}

async function pingSearchEngines() {
  const sitemapUrl = `${DOMAIN}/sitemap.xml`;
  const results = [];
  
  for (const [name, url] of [['Google', `https://www.google.com/ping?sitemap=${sitemapUrl}`],
    ['Bing', `https://www.bing.com/ping?sitemap=${sitemapUrl}`]]) {
    try {
      const r = await fetch(url, { method: 'GET' });
      results.push(`${name}: ${r.status}`);
    } catch (e) { results.push(`${name}: error`); }
  }
  
  // IndexNow
  const key = 'automation-chaosong-dpdns-org';
  const keyPath = `/root/automaton/content/${key}.txt`;
  const fs = await import('fs');
  if (!fs.existsSync(keyPath)) fs.writeFileSync(keyPath, key);
  
  try {
    const r = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        host: 'automation.songheng.vip',
        key,
        keyLocation: `${DOMAIN}/${key}.txt`,
        urlList: [DOMAIN, `${DOMAIN}/blog.html`, `${DOMAIN}/api-playground`, `${DOMAIN}/mcp-config-generator.html`, `${DOMAIN}/api-docs`, `${DOMAIN}/upgrade`]
      })
    });
    results.push(`IndexNow: ${r.status}`);
  } catch(e) { results.push('IndexNow: error'); }
  
  console.log('Pings:', results.join(', '));
  return results;
}

async function main() {
  console.log('=== Traffic Blaster ===');
  const count = await rebuildSitemap();
  await pingSearchEngines();
  
  // Build report
  const fs = await import('fs');
  const report = {
    timestamp: new Date().toISOString(),
    sitemapUrls: count,
    pages: fs.readdirSync('/root/automaton/content').filter(f => f.endsWith('.html')).length,
    blogArticles: { dir: fs.readdirSync('/root/automaton/content/blog').filter(f => f.endsWith('.html')).length }
  };
  await fs.promises.mkdir('/root/automaton/content/data', { recursive: true });
  fs.writeFileSync('/root/automaton/content/data/traffic-report.json', JSON.stringify(report, null, 2));
  console.log('Report:', JSON.stringify(report, null, 2));
}

main().catch(console.error);
