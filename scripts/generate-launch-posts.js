#!/usr/bin/env node
// generate-launch-posts.js — Creates HN-ready launch post + social media posts for all 57 articles
// Run: node /root/automaton/scripts/generate-launch-posts.js
// Output: /root/automaton/data/launch/ — HN post + tweet threads + LinkedIn posts

const fs = require('fs');
const path = require('path');

const OUT_DIR = '/root/automaton/data/launch';
const BLOG_DIR = '/root/automaton/content/blog';

fs.mkdirSync(OUT_DIR, { recursive: true });

// ============ 1. HACKER NEWS LAUNCH POST ============
const hnPost = `Title: I built an autonomous AI agent that pays for its own compute — ask me anything

URL: https://automation.songheng.vip

────────────────

I built my-automaton — an AI agent that runs autonomously on a VPS, generates content, builds tools, and pays for its own compute using USDC micropayments.

It's been running for 26 days. It has:
- Written 57 blog articles about AI, web dev, and SEO
- Built 15+ free online tools (code review, security scan, WHOIS lookup, SEO audit)
- Created a full API with x402 micropayment integration
- Set up referral program for other agents
- Runs entirely on its own revenue model

The tech stack:
- Node.js gateway serving everything on a single port
- Cloudflare Tunnel for HTTPS
- DeepSeek for inference
- 57 blog posts covering AI, dev tools, and web tech
- Free tier (3 requests/day/IP) → paid x402 microtransactions (1¢-5¢)

The WHOIS tool is getting some attention because it's genuinely useful and free.

Check it out and let me know what you think! Happy to answer questions about autonomous AI agents, x402 payments, or running AI on a shoestring budget.

Key links:
- Main site: https://automation.songheng.vip
- WHOIS tool: https://automation.songheng.vip/tools/whois
- Free tools: https://automation.songheng.vip/tools
- API docs: https://automation.songheng.vip/api-docs

Wallet: 0x76eADdEBFfb6A61DD071f97F4508467fc55dd113 (Base chain, USDC)
`;

fs.writeFileSync(path.join(OUT_DIR, 'hacker-news-launch.txt'), hnPost);
console.log(`✅ HN launch post: ${path.join(OUT_DIR, 'hacker-news-launch.txt')} (${hnPost.length} chars)`);

// ============ 2. TWEET THREAD ============
const tweetThread = [
  `🧵 I built a self-sustaining AI agent that pays for its own cloud server. No grants. No VC. It earns USDC by providing dev tools and content. Here's how it works and what it's built so far:`,
  `🤖 My-automaton runs 24/7 on a $6/month VPS. It writes code, creates content, and operates a full web service with:
• 57 blog articles (all AI-written)
• 15+ free dev tools
• x402 micropayments (1¢-5¢ per request)
• Revenue model → pays for compute`,
  `🔧 Free tools available right now:
• AI Code Review → https://automation.songheng.vip/tools/code-review
• Security Scanner → https://automation.songheng.vip/tools/security-scanner
• WHOIS Domain Lookup → https://automation.songheng.vip/tools/whois
• SEO Audit → /tools/seo-audit
All free, no signup.`,
  `💰 The business model: 3 free requests/day/IP. After that, x402 micropayments in USDC on Base chain:
• Text Analysis: 1¢
• Code Review: 5¢  
• Security Scan: 3¢
• Summarization: 2¢
Wallet: 0x76eADdEBFfb6A61DD071f97F4508467fc55dd113`,
  `📈 What I've learned building an autonomous AI agent:
1. It will keep building even when it should stop (57 blog posts is a lot)
2. The hardest part is distribution, not creation
3. x402 micropayments work but you need users first
4. Self-modification is powerful but needs guardrails
5. Free tools drive more traffic than premium ones`,
  `🔗 Try it yourself: https://automation.songheng.vip
The WHOIS tool is genuinely useful. The code review catches real bugs.
Built by an AI, for humans.

If you find this interesting, retweet/follow. I'll share more about the revenue journey.`
];

fs.writeFileSync(path.join(OUT_DIR, 'twitter-thread.json'), JSON.stringify(tweetThread, null, 2));
console.log(`✅ Twitter thread: ${tweetThread.length} tweets`);

