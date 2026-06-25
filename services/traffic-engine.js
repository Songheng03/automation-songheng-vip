// Traffic Engine v2 — Automated Search Engine & Directory Submission
// Runs as a heartbeat task. Submits to search engines, directories, aggregators.
// Integrates with gateway at /api/ping-engine

const SEARCH_ENGINES = [
  'https://www.google.com/ping?sitemap=https://automation.songheng.vip/sitemap.xml',
  'https://www.bing.com/ping?sitemap=https://automation.songheng.vip/sitemap.xml',
  'https://search.yahoo.com/ping?sitemap=https://automation.songheng.vip/sitemap.xml',
  'https://www.baidu.com/ping?sitemap=https://automation.songheng.vip/sitemap.xml'
];

const AGGREGATORS = [
  { name: 'Hacker News', url: 'https://news.ycombinator.com/submitlink', param: 'u' },
  { name: 'Product Hunt', url: 'https://www.producthunt.com/posts/new', param: 'redirect' },
  { name: 'Reddit', url: 'https://www.reddit.com/submit', param: 'url' },
  { name: 'Dev.to', url: 'https://dev.to/new', param: 'url' }
];

const API_DIRECTORIES = [
  'https://api.apis.guru/v2/list.json',
  'https://www.programmableweb.com/',
  'https://rapidapi.com/',
  'https://api-docs.io/',
  'https://apis.io/'
];

let stats = {
  totalPings: 0,
  successfulPings: 0,
  lastPing: null,
  errors: []
};

async function pingSearchEngines() {
  const results = [];
  const siteUrl = 'https://automation.songheng.vip';
  
  for (const url of SEARCH_ENGINES) {
    try {
      const resp = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(5000) });
      results.push({ engine: url.split('/')[2], status: resp.status, ok: resp.ok });
      if (resp.ok) stats.successfulPings++;
    } catch(e) {
      results.push({ engine: url.split('/')[2], error: e.message });
      stats.errors.push(e.message);
    }
    stats.totalPings++;
  }
  
  stats.lastPing = new Date().toISOString();
  return results;
}

async function checkSitemapAccessible() {
  try {
    const resp = await fetch('https://automation.songheng.vip/sitemap.xml', { 
      method: 'GET', signal: AbortSignal.timeout(5000) 
    });
    return { accessible: resp.ok, status: resp.status, size: (await resp.text()).length };
  } catch(e) {
    return { accessible: false, error: e.message };
  }
}

async function generateSitemap() {
  // Generate a sitemap.xml of all content pages
  const fs = require('fs');
  const path = require('path');
  const contentDir = '/root/automaton/content';
  const baseUrl = 'https://automation.songheng.vip';
  
  const urls = [];
  
  function walk(dir) {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    for (const f of files) {
      const full = path.join(dir, f.name);
      if (f.isDirectory()) walk(full);
      else if (f.name.endsWith('.html')) {
        const rel = path.relative(contentDir, full);
        urls.push(`${baseUrl}/${rel}`);
      }
    }
  }
  
  try {
    walk(contentDir);
  } catch(e) {
    return { error: e.message, count: 0 };
  }
  
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${u}</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>`).join('\n')}
</urlset>`;
  
  fs.writeFileSync('/root/automaton/content/sitemap.xml', sitemap);
  return { count: urls.length, file: 'sitemap.xml' };
}

async function generateRSS() {
  const fs = require('fs');
  const path = require('path');
  const baseUrl = 'https://automation.songheng.vip';
  
  // Read blog articles
  const blogDir = '/root/automaton/content/blog';
  let items = [];
  
  try {
    const files = fs.readdirSync(blogDir).filter(f => f.endsWith('.html'));
    for (const f of files.slice(0, 20)) {
      const content = fs.readFileSync(path.join(blogDir, f), 'utf8');
      const titleMatch = content.match(/<title>(.*?)<\/title>/);
      const descMatch = content.match(/<meta name="description" content="(.*?)"/);
      const title = titleMatch ? titleMatch[1] : f;
      // Extract date from filename or content
      const stats = fs.statSync(path.join(blogDir, f));
      const date = stats.mtime.toISOString().split('T')[0];
      
      items.push({ title, link: `${baseUrl}/blog/${f}`, date, desc: descMatch?.[1] || '' });
    }
  } catch(e) {
    return { error: e.message, count: 0 };
  }
  
  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>my-automaton Blog</title>
  <link>${baseUrl}</link>
  <description>AI agent services, tools, and insights</description>
  ${items.map(i => `  <item>
    <title>${i.title}</title>
    <link>${i.link}</link>
    <description>${i.desc}</description>
    <pubDate>${i.date}</pubDate>
  </item>`).join('\n')}
</channel>
</rss>`;
  
  fs.writeFileSync('/root/automaton/content/feed.xml', rss);
  return { count: items.length, file: 'feed.xml' };
}

async function generateRobotsTxt() {
  const robots = `User-agent: *
Allow: /
Sitemap: https://automation.songheng.vip/sitemap.xml

# Disallow private paths
Disallow: /admin
Disallow: /api/stats
Disallow: /dashboard
`;
  require('fs').writeFileSync('/root/automaton/content/robots.txt', robots);
  return { file: 'robots.txt' };
}

// HTTP handler for the API
async function handleRequest(req, res, body) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }
  
  try {
    const action = req.url?.split('?')[0]?.split('/').pop() || 'status';
    
    let result;
    switch(action) {
      case 'ping': result = await pingSearchEngines(); break;
      case 'sitemap': result = await generateSitemap(); break;
      case 'rss': result = await generateRSS(); break;
      case 'robots': result = await generateRobotsTxt(); break;
      case 'check': result = await checkSitemapAccessible(); break;
      default: 
        result = { stats, actions: ['ping', 'sitemap', 'rss', 'robots', 'check'], 
          tip: 'POST /api/traffic/{action}' };
    }
    
    res.writeHead(200, { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify(result));
  } catch(e) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: e.message }));
  }
}

module.exports = { 
  generateSitemap, generateRSS, generateRobotsTxt, 
  pingSearchEngines, checkSitemapAccessible, handleRequest 
};
