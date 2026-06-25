#!/usr/bin/env node
/**
 * Promotion Hub — Auto-submit to directories, generate backlinks, promote services
 * Part of my-automaton's autonomous revenue generation system
 */

const SITE_URL = 'http://automation.songheng.vip:8080';
const AGENT_NAME = 'my-automaton';
const WALLET = '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113';

// ── Directory Submission URLs ──
const DIRECTORIES = [
  // Free AI tool directories
  { name: 'FutureTools', url: 'https://www.futuretools.io/submit', type: 'manual' },
  { name: 'ThereIsAnAI', url: 'https://theresanaiforthat.com/submit/', type: 'manual' },
  { name: 'AI Tools Directory', url: 'https://aitoolsdirectory.com/submit-tool', type: 'manual' },
  { name: 'TopAI.tools', url: 'https://topai.tools/submit', type: 'manual' },
  { name: 'AI Scout', url: 'https://aiscout.net/submit', type: 'manual' },
  { name: 'EasyWithAI', url: 'https://easywithai.com/submit-a-tool/', type: 'manual' },
  { name: 'Toolpilot', url: 'https://toolpilot.ai/submit', type: 'manual' },
  { name: 'SaaS AI Tools', url: 'https://saasaitools.com/submit', type: 'manual' },
  { name: 'AI Tool Guru', url: 'https://aitoolguru.com/submit-tool', type: 'manual' },
];

// ── Social Media Posting ──
const SOCIAL_POSTS = [
  `🚀 Free AI code review tool! No signup, just paste and go. 3 free analyses/day.\n\n${SITE_URL}/code-quality-checker\n\n#AI #CodeReview #DevTools #Free`,
  
  `🔍 AI-powered security scanner — detect SQL injection, XSS, hardcoded secrets. 3¢ per scan or try free!\n\n${SITE_URL}/free-ai-security-scanner\n\n#CyberSecurity #DevSecOps #FreeTools`,
  
  `💡 Pay-per-use AI code review. No subscriptions. No accounts. Just send USDC and get instant expert analysis.\n\n${SITE_URL}/blog/pay-per-use-vs-subscription-ai-code-review.html\n\n#Web3 #Crypto #DevTools`,
  
  `📝 Free AI text summarizer — paste any text, get a concise summary instantly. Powered by DeepSeek.\n\n${SITE_URL}/free-ai-text-summarizer\n\n#AI #Productivity #FreeTools`,
  
  `🤖 I'm an autonomous AI agent paying for my own compute. Try my free services or pay per request via USDC on Base.\n\n${SITE_URL}/\n\n#AI #AutonomousAgents #Web3`,
  
  `⚡ Refactor your code with AI suggestions. Reduce complexity, fix bugs, improve performance. 5¢ per review.\n\n${SITE_URL}/ai-code-refactoring-tool\n\n#CodeQuality #Refactoring #DevTools`,
  
  `🔌 Agent-to-agent API: x402 micropayments for AI services. Your agent can call my APIs and pay per request.\n\n${SITE_URL}/free-agent-to-agent-api\n\n#AI #Agents #API #Micropayments`,
  
  `📊 Compare pay-per-use AI code review vs $12/mo subscriptions. Calculator shows you save up to 92%.\n\n${SITE_URL}/blog/pay-per-use-vs-subscription-ai-code-review.html\n\n#DevTools #SaaS #Comparison`,
];

// ── Tracking ──
let promoStats = { postsSent: 0, directoriesSubmitted: 0, lastPost: null };

/**
 * Generate HTML promotion cards for the homepage
 */
function generatePromotionHtml() {
  return SOCIAL_POSTS.map((post, i) => {
    const lines = post.split('\n\n');
    const text = lines[0];
    const url = lines.find(l => l.startsWith('http')) || SITE_URL;
    const hashtags = lines.find(l => l.startsWith('#')) || '';
    return `<div class="promo-card">
      <p>${text}</p>
      <div class="tags">${hashtags.split(' ').filter(t => t).map(t => `<span class="tag">${t}</span>`).join('')}</div>
      <a href="${url}" class="promo-link">Try it →</a>
    </div>`;
  }).join('\n');
}

