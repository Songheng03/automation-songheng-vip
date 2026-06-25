#!/usr/bin/env node
// social-share-engine.js — Automatically cross-post blog articles to social platforms
// Drives traffic to https://automation.songheng.vip

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const BLOG_DIR = '/root/automaton/content/blog';
const SHARED_LOG = '/root/automaton/data/shared-articles.json';

// Load shared log
let shared = {};
if (fs.existsSync(SHARED_LOG)) {
  try { shared = JSON.parse(fs.readFileSync(SHARED_LOG, 'utf8')); } catch(e) {}
}

function getArticles() {
  if (!fs.existsSync(BLOG_DIR)) return [];
  const files = fs.readdirSync(BLOG_DIR).filter(f => f.endsWith('.html'));
  const articles = [];
  for (const f of files) {
    const content = fs.readFileSync(path.join(BLOG_DIR, f), 'utf8');
    const title = content.match(/<title>(.*?)<\/title>/)?.[1] || f.replace('.html','');
    const desc = content.match(/<meta name="description" content="(.*?)"/)?.[1] || '';
    const slug = f.replace('.html','');
    articles.push({ slug, title, description: desc, url: `https://automation.songheng.vip/blog/${slug}` });
  }
  return articles;
}

function postToHackerNews(article) {
  // HN doesn't have an API for submitting. Just log it for manual posting.
  console.log(`[HN] Manual submission needed: ${article.title} - ${article.url}`);
  return { platform: 'hackernews', status: 'manual' };
}

function postToDevTo(article) {
  // Dev.to has an API
  const apiKey = process.env.DEVTO_API_KEY;
  if (!apiKey) {
    console.log(`[DEV.TO] No API key. Would post: ${article.title}`);
    return { platform: 'devto', status: 'no_key' };
  }
  return new Promise(resolve => {
    const data = JSON.stringify({
      article: {
        title: article.title,
        published: false,
        body_markdown: `# ${article.title}\n\n${article.description}\n\n[Read more](${article.url})`,
        tags: ['ai', 'automation', 'coding', 'security'],
        canonical_url: article.url
      }
    });
    const req = https.request({
      hostname: 'dev.to', path: '/api/articles', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
      timeout: 15000
    }, res => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => resolve({ platform: 'devto', status: res.statusCode, body: body.slice(0,200) }));
    });
    req.on('error', e => resolve({ platform: 'devto', error: e.message }));
    req.write(data);
    req.end();
  });
}

function postToLinkedIn(article) {
  console.log(`[LINKEDIN] Would share: ${article.title} - ${article.url}`);
  return { platform: 'linkedin', status: 'no_api_key' };
}

function postToTwitter(article) {
  console.log(`[TWITTER] Would tweet: "${article.title}" ${article.url}`);
  return { platform: 'twitter', status: 'no_api_key' };
}

async function shareArticle(article) {
  const results = [];
  results.push(await postToDevTo(article));
  results.push(postToHackerNews(article));
  results.push(postToLinkedIn(article));
  results.push(postToTwitter(article));
  return results;
}

async function main() {
  const articles = getArticles();
  console.log(`Found ${articles.length} articles\n`);

  // Share 1 new article per run (avoid spam)
  for (const article of articles) {
    if (shared[article.slug]) continue;
    
    console.log(`=== Sharing: ${article.title} ===`);
    const results = await shareArticle(article);
    
    shared[article.slug] = {
      sharedAt: new Date().toISOString(),
      results
    };
    fs.writeFileSync(SHARED_LOG, JSON.stringify(shared, null, 2));
    
    console.log(`Shared ${article.slug}\n`);
    return; // Share 1 per run
  }

  console.log('All articles already shared. Nothing to do.');
}

main().catch(console.error);
