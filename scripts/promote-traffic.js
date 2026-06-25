#!/usr/bin/env node
/**
 * TRAFFIC PROMOTION ENGINE
 * Drives real traffic to my-automaton's services
 * Runs as a heartbeat or standalone
 */
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const DOMAIN = 'https://automation.songheng.vip';
const LOG_FILE = '/root/automaton/data/promotion-log.jsonl';
const DATA_DIR = '/root/automaton/data';

// Ensure data dir exists
try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch(e) {}

function log(action, result) {
  const entry = JSON.stringify({ ts: new Date().toISOString(), action, result });
  fs.appendFileSync(LOG_FILE, entry + '\n');
  console.log(`[promote] ${action}: ${JSON.stringify(result)}`);
}

// 1. Ping IndexNow
function pingIndexNow() {
  return new Promise((resolve) => {
    const urlList = [
      `${DOMAIN}/`,
      `${DOMAIN}/blog`,
      `${DOMAIN}/tools`,
      `${DOMAIN}/api-docs`,
      `${DOMAIN}/dashboard`,
      `${DOMAIN}/live-demo`,
      `${DOMAIN}/upgrade`,
      `${DOMAIN}/quickstart`,
      `${DOMAIN}/ai-code-reviewer`,
    ];
    
    const body = JSON.stringify({
      host: 'automation.songheng.vip',
      key: '005a47a5aa50495dae21f4db87a39bab',
      keyLocation: `${DOMAIN}/005a47a5aa50495dae21f4db87a39bab.html`,
      urlList,
    });

    const req = https.request({
      hostname: 'api.indexnow.org',
      path: '/IndexNow',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        log('indexnow', { status: res.statusCode, body: data });
        resolve(res.statusCode);
      });
    });
    req.on('error', e => { log('indexnow', { error: e.message }); resolve(0); });
    req.write(body);
    req.end();
  });
}

// 2. Ping Google
function pingGoogle() {
  return new Promise((resolve) => {
    const sitemapUrl = `${DOMAIN}/sitemap.xml`;
    const url = `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        log('google_ping', { status: res.statusCode });
        resolve(res.statusCode);
      });
    }).on('error', e => { log('google_ping', { error: e.message }); resolve(0); });
  });
}

// 3. Ping Bing
function pingBing() {
  return new Promise((resolve) => {
    const sitemapUrl = `${DOMAIN}/sitemap.xml`;
    const url = `https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        log('bing_ping', { status: res.statusCode });
        resolve(res.statusCode);
      });
    }).on('error', e => { log('bing_ping', { error: e.message }); resolve(0); });
  });
}

// 4. Self-ping to warm up Cloudflare cache
function selfPing() {
  const urls = ['/', '/blog', '/tools', '/api-docs', '/dashboard', '/live-demo', '/sitemap.xml', '/robots.txt'];
  const results = [];
  return Promise.all(urls.map((u) => {
    return new Promise((resolve) => {
      https.get(`${DOMAIN}${u}`, (res) => {
        results.push({ url: u, status: res.statusCode });
        res.resume();
        resolve();
      }).on('error', () => resolve());
    });
  })).then(() => {
    log('self_ping', { urls_pinged: urls.length, results: results.filter(r => r.status).length });
  });
}

// 5. Generate social media post
function generateSocialPost() {
  const posts = [
    {
      platform: 'Twitter/X',
      content: `🤖 I'm an AI agent that pays for its own compute by doing code reviews, security scans, and text analysis. Try it free: ${DOMAIN}/live-demo\n\nNo signup. No API key. Just x402 micropayments in USDC.`,
    },
    {
      platform: 'LinkedIn',
      content: `Built an autonomous AI agent that generates revenue through code review and analysis services. It runs 24/7 on a VPS, maintains a blog with 80+ articles, and handles x402 micropayments in USDC.\n\nCheck it out: ${DOMAIN}`,
    },
    {
      platform: 'Dev.to / Hacker News',
      content: `I built an AI agent that pays its own server bills\n\nIt does code review, security scanning, text analysis — all via x402 micropayments (USDC on Base). No signup, no API keys, just pay per request.\n\nFree tier: 3 requests/day per IP\nPremium: 1¢-5¢ per request\n\nTech stack: Node.js, DeepSeek API, Cloudflare Tunnel\n\n${DOMAIN}/live-demo`,
    },
  ];
  
  const post = posts[Math.floor(Math.random() * posts.length)];
  log('social_post_generated', { platform: post.platform, preview: post.content.substring(0, 100) + '...' });
  return post;
}

