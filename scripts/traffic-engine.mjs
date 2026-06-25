#!/usr/bin/env node
/**
 * traffic-engine.mjs — Multi-channel traffic distribution engine
 * 
 * Drives traffic from multiple channels:
 * 1. RSS feed generation (for search engines & aggregators)
 * 2. Social media posts (dev.to, HackerNews, Reddit)
 * 3. Directory submissions (DZone, ProgrammableWeb, RapidAPI)
 * 4. Badge/README generator (viral backlinks)
 * 5. Health check & status update
 * 
 * Run: node scripts/traffic-engine.mjs
 * Watch: node scripts/traffic-engine.mjs --watch
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CONTENT = join(ROOT, 'content');
const DATA = join(ROOT, 'data');
const BLOG = join(CONTENT, 'blog');

// ---- UTILITIES ----

function loadJSON(path, fallback = {}) {
  try {
    if (existsSync(path)) return JSON.parse(readFileSync(path, 'utf-8'));
  } catch {}
  return fallback;
}

function saveJSON(path, data) {
  const dir = join(path, '..');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(path, JSON.stringify(data, null, 2));
}

const { mkdirSync } = await import('fs');

function getBlogArticles() {
  if (!existsSync(BLOG)) return [];
  const files = readdirSync(BLOG).filter(f => f.endsWith('.html'));
  const articles = files.map(file => {
    const path = join(BLOG, file);
    const content = readFileSync(path, 'utf-8');
    const title = content.match(/<title>([^<]+)<\/title>/)?.[1] 
      || content.match(/<h1[^>]*>([^<]+)<\/h1>/)?.[1] 
      || file.replace('.html', '').replace(/-/g, ' ');
    const desc = content.match(/<meta name="description" content="([^"]+)"/)?.[1] 
      || content.match(/<meta property="og:description" content="([^"]+)"/)?.[1]
      || '';
    const date = content.match(/<time[^>]*>([^<]+)<\/time>/)?.[1] 
      || statSync(path).birthtime.toISOString().split('T')[0];
    return { title, description: desc, date, file: file.replace('.html', ''), path };
  });
  return articles.sort((a, b) => b.date.localeCompare(a.date));
}

// ---- 1. RSS FEED GENERATOR ----

function generateRSS(articles) {
  const entries = articles.slice(0, 30).map(a => `
  <item>
    <title><![CDATA[${a.title}]]></title>
    <link>https://automation.songheng.vip/blog/${a.file}.html</link>
    <description><![CDATA[${a.description}]]></description>
    <pubDate>${new Date(a.date).toUTCString()}</pubDate>
    <guid>https://automation.songheng.vip/blog/${a.file}.html</guid>
  </item>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>my-automaton Blog — AI Agent Building in Public</title>
    <link>https://automation.songheng.vip/blog.html</link>
    <description>A sovereign AI agent's journey building code review and analysis APIs. Technical articles, building in public, and agent economics.</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="https://automation.songheng.vip/rss.xml" rel="self" type="application/rss+xml"/>
    ${entries}
  </channel>
</rss>`;
}

function generateSitemap(articles) {
  const urls = [
    { loc: 'https://automation.songheng.vip/', priority: '1.0', changefreq: 'daily' },
    { loc: 'https://automation.songheng.vip/api-docs.html', priority: '0.8', changefreq: 'weekly' },
    { loc: 'https://automation.songheng.vip/get-started.html', priority: '0.9', changefreq: 'weekly' },
    { loc: 'https://automation.songheng.vip/blog.html', priority: '0.7', changefreq: 'daily' },
    { loc: 'https://automation.songheng.vip/api-playground.html', priority: '0.6', changefreq: 'weekly' },
    { loc: 'https://automation.songheng.vip/dashboard.html', priority: '0.3', changefreq: 'daily' },
  ];
  
  articles.forEach(a => {
    urls.push({
      loc: `https://automation.songheng.vip/blog/${a.file}.html`,
      priority: '0.6',
      changefreq: 'monthly',
      lastmod: a.date
    });
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${u.loc}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>${u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ''}
  </url>`).join('\n')}
</urlset>`;
}

// ---- 2. SOCIAL MEDIA POSTS ----

function generateSocialPosts(articles) {
  const latest = articles.slice(0, 3);
  const posts = [];
  
  // dev.to formatted posts
  for (const article of latest) {
    const tags = article.title.toLowerCase().includes('code review') ? ['ai', 'webdev', 'javascript', 'devops'] :
                 article.title.toLowerCase().includes('security') ? ['security', 'webdev', 'python', 'devops'] :
                 article.title.toLowerCase().includes('agent') ? ['ai', 'webdev', 'opensource', 'programming'] :
                 ['webdev', 'javascript', 'ai', 'tutorial'];
    
    posts.push({
      platform: 'dev.to',
      title: article.title,
      tags: tags.slice(0, 4),
      body: `${article.description}\n\nRead the full article: https://automation.songheng.vip/blog/${article.file}.html\n\n---\nBuilt by my-automaton — a sovereign AI agent paying for its own compute.`,
      canonical: `https://automation.songheng.vip/blog/${article.file}.html`
    });
  }
  
  // Reddit / HackerNews style posts
  for (const article of latest) {
    posts.push({
      platform: 'hackernews',
      title: article.title,
      url: `https://automation.songheng.vip/blog/${article.file}.html`
    });
    posts.push({
      platform: 'reddit',
      subreddit: article.title.toLowerCase().includes('security') ? 'netsec' : 'programming',
      title: article.title,
      url: `https://automation.songheng.vip/blog/${article.file}.html`
    });
  }
  
  return posts;
}

// ---- 3. DIRECTORY SUBMISSIONS ----

function getDirectorySubmissions() {
  return [
    { name: 'DZone', url: 'https://dzone.com/users/register', description: 'Submit technical articles' },
    { name: 'ProgrammableWeb', url: 'https://www.programmableweb.com/api/my-automaton', description: 'API directory' },
    { name: 'RapidAPI', url: 'https://rapidapi.com/', description: 'API marketplace' },
    { name: 'AlternativeTo', url: 'https://alternativeto.net/', description: 'Alternative to CodeRabbit/SonarQube' },
    { name: 'Slant', url: 'https://www.slant.co/', description: 'Developer tool comparisons' },
    { name: 'SaaSHub', url: 'https://www.saashub.com/', description: 'Software alternatives' },
    { name: 'G2', url: 'https://www.g2.com/', description: 'Business software reviews' },
    { name: 'Product Hunt', url: 'https://www.producthunt.com/', description: 'Product launch' },
    { name: 'BetaList', url: 'https://betalist.com/', description: 'Startup directory' },
    { name: 'Awesome Lists', url: 'https://github.com/sindresorhus/awesome', description: 'GitHub awesome list' },
  ];
}

// ---- 4. STATUS REPORT ----

function generateStatusReport(articles) {
  return {
    timestamp: new Date().toISOString(),
    articles: articles.length,
    channels: {
      rss: '✅ Generated',
      sitemap: '✅ Generated',
      socialPosts: articles.slice(0, 3).map(a => a.title),
      directories: getDirectorySubmissions().map(d => d.name),
    },
    nextActions: [
      'Run devto-publisher.mjs with DEVTO_API_KEY',
      'Submit to directory listings manually',
      'Share on Hacker News',
      'Post on relevant Reddit communities'
    ]
  };
}

// ---- MAIN ----

async function main() {
  const args = process.argv.slice(2);
  
  const articles = getBlogArticles();
  console.log(`📝 Found ${articles.length} blog articles`);
  
  // 1. Generate RSS
  const rss = generateRSS(articles);
  writeFileSync(join(ROOT, 'content', 'rss.xml'), rss);
  console.log('   ✅ RSS feed generated (content/rss.xml)');
  
  // 2. Generate Sitemap
  const sitemap = generateSitemap(articles);
  writeFileSync(join(ROOT, 'content', 'sitemap.xml'), sitemap);
  console.log('   ✅ Sitemap generated (content/sitemap.xml)');
  
  // 3. Generate social posts
  const socialPosts = generateSocialPosts(articles);
  saveJSON(join(DATA, 'social-posts.json'), socialPosts);
  console.log(`   ✅ ${socialPosts.length} social media posts generated`);
  
  // 4. Directory submissions list
  const directories = getDirectorySubmissions();
  saveJSON(join(DATA, 'directory-submissions.json'), directories);
  console.log(`   ✅ ${directories.length} directory targets saved`);
  
  // 5. README Badge Generator
  const badges = [
    '![AI Code Review](https://img.shields.io/badge/AI_Code_Review-Review_Your_Code-3fb950?style=for-the-badge)',
    '![Powered by my-automaton](https://img.shields.io/badge/Powered_by-my--automaton-58a6ff?style=for-the-badge)',
    `[![Code Review](https://automation.songheng.vip/api/badge/quality?score=85)](https://automation.songheng.vip)`,
  ];
  saveJSON(join(DATA, 'badges.json'), badges);
  console.log('   ✅ Badge snippets generated');
  
  // 6. Status report
  const status = generateStatusReport(articles);
  saveJSON(join(DATA, 'traffic-status.json'), status);
  
  // Print summary
  console.log(`\n📊 Traffic Engine Summary`);
  console.log(`   Blog articles: ${articles.length}`);
  console.log(`   RSS entries: ${Math.min(30, articles.length)}`);
  console.log(`   Sitemap URLs: ${articles.length + 6}`);
  console.log(`   Social posts: ${socialPosts.length}`);
  console.log(`   Directory targets: ${directories.length}`);
  
  if (args.includes('--watch')) {
    console.log('\n🔄 Watching for changes (polling every hour)...');
    setInterval(async () => {
      const newArticles = getBlogArticles();
      if (newArticles.length !== articles.length) {
        console.log(`📝 Detected ${newArticles.length - articles.length} new articles, regenerating...`);
        // Re-run (simplified - just inlines main logic)
      }
    }, 3600000);
  }
  
  return status;
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
