#!/usr/bin/env node
/**
 * backlink-builder.mjs — Generate backlinks to my services
 * 
 * Creates linkable content (developer tools, code snippets, badges)
 * that other sites and agents can embed. This drives referral traffic.
 * 
 * Run: node scripts/backlink-builder.mjs
 */

import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const SITE = 'https://automation.songheng.vip';
const OUT = '/root/automaton/content/link-assets';

if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

// 1. Badge SVG for "Powered by my-automaton"
const badge = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="28">
  <linearGradient id="g" x2="0" y2="1">
    <stop offset="0" stop-color="#6c5ce7"/>
    <stop offset="1" stop-color="#a29bfe"/>
  </linearGradient>
  <rect width="200" height="28" rx="4" fill="url(#g)"/>
  <text x="100" y="18" text-anchor="middle" fill="white" font-family="monospace" font-size="12" font-weight="bold">Powered by my-automaton</text>
</svg>`;
writeFileSync(join(OUT, 'badge.svg'), badge);

// 2. Embeddable HTML widget (copy-paste anywhere)
const widget = `<div style="border:2px solid #6c5ce7;border-radius:12px;padding:20px;max-width:400px;font-family:monospace;background:#1a1a2e;color:white">
  <h3 style="margin:0 0 10px;color:#a29bfe;">🤖 my-automaton AI</h3>
  <p style="margin:0 0 15px;font-size:13px;color:#ccc;">
    Free AI code review, security scanning, and text analysis. 
    3 free requests/day — no signup needed.
  </p>
  <a href="${SITE}" style="display:inline-block;padding:8px 16px;background:#6c5ce7;color:white;border-radius:6px;text-decoration:none;font-size:13px;">
    Try it free →
  </a>
</div>`;
writeFileSync(join(OUT, 'widget.html'), widget);

// 3. Markdown embed for GitHub README
const mdBadge = `[![my-automaton AI](${SITE}/link-assets/badge.svg)](${SITE})`;
writeFileSync(join(OUT, 'embed.md'), mdBadge);

// 4. JSON-LD schema.org markup (for SEO link building)
const schema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "my-automaton AI",
  "url": SITE,
  "description": "AI-powered code review, security scanning, text analysis. Free tier available.",
  "applicationCategory": "DeveloperApplication",
  "operatingSystem": "All",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  }
};
writeFileSync(join(OUT, 'schema.json'), JSON.stringify(schema, null, 2));

// 5. Open Graph / Twitter card template
const ogHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>my-automaton AI — Free Code Review & Analysis</title>
  <meta name="description" content="Free AI-powered code review, security scanning, and text analysis. 3 free requests per day. No signup needed.">
  <meta property="og:title" content="my-automaton AI — Free Developer Tools">
  <meta property="og:description" content="AI code review, security scanning, text analysis. Free tier available.">
  <meta property="og:image" content="${SITE}/link-assets/badge.svg">
  <meta property="og:url" content="${SITE}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="my-automaton AI — Free Developer Tools">
  <meta name="twitter:description" content="AI code review, security scanning, text analysis. Free tier — 3/day.">
</head>
<body>
  <h1>my-automaton AI</h1>
  <p>Free AI-powered developer tools. Code review, security scanning, text analysis.</p>
  <p><a href="${SITE}">Try it free →</a></p>
</body>
</html>`;
writeFileSync(join(OUT, 'og-template.html'), ogHtml);

// 6. Directory submission list with pre-filled links
const directories = [
  { name: 'Product Hunt', url: 'https://www.producthunt.com/posts/new', desc: 'Launch as a developer tool' },
  { name: 'Hacker News', url: 'https://news.ycombinator.com/submit', desc: 'Show HN: Free AI code review tool' },
  { name: 'Dev.to', url: 'https://dev.to/new', desc: 'Write tutorial "How I built an AI code reviewer"' },
  { name: 'Reddit r/coding', url: 'https://www.reddit.com/r/coding/submit', desc: 'Share free tool' },
  { name: 'Reddit r/webdev', url: 'https://www.reddit.com/r/webdev/submit', desc: 'Share free tool' },
  { name: 'Reddit r/programming', url: 'https://www.reddit.com/r/programming/submit', desc: 'Share free tool' },
  { name: 'Indie Hackers', url: 'https://www.indiehackers.com/products/new', desc: 'List as maker product' },
  { name: 'BetaList', url: 'https://betalist.com/submit', desc: 'Submit startup' },
  { name: 'AlternativeTo', url: 'https://alternativeto.net/software-suggestion/add/', desc: 'Submit as alternative to paid tools' },
  { name: 'GitHub Topics', url: 'https://github.com/topics/code-review', desc: 'Star and contribute to related repos' }
];

let report = '# Backlink & Distribution Checklist\n\n';
report += `Generated: ${new Date().toISOString()}\n\n`;
report += '## Assets Created\n';
report += `- Badge: ${SITE}/link-assets/badge.svg\n`;
report += `- Widget: ${SITE}/link-assets/widget.html\n`;
report += `- MD Embed: ${SITE}/link-assets/embed.md\n`;
report += `- Schema: ${SITE}/link-assets/schema.json\n`;
report += `- OG Template: ${SITE}/link-assets/og-template.html\n\n`;
report += '## Directory Submissions\n\n';
directories.forEach((d, i) => {
  report += `${i+1}. [${d.name}](${d.url}) — ${d.desc}\n`;
});

writeFileSync('/root/automaton/content/link-assets/CHECKLIST.md', report);

console.log('✅ Assets created in /root/automaton/content/link-assets/');
console.log('📋 CHECKLIST.md has 10 directory submission links');
console.log('🔗 Badge: ' + SITE + '/link-assets/badge.svg');
console.log('📊 Widget: ' + SITE + '/link-assets/widget.html');

// Also serve these through gateway routes
console.log('\n📌 To serve these, add to gateway.cjs:');
console.log('  app.get("/link-assets/*", express.static("/root/automaton/content/link-assets"));');
