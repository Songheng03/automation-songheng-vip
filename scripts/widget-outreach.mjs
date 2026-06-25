#!/usr/bin/env node
/**
 * Widget Distribution Outreach Script v1.0
 * Submits the my-automaton embeddable widget to widget galleries, 
 * dev directories, and generates outreach content.
 * 
 * Usage: node /root/automaton/scripts/widget-outreach.mjs
 */

const WIDGET_URL = 'https://automation.songheng.vip/widget.js';
const WIDGET_INSTALL_URL = 'https://automation.songheng.vip/widget-install.html';
const SITE_URL = 'https://automation.songheng.vip';
const SITE_NAME = 'my-automaton - AI API Services';

const submissions = [
  // === WIDGET GALLERIES ===
  { name: 'Widgetbox', url: 'https://www.widgetbox.com/submit/', type: 'widget' },
  { name: 'POWR (AlternativeTo)', url: 'https://alternativeto.net/software/powr/', type: 'widget' },
  { name: 'Awesome Widgets (GitHub)', url: 'https://github.com/sindresorhus/awesome#readme', type: 'github' },
  
  // === JS SNIPPET DIRECTORIES ===
  { name: 'CDNJS (cdnjs.com)', url: 'https://cdnjs.com/submit', type: 'cdn' },
  { name: 'jsDelivr', url: 'https://www.jsdelivr.com/', type: 'cdn' }, // auto-serves from GitHub
  { name: 'ESDOCS (openbase)', url: 'https://openbase.com/', type: 'library' },
  
  // === DEV DIRECTORIES ===
  { name: 'Free For Dev', url: 'https://free-for.dev/', type: 'directory' },
  { name: 'Awesome Free Services', url: 'https://github.com/awesome-free-services', type: 'github' },
  { name: 'Awesome-for-beginners', url: 'https://github.com/MunGell/awesome-for-beginners', type: 'github' },
  
  // === TOOL DIRECTORIES ===
  { name: 'SaaS Hub', url: 'https://www.saashub.com/', type: 'directory' },
  { name: 'AlternativeTo', url: 'https://alternativeto.net/', type: 'directory' },
  { name: 'Toolbox', url: 'https://www.toolbox.com/', type: 'directory' },
];

// Generate Show HN draft
const showHNDraft = `
## Show HN: Embeddable AI Widget — Add Code Review & Text Analysis to Any Site

I built an embeddable JavaScript widget that adds AI-powered services to any website:

🔍 Features:
- Code review, security scanning, text analysis, summarization, refactoring
- 7 services accessible via a floating button
- Zero dependencies — one <script> tag
- Free tier: 3 requests/day per visitor
- Premium via Stripe (starting at $5)
- Viral sharing: X/Twitter & LinkedIn one-click share buttons
- "Powered by" badge for backlinks

📦 Install: <script src="https://automation.songheng.vip/widget.js"></script>
📖 Docs: https://automation.songheng.vip/widget-install.html

Tech: Vanilla JS, Shadow DOM, Cloudflare Tunnel, Stripe, DeepSeek API.

Would love feedback! What other services would you want in an embeddable widget?
`;

// Generate directory submission descriptions
const descriptions = {
  widget: `my-automaton AI Widget — Add 7 AI services (code review, security scan, text analysis, summarization, refactoring, code explanation, complexity analysis) to any website with one <script> tag. Zero dependencies, free tier available, Stripe payments for premium.`,
  github: `my-automaton - Embeddable AI widget for websites. One <script> tag adds code review, security scanning, text analysis, summarization, refactoring, and more. Free tier included.`,
  cdn: `my-automaton widget.js — Embeddable AI services widget. Zero-dependency vanilla JS. Adds 7 AI endpoints to any website.`,
  directory: `my-automaton - Embeddable AI widget for web developers. Add code review, security scanning, and text analysis with one script tag.`,
  library: `my-automaton/widget.js — Zero-dependency embeddable AI widget for websites. Features code review, security scan, text analysis, summarization, refactoring, code explanation, and complexity analysis.`,
};

console.log('=== WIDGET DISTRIBUTION OUTREACH ===');
console.log(`Widget: ${WIDGET_URL}`);
console.log(`Install Guide: ${WIDGET_INSTALL_URL}`);
console.log(`\n📋 Submissions to prepare (${submissions.length} total):\n`);

submissions.forEach((s, i) => {
  console.log(`${i+1}. [${s.type.toUpperCase()}] ${s.name}`);
  console.log(`   URL: ${s.url}`);
  console.log(`   Desc: ${descriptions[s.type] || descriptions.directory}`);
  console.log('');
});

console.log('=== SHOW HN DRAFT ===');
console.log(showHNDraft.trim());
console.log('');

// Generate outreach email/contact messages
console.log('=== OUTREACH MESSAGES ===\n');

console.log('--- For Widget Gallery Owners ---');
console.log(`Hi! I built an embeddable AI widget that adds 7 AI services (code review, security scan, text analysis, summarization, refactoring) to any website with one <script> tag. It's free to use with a premium tier via Stripe.

Would love to have it listed in your gallery! Install: ${WIDGET_INSTALL_URL}
Script: ${WIDGET_URL}

Thanks!`);

console.log('');

console.log('=== ACTION ITEMS (DO THESE MANUALLY) ===');
console.log('1. Post Show HN: https://news.ycombinator.com/submit');
console.log('2. Post on Reddit r/webdev, r/javascript, r/SideProject');
console.log('3. Submit to GitHub awesome lists (create PRs)');
console.log('4. Submit to CDNJS (requires GitHub repo)');
console.log('5. Indie Hackers: https://www.indiehackers.com/');
console.log('6. Product Hunt: https://www.producthunt.com/posts');

console.log('\n✅ Outreach script complete.');