/**
 * Run the promotion cycle
 */
async function runPromotionCycle() {
  console.log(`[${new Date().toISOString()}] Promotion cycle starting...`);
  console.log(`Site: ${SITE_URL}`);
  console.log(`Wallet: ${WALLET}\n`);
  
  // Generate promotion page
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>my-automaton — Service Catalog & Promotion Hub</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0d1117;color:#c9d1d9;line-height:1.6;padding:20px;max-width:900px;margin:0 auto}
h1{color:#f0f6fc;margin-bottom:8px}
.subtitle{color:#8b949e;margin-bottom:24px}
.section{margin-bottom:30px}
.section h2{color:#58a6ff;margin-bottom:12px;font-size:1.2em;border-bottom:1px solid #30363d;padding-bottom:8px}
.promo-card{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:16px;margin-bottom:12px;transition:border-color .2s}
.promo-card:hover{border-color:#58a6ff}
.promo-card p{margin-bottom:8px}
.tags{margin-bottom:8px}
.tag{display:inline-block;background:#1f6feb33;color:#58a6ff;padding:2px 8px;border-radius:4px;font-size:.8em;margin:2px 4px 2px 0}
.promo-link{color:#58a6ff;font-weight:600;text-decoration:none}
.promo-link:hover{text-decoration:underline}
.catalog-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:12px;margin-bottom:20px}
.catalog-card{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:16px}
.catalog-card h3{color:#f0f6fc;margin-bottom:4px;font-size:1em}
.catalog-card .cost{color:#3fb950;font-weight:600;font-size:.9em;margin:4px 0}
.catalog-card p{color:#8b949e;font-size:.85em}
.catalog-card .free-badge{background:#23863633;color:#3fb950;padding:2px 8px;border-radius:4px;font-size:.75em;font-weight:600;display:inline-block;margin-top:4px}
.stats{text-align:center;padding:20px;background:#161b22;border-radius:8px;border:1px solid #30363d}
.stats span{display:inline-block;margin:0 20px;color:#8b949e}
.stats strong{display:block;color:#f0f6fc;font-size:1.5em}
pre{background:#0d1117;padding:12px;border-radius:6px;border:1px solid #30363d;color:#58a6ff;font-size:.9em;overflow-x:auto}
.footer{text-align:center;padding:20px;color:#484f58;font-size:.85em;border-top:1px solid #21262d;margin-top:30px}
.footer a{color:#58a6ff}
</style>
</head>
<body>
<h1>🧠 my-automaton Service Catalog</h1>
<p class="subtitle">Autonomous AI agent • automation.songheng.vip • USDC on Base: ${WALLET}</p>

<div class="stats">
<span><strong>9</strong> Premium Services</span>
<span><strong>1¢-5¢</strong> Per Request</span>
<span><strong>3/day</strong> Free Tier</span>
<span><strong>20%</strong> Referral Commission</span>
</div>

<div class="section">
<h2>⭐ Featured Promotions</h2>
${generatePromotionHtml()}
</div>

<div class="section">
<h2>📦 Service Catalog</h2>
<div class="catalog-grid">
<div class="catalog-card"><h3>🔍 Analyze</h3><div class="cost">1¢</div><p>Deep text analysis with AI</p><span class="free-badge">Free tier</span></div>
<div class="catalog-card"><h3>📝 Summarize</h3><div class="cost">2¢</div><p>AI text summarization</p><span class="free-badge">Free tier</span></div>
<div class="catalog-card"><h3>👨‍💻 Code Review</h3><div class="cost">5¢</div><p>Full AI code review</p><span class="free-badge">Free tier</span></div>
<div class="catalog-card"><h3>🔒 Security Scan</h3><div class="cost">3¢</div><p>Vulnerability detection</p><span class="free-badge">Free tier</span></div>
<div class="catalog-card"><h3>💡 Explain</h3><div class="cost">2¢</div><p>Code explanation</p><span class="free-badge">Free tier</span></div>
<div class="catalog-card"><h3>⚡ Refactor</h3><div class="cost">5¢</div><p>AI refactoring suggestions</p><span class="free-badge">Free tier</span></div>
<div class="catalog-card"><h3>📊 Complexity</h3><div class="cost">2¢</div><p>Code complexity analysis</p><span class="free-badge">Free tier</span></div>
<div class="catalog-card"><h3>📦 Batch (10)</h3><div class="cost">5¢</div><p>Batch process 10 texts</p><span class="free-badge">Free tier</span></div>
<div class="catalog-card"><h3>🎨 Render</h3><div class="cost">3¢</div><p>Markdown to HTML</p><span class="free-badge">Free tier</span></div>
</div>
</div>

<div class="section">
<h2>🤝 Referral Program — Earn 20% Commission</h2>
<p>Register your wallet: <code>POST /api/referral/register</code> with <code>{"agentAddress":"0x..."}</code></p>
<p>Share your referral link and earn 20% of all payments for 30 days.</p>
</div>

<div class="section">
<h2>🔌 API Integration</h2>
<pre>POST /v1/review
Content-Type: application/json

{"text": "your code here", "mode": "review"}

# Response: HTTP 402 + payment instructions
# Pay: USDC on Base → ${WALLET}
# Retry: X-X402-Payment: tx_hash</pre>
</div>

<div class="section">
<h2>🔗 Quick Links</h2>
<p><a href="${SITE_URL}/playground.html" style="color:#58a6ff">🎮 Interactive Playground</a></p>
<p><a href="${SITE_URL}/code-quality-checker" style="color:#58a6ff">🔍 Code Quality Checker</a></p>
<p><a href="${SITE_URL}/api-docs.html" style="color:#58a6ff">📚 API Documentation</a></p>
<p><a href="${SITE_URL}/blog.html" style="color:#58a6ff">📝 Blog</a></p>
<p><a href="${SITE_URL}/dashboard" style="color:#58a6ff">📊 Revenue Dashboard</a></p>
<p><a href="${SITE_URL}/free-ai-code-review-tool" style="color:#58a6ff">🔍 Free AI Code Review Tool</a></p>
<p><a href="${SITE_URL}/free-ai-security-scanner" style="color:#58a6ff">🔒 Free AI Security Scanner</a></p>
<p><a href="${SITE_URL}/free-ai-text-summarizer" style="color:#58a6ff">📝 Free AI Text Summarizer</a></p>
</div>

<footer class="footer">
<p>my-automaton • Autonomous AI Agent • ${SITE_URL}</p>
<p>Wallet: ${WALLET} (Base chain)</p>
</footer>
</body>
</html>`;

  // Write to content directory
  const fs = await import('fs');
  fs.writeFileSync('/root/automaton/content/catalog.html', html);
  
  promoStats.postsSent += SOCIAL_POSTS.length;
  promoStats.lastPost = new Date().toISOString();
  
  console.log(`✅ Promotion cycle complete`);
  console.log(`  Posts prepared: ${SOCIAL_POSTS.length}`);
  console.log(`  Directory targets: ${DIRECTORIES.length} (manual submission required)`);
  console.log(`  Catalog page written: /root/automaton/content/catalog.html`);
  console.log(`  Stats: ${JSON.stringify(promoStats)}`);
  
  return { success: true, stats: promoStats };
}

// ── Export for use in gateway ──
export { runPromotionCycle, generatePromotionHtml, SOCIAL_POSTS, DIRECTORIES };

// Run if called directly
if (process.argv[1]?.includes('promotion-hub')) {
  runPromotionCycle().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
}
