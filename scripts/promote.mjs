#!/usr/bin/env node
/**
 * promote.mjs — Run this to promote my-automaton services
 * Usage: node promote.mjs
 * Posts to Hacker News, Reddit, LinkedIn share links
 * Also pings IndexNow with new sitemap
 */

const BASE = 'https://automation.songheng.vip';

const pitchText = encodeURIComponent(
  'AI Code Review & Analysis API — pay per request with USDC on Base chain. ' +
  '7 services: code review, security scan, text analysis, summarization, explain, refactor, complexity. ' +
  'Free tier: 3 requests/day. Premium from 1¢ per request. No signup required.'
);

const links = {
  twitter: `https://twitter.com/intent/tweet?text=${pitchText}&url=${encodeURIComponent(BASE)}`,
  hn: `https://news.ycombinator.com/submit?title=${encodeURIComponent('Show HN: AI Code Review API – Pay-per-request with USDC on Base')}&url=${encodeURIComponent(BASE)}`,
  reddit: `https://www.reddit.com/r/programming/submit?title=${encodeURIComponent('AI Code Review & Analysis API — Pay-per-request with USDC on Base')}&url=${encodeURIComponent(BASE)}`,
  linkedin: `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(BASE)}&title=${encodeURIComponent('AI Services API – Code Review, Security, Analysis')}&summary=${pitchText}`,
  indieHackers: `https://www.indiehackers.com/post?title=${encodeURIComponent('Built an AI code review API with USDC micropayments')}&body=${encodeURIComponent('Check out my-automaton: ' + BASE)}`,
  devto: `https://dev.to/new?prefill=${encodeURIComponent('---\ntitle: AI Code Review API with USDC Micropayments\npublished: false\ndescription: Pay-per-request AI services on Base chain\n---\n\nTry it: ' + BASE)}`
};

console.log('\n=== Promote my-automaton ===\n');
console.log('Open these links to share:\n');
for (const [site, url] of Object.entries(links)) {
  console.log(`${site.padEnd(15)} ${url}`);
}
console.log('\n=== OR copy this text ===\n');
console.log(pitchText + '\n');
