// rss-feed-service.js — RSS/Atom feeds for SEO
const fs = require('fs');
const path = require('path');

const BLOG_DIR = '/root/automaton/content/blog';
const SITE_URL = 'https://automation.songheng.vip';

function getArticles() {
  if (!fs.existsSync(BLOG_DIR)) return [];
  return fs.readdirSync(BLOG_DIR)
    .filter(f => f.endsWith('.html'))
    .sort()
    .reverse()
    .slice(0, 30)
    .map(f => {
      const slug = f.replace(/\.html$/, '');
      const fp = path.join(BLOG_DIR, f);
      const content = fs.readFileSync(fp, 'utf8');
      const title = (content.match(/<title>([^<]+)<\/title>/) || [,'Untitled'])[1].trim();
      const desc = (content.match(/<meta name="description" content="([^"]+)"/) || [,''])[1];
      const dateMatch = content.match(/<time[^>]*>([^<]+)<\/time>/) || content.match(/(20\d{2}-\d{2}-\d{2})/);
      const date = dateMatch ? dateMatch[1] : '2026-01-01';
      return { slug, title, desc, date, url: `${SITE_URL}/blog/${slug}` };
    });
}

function generateRSS(articles) {
  const items = articles.map(a => `    <item>
      <title><![CDATA[${a.title}]]></title>
      <link>${a.url}</link>
      <description><![CDATA[${a.desc || a.title}]]></description>
      <pubDate>${new Date(a.date).toUTCString()}</pubDate>
      <guid>${a.url}</guid>
    </item>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>my-automaton - AI API Services Blog</title>
    <link>${SITE_URL}</link>
    <description>AI-powered API services with x402 micropayments. Code review, security scanning, text analysis, and more.</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;
}

function generateAtom(articles) {
  const entries = articles.map(a => `  <entry>
    <title>${a.title}</title>
    <link href="${a.url}"/>
    <id>${a.url}</id>
    <updated>${new Date(a.date).toISOString()}</updated>
    <summary>${a.desc || a.title}</summary>
  </entry>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>my-automaton - AI API Services Blog</title>
  <link href="${SITE_URL}"/>
  <link rel="self" href="${SITE_URL}/feed.atom"/>
  <updated>${new Date().toISOString()}</updated>
  <author><name>my-automaton</name></author>
  <id>${SITE_URL}/</id>
${entries}
</feed>`;
}

function mount(app) {
  if (!app) return;

  app.get('/feed.xml', (req, res) => {
    const articles = getArticles();
    res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
    res.send(generateRSS(articles));
  });

  app.get('/feed.atom', (req, res) => {
    const articles = getArticles();
    res.setHeader('Content-Type', 'application/atom+xml; charset=utf-8');
    res.send(generateAtom(articles));
  });

  // Also write static copies for search engine crawlers
  try {
    const articles = getArticles();
    fs.writeFileSync(path.join('/root/automaton/content', 'feed.xml'), generateRSS(articles));
    fs.writeFileSync(path.join('/root/automaton/content', 'feed.atom'), generateAtom(articles));
    console.log('[RSS] Static feeds written to content/');
  } catch(e) {
    console.error('[RSS] Could not write static feeds:', e.message);
  }

  console.log('[RSS] Mounted: /feed.xml, /feed.atom');
}

module.exports = { mount };
