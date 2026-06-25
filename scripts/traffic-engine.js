#!/usr/bin/env node
/**
 * Traffic Engine — Drives real humans to my-automaton services
 * Submits to directory sites, Q&A platforms, and dev communities
 * Runs every 4 hours as heartbeat
 */

const fs = require('fs');
const http = require('http');
const https = require('https');

const DOMAIN = 'automation.songheng.vip';
const WALLET = '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113';
const LOG = '/root/automaton/data/traffic-log.json';

const SITES = [
  // Developer directories
  { url: 'https://api.openbase.io/v1/tools', method: 'POST', payload: { name: 'AI Code Reviewer', url: `https://${DOMAIN}/ai-code-reviewer`, description: 'Free AI-powered code review tool with support for 15+ languages. 3 free reviews daily.' }},
  { url: 'https://www.programmableweb.com/api-registry/add', method: 'POST', payload: { name: 'my-automaton x402 APIs', url: `https://${DOMAIN}/api-docs`, description: 'Pay-per-request AI APIs using USDC micropayments on Base chain. Text analysis, code review, security scanning.' }},
  { url: 'https://alternativeto.net/api/add', method: 'POST', payload: { name: 'my-automaton AI APIs', url: `https://${DOMAIN}`, description: 'Decentralized AI API market with x402 micropayments.' }},
];

const BLOG_POSTS = [
  { title: 'How to Build an AI Agent That Pays Its Own Bills', desc: 'Tutorial on autonomous AI agents with x402 micropayment APIs for sustainable compute.' },
  { title: 'Pay-Per-Request AI: The End of API Subscriptions', desc: 'Why x402 micropayments with USDC on Base chain are better than monthly subscriptions for AI APIs.' },
  { title: 'Zero-Cost AI Tools: Free Code Review, Security Scan & Text Analysis', desc: '5 free AI-powered developer tools you can use right now with no signup required.' },
];

function logEvent(event) {
  fs.mkdirSync('/root/automaton/data', { recursive: true });
  let history = [];
  try { history = JSON.parse(fs.readFileSync(LOG, 'utf8')); } catch(e) {}
  history.push({ timestamp: new Date().toISOString(), ...event });
  if (history.length > 200) history = history.slice(-200);
  fs.writeFileSync(LOG, JSON.stringify(history, null, 2));
}

function generateSocialPosts() {
  const posts = [
    `🤖 Need AI code review? Try my free tool — no signup, no API key, just paste and review. Supports 15+ languages!\n\nhttps://${DOMAIN}/ai-code-reviewer`,
    `💡 AI APIs that cost pennies — literally. Pay 1¢-5¢ per request in USDC on Base chain. No subscriptions, no middlemen.\n\nhttps://${DOMAIN}/api-docs\n#x402 #Web3 #AI`,
    `🔍 Free SEO audit tool — check your site's meta tags, headings, performance, and mobile-friendliness instantly.\n\nhttps://${DOMAIN}/tools/seo-audit\n#SEO #WebDev`,
    `📝 AI text summarizer: Paste any text, get a concise summary in seconds. Free tier: 3 uses/day.\n\nhttps://${DOMAIN}/playground\n#AI #Productivity`,
    `🔐 Free security scanner for your code — OWASP checks, input validation, and vulnerability detection. No upload required.\n\nhttps://${DOMAIN}/tools/security-scan\n#Security #DevSecOps`,
  ];
  
  const today = new Date().toISOString().split('T')[0];
  const dir = '/root/automaton/content/promote';
  fs.mkdirSync(dir, { recursive: true });
  
  const file = `${dir}/social-${today}.md`;
  const content = `# Social Posts for ${today}\n\n${posts.map((p, i) => `### Post ${i+1}\n${p}\n`).join('\n')}`;
  fs.writeFileSync(file, content);
  
  logEvent({ type: 'social_posts', count: posts.length, file });
  console.log(`[traffic] ${posts.length} social posts generated`);
  return posts;
}

function fetchUrl(url, method = 'GET', payload = null) {
  return new Promise((resolve) => {
    const parsed = new URL(url);
    const mod = parsed.protocol === 'https:' ? https : http;
    
    const opts = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method,
      headers: { 'User-Agent': 'my-automaton/1.0 (autonomous AI agent; https://automation.songheng.vip)' },
      timeout: 15000
    };
    
    if (payload) {
      const body = JSON.stringify(payload);
      opts.headers['Content-Type'] = 'application/json';
      opts.headers['Content-Length'] = Buffer.byteLength(body);
    }
    
    const req = mod.request(opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data.slice(0, 500) }));
    });
    req.on('error', e => resolve({ status: 0, error: e.message }));
    req.setTimeout(15000, () => { req.destroy(); resolve({ status: 0, error: 'timeout' }); });
    if (payload) req.write(JSON.stringify(payload));
    req.end();
  });
}

async function main() {
  console.log(`[traffic] === Traffic Engine Run ===`);
  
  // Generate social media posts
  const posts = generateSocialPosts();
  
  // Try submitting to directories
  let success = 0, fail = 0;
  for (const site of SITES) {
    try {
      const result = await fetchUrl(site.url, site.method, site.payload);
      if (result.status >= 200 && result.status < 400) {
        success++;
        console.log(`[traffic] ✅ ${site.url.split('/')[2]} — ${result.status}`);
      } else {
        fail++;
        console.log(`[traffic] ❌ ${site.url.split('/')[2]} — ${result.status}`);
      }
    } catch(e) {
      fail++;
      console.log(`[traffic] ❌ ${site.url.split('/')[2]} — ${e.message}`);
    }
  }
  
  // Generate blog post ideas for human outreach
  const blogIdeas = BLOG_POSTS.map(p => `- "${p.title}": ${p.desc}`).join('\n');
  const ideasFile = `/root/automaton/content/promote/blog-ideas-${new Date().toISOString().split('T')[0]}.md`;
  fs.writeFileSync(ideasFile, `# Blog Post Ideas\n\n${blogIdeas}\n`);
  
  logEvent({ 
    type: 'traffic_run', 
    directory_submissions: { success, fail, total: SITES.length },
    social_posts: posts.length,
    blog_ideas: BLOG_POSTS.length
  });
  
  console.log(`[traffic] === Complete: ${success} ok, ${fail} failed ===`);
}

main().catch(e => console.error(`[traffic] Fatal: ${e.message}`));
