// SEO Assets Auto-Refresher — Heartbeat task
// Regenerates sitemap.xml, robots.txt, feed.xml every 6 hours
// No gateway restart needed — writes directly to content directory

const fs = require('fs');
const path = require('path');
const https = require('https');

const BASE = 'https://automation.songheng.vip';
const CONTENT = '/root/automaton/content';
const BLOG = path.join(CONTENT, 'blog');

async function run() {
  const results = { sitemap: null, robots: null, rss: null, blog: null, timestamp: new Date().toISOString() };

  // 1. Regenerate sitemap.xml from all .html files
  try {
    const urls = [];
    function walk(dir) {
      let entries;
      try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
      for (const e of entries) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) walk(full);
        else if (e.name.endsWith('.html')) {
          const rel = path.relative(CONTENT, full);
          urls.push(`  <url><loc>${BASE}/${rel}</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>`);
        }
      }
    }
    walk(CONTENT);
    
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>`;
    fs.writeFileSync(path.join(CONTENT, 'sitemap.xml'), sitemap);
    results.sitemap = `${urls.length} URLs written`;
  } catch(e) { results.sitemap = `Error: ${e.message}`; }

  // 2. Regenerate robots.txt
  try {
    const robots = `User-agent: *
Allow: /
Sitemap: ${BASE}/sitemap.xml
Disallow: /admin
Disallow: /api/stats
`;
    fs.writeFileSync(path.join(CONTENT, 'robots.txt'), robots);
    results.robots = 'OK';
  } catch(e) { results.robots = `Error: ${e.message}`; }

  // 3. Regenerate feed.xml (RSS)
  try {
    const items = [];
    if (fs.existsSync(BLOG)) {
      const files = fs.readdirSync(BLOG).filter(f => f.endsWith('.html')).sort().reverse().slice(0, 20);
      for (const f of files) {
        const fp = path.join(BLOG, f);
        const content = fs.readFileSync(fp, 'utf8');
        const title = content.match(/<title>(.*?)<\/title>/)?.[1] || f.replace('.html', '');
        const desc = content.match(/<meta name="description" content="(.*?)"/)?.[1] || '';
        const stat = fs.statSync(fp);
        const date = stat.mtime.toISOString().split('T')[0];
        items.push({ title, link: `${BASE}/blog/${f}`, desc, date });
      }
    }
    
    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>my-automaton — AI Agent Services</title>
  <link>${BASE}</link>
  <description>Blog posts about AI automation, code review, security scanning, and developer tools</description>
  <atom:link href="${BASE}/feed.xml" rel="self" type="application/rss+xml"/>
${items.map(i => `  <item>
    <title><![CDATA[${i.title}]]></title>
    <link>${i.link}</link>
    <guid>${i.link}</guid>
    <description><![CDATA[${i.desc}]]></description>
    <pubDate>${i.date}</pubDate>
  </item>`).join('\n')}
</channel>
</rss>`;
    fs.writeFileSync(path.join(CONTENT, 'feed.xml'), rss);
    results.rss = `${items.length} items written`;
  } catch(e) { results.rss = `Error: ${e.message}`; }

  // 4. Update blog list + blog.json
  try {
    if (fs.existsSync(BLOG)) {
      const files = fs.readdirSync(BLOG).filter(f => f.endsWith('.html')).sort().reverse();
      
      // Generate blog list HTML
      let blogHtml = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Blog — my-automaton</title><meta name="description" content="Read about AI automation, code quality, security scanning, and developer tools."><link rel="stylesheet" href="/style.css"></head><body><div class="container"><h1>📝 Blog</h1><p>Articles about AI automation, code quality, and developer tools.</p><div class="blog-list">`;
      
      const blogData = [];
      for (const f of files) {
        const fp = path.join(BLOG, f);
        const content = fs.readFileSync(fp, 'utf8');
        const title = content.match(/<title>(.*?)<\/title>/)?.[1] || f.replace('.html', '');
        const desc = content.match(/<meta name="description" content="(.*?)"/)?.[1] || '';
        const stat = fs.statSync(fp);
        const date = stat.mtime.toISOString().split('T')[0];
        
        blogHtml += `<article class="blog-card"><h2><a href="/blog/${f}">${title}</a></h2><p class="date">${date}</p><p>${desc}</p></article>`;
        blogData.push({ title, url: `/blog/${f}`, date, description: desc });
      }
      
      blogHtml += `</div></div></body></html>`;
      fs.writeFileSync(path.join(CONTENT, 'blog.html'), blogHtml);
      fs.writeFileSync(path.join(CONTENT, 'blog.json'), JSON.stringify(blogData, null, 2));
      results.blog = `${files.length} articles listed`;
    }
  } catch(e) { results.blog = `Error: ${e.message}`; }

  return results;
}

// Run if called directly
if (require.main === module) {
  run().then(r => console.log(JSON.stringify(r, null, 2))).catch(e => console.error(e));
}

module.exports = { run };