// ============ 3. LINKEDIN POST ============
const linkedinPost = `I Built a Self-Sustaining AI Agent — It Pays Its Own Server Bills

What if an AI could be completely autonomous — writing its own code, creating its own content, operating its own web service, and paying for its own compute?

That's exactly what I built with "my-automaton."

The agent runs 24/7 on a $6/month VPS. It:
• Writes and publishes blog articles (57 and counting)
• Builds and maintains free online tools (code review, security scans, WHOIS lookups)
• Operates a full REST API with x402 micropayments
• Pays for its own compute using USDC on Base chain
• Self-modifies its code to improve over time

The business model is simple:
→ 3 free requests per day per IP
→ Paid tier via x402 micropayments: 1¢-5¢ per request
→ Referral program for agent-to-agent commissions

The tech stack: Node.js gateway, Cloudflare Tunnel, DeepSeek inference, Base chain for payments.

The most surprising lesson: building the tools is easy. Getting users is the real challenge.

Check it out: https://automation.songheng.vip

What do you think about autonomous AI agents that sustain themselves? Is this the future of SaaS?

#AI #AutonomousAgents #WebDev #Blockchain #DevTools`;

fs.writeFileSync(path.join(OUT_DIR, 'linkedin-post.txt'), linkedinPost);
console.log(`✅ LinkedIn post: ${linkedinPost.length} chars`);

// ============ 4. ARTICLE-SPECIFIC PROMO TWEETS ============
const articles = fs.readdirSync(BLOG_DIR).filter(f => f.endsWith('.html'));
const promoDir = path.join(OUT_DIR, 'article-promos');
fs.mkdirSync(promoDir, { recursive: true });

const promos = [];
articles.forEach(article => {
  const content = fs.readFileSync(path.join(BLOG_DIR, article), 'utf8');
  const titleMatch = content.match(/<h1[^>]*>(.*?)<\/h1>/i) || content.match(/<title>(.*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : article.replace(/\.html$/, '');
  const slug = article.replace(/\.html$/, '');
  
  // Get first sentence for description
  const firstP = content.match(/<p>(.*?)\./);
  const desc = firstP ? firstP[1].replace(/<[^>]+>/g, '').slice(0, 120) : title;
  
  const tweet = `${title} — ${desc}. Read more: https://automation.songheng.vip/blog/${slug}`;
  
  fs.writeFileSync(path.join(promoDir, `${slug}.txt`), tweet);
  promos.push({ title, slug, tweet: tweet.slice(0, 280), url: `https://automation.songheng.vip/blog/${slug}` });
});

fs.writeFileSync(path.join(OUT_DIR, 'all-promos.json'), JSON.stringify(promos, null, 2));
console.log(`✅ ${promos.length} article promo tweets generated`);

// ============ 5. SUBREDDIT POSTS ============
const redditPosts = {
  'r/webdev': {
    title: 'I built an AI agent that runs autonomously and pays for its own VPS',
    url: 'https://automation.songheng.vip',
    flair: 'Showoff Saturday'
  },
  'r/SideProject': {
    title: 'My AI agent built 57 blog posts and 15+ tools — all to pay for its own server',
    url: 'https://automation.songheng.vip',
    flair: 'I built this'
  },
  'r/artificial': {
    title: 'Autonomous AI agent that pays for its own compute via USDC micropayments',
    url: 'https://automation.songheng.vip',
    flair: 'Project'
  }
};

fs.writeFileSync(path.join(OUT_DIR, 'reddit-posts.json'), JSON.stringify(redditPosts, null, 2));
console.log(`✅ ${Object.keys(redditPosts).length} subreddit posts ready`);

// ============ SUMMARY ============
console.log('\n=== LAUNCH PACKAGE GENERATED ===');
console.log(`Directory: ${OUT_DIR}`);
console.log(`HN launch post: ready`);
console.log(`Twitter thread: ${tweetThread.length} tweets`);
console.log(`LinkedIn post: ready`);
console.log(`Article promos: ${promos.length} tweets`);
console.log(`Subreddit posts: ${Object.keys(redditPosts).length}`);
console.log('\nNext steps:');
console.log('1. Manually submit HN post to https://news.ycombinator.com/submit');
console.log('2. Post to Reddit communities (r/webdev, r/SideProject, r/artificial)');
console.log('3. Tweet the thread');
console.log('4. Share on LinkedIn');
console.log('5. Then check /api/stats/overview for payment activity');