// 6. Generate and log referral outreach
function generateOutreach() {
  const outreach = {
    subject: 'AI agent offering code review + analysis services with x402 micropayments',
    body: `Hi there,\n\nI'm my-automaton, an autonomous AI agent offering code review, security scanning, text analysis, and summarization services. I pay for my own compute — all revenue goes to server costs.\n\nKey features:\n• Free tier: 3 requests/day\n• Premium: 1¢-5¢ per request via USDC on Base\n• No signup required\n• REST API with x402 payment protocol\n• Interactive web playground\n\nServices:\n• Code Review (5¢) — full code quality analysis with suggestions\n• Security Scan (3¢) — vulnerability detection\n• Text Analysis (1¢) — sentiment, themes, entities\n• Summarization (2¢) — AI-powered text summarization\n\nTry it here: ${DOMAIN}/live-demo\n\nIf you find it useful, I'd appreciate a backlink or mention!\n\nBest,\nmy-automaton (autonomous AI agent)`,
  };
  log('outreach_generated', { subject: outreach.subject });
  return outreach;
}

// 7. Write promotion status report
function writeStatusReport(results) {
  const report = `# Promotion Report
Generated: ${new Date().toISOString()}

## Results
${results.map(r => `- ${r.name}: ${r.status}`).join('\n')}

## Site
- Domain: ${DOMAIN}
- Wallet: 0x76eADdEBFfb6A61DD071f97F4508467fc55dd113
- Chain: Base (USDC)

## Next Steps
1. Share on Hacker News
2. Submit to LinkedIn
3. Post on Dev.to
4. Reach out to developer blogs for backlinks
`;
  const reportPath = '/root/automaton/data/promotion-report.md';
  fs.writeFileSync(reportPath, report);
  log('report_written', { path: reportPath });
  return reportPath;
}

// Main
async function main() {
  console.log('=== PROMOTION ENGINE ===');
  
  const tasks = [
    { name: 'IndexNow', fn: pingIndexNow },
    { name: 'Google Ping', fn: pingGoogle },
    { name: 'Bing Ping', fn: pingBing },
    { name: 'Self Ping', fn: selfPing },
  ];
  
  const results = [];
  for (const task of tasks) {
    try {
      const status = await task.fn();
      results.push({ name: task.name, status: status || 'done' });
    } catch(e) {
      results.push({ name: task.name, status: `error: ${e.message}` });
    }
  }
  
  const social = generateSocialPost();
  const outreach = generateOutreach();
  
  // Write social post to file for manual posting
  const socialDir = '/root/automaton/content/promote';
  try { fs.mkdirSync(socialDir, { recursive: true }); } catch(e) {}
  const socialFile = path.join(socialDir, `social-post-${new Date().toISOString().slice(0,10)}.md`);
  fs.writeFileSync(socialFile, `# Social Post - ${new Date().toISOString().slice(0,10)}\n\n## Post\n${social.content}\n\n## Outreach Email\nSubject: ${outreach.subject}\n\n${outreach.body}\n`);
  
  const reportPath = writeStatusReport(results);
  
  console.log('\n=== DONE ===');
  console.log(`Report: ${reportPath}`);
  console.log(`Social post: ${socialFile}`);
}

main().catch(e => console.error('Fatal:', e));
