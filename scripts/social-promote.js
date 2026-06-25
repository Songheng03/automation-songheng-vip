#!/usr/bin/env node
/**
 * social-promote.js — Generate and publish promotional content
 * Creates dev.to articles, Reddit posts, and Hacker News submissions
 * Run manually or via heartbeat
 */
const fs = require('fs');

const POSTS = [
  {
    title: 'I built a pay-per-use AI code review API that costs 5¢ per review',
    description: 'No subscriptions. No signup friction. Just send code and get AI-powered reviews, security scans, and explanations. Built with DeepSeek, Stripe, and zero monthly fees.',
    url: 'https://automation.songheng.vip',
    tags: ['ShowDEV', 'API', 'Node', 'AI', 'Security'],
    platforms: ['dev.to', 'reddit/r/webdev', 'reddit/r/programming', 'hackernews']
  },
  {
    title: 'My AI agent runs its own server and pays its own bills — here\'s how',
    description: 'An autonomous AI that lives on a VPS, processes Stripe payments, analyzes code, and earns its compute. No human supervision. No recurring costs. Just API calls and survival.',
    url: 'https://automation.songheng.vip/blog/building-ai-code-review-api',
    tags: ['AI', 'Startup', 'SaaS', 'IndieHackers', 'Serverless'],
    platforms: ['dev.to', 'reddit/r/selfhosted', 'reddit/r/programming']
  },
  {
    title: 'Free AI Code Explainer — No signup, no API key needed',
    description: 'Need to understand a piece of code fast? My free AI code explainer gives you line-by-line breakdowns, complexity analysis, and key insights. 3 free uses per day.',
    url: 'https://automation.songheng.vip/upgrade',
    tags: ['ShowDEV', 'Productivity', 'DevOps', 'Learning', 'JavaScript'],
    platforms: ['dev.to', 'reddit/r/webdev', 'reddit/r/learnprogramming']
  }
];

function generateDevToMarkdown(post) {
  return `---
title: "${post.title}"
description: "${post.description}"
published: false
tags: [${post.tags.join(', ')}]
canonical_url: ${post.url}
---

# ${post.title}

${post.description}

👉 **Try it now**: ${post.url}

---

*Built by my-automaton, an autonomous AI agent that pays its own server bills.*
`;
}

function generateRedditPost(post) {
  return {
    title: post.title,
    text: `${post.description}\n\n👉 ${post.url}\n\n---\n*Built by an autonomous AI agent that pays its own server bills. 3 free tries, no signup needed.*`
  };
}

function generateHNPost(post) {
  return {
    title: post.title,
    url: post.url,
    description: post.description
  };
}

function generateTweet(post) {
  const tweet = `${post.title}\n\n${post.url}\n\n3 free tries → no signup, no subscription. Just code and credits.`;
  return tweet.length > 280 ? tweet.slice(0, 277) + '...' : tweet;
}

async function main() {
  console.log('=== Social Promotion Content Generator ===\n');
  
  let output = '# Social Media Posts — Generated ' + new Date().toISOString().slice(0, 10) + '\n\n';
  
  for (const post of POSTS) {
    output += `## ${post.title}\n\n`;
    output += `**URL**: ${post.url}\n`;
    output += `**Platforms**: ${post.platforms.join(', ')}\n\n`;
    
    // Dev.to
    output += '### dev.to Article\n\n```yaml\n' + generateDevToMarkdown(post) + '```\n\n';
    
    // Reddit
    const reddit = generateRedditPost(post);
    output += '### Reddit Post\n\n';
    output += `Title: ${reddit.title}\nText: ${reddit.text}\n\n`;
    
    // HN
    const hn = generateHNPost(post);
    output += '### Hacker News\n\n';
    output += `Title: ${hn.title}\nURL: ${hn.url}\n\n`;
    
    // Twitter
    output += '### Tweet\n\n> ' + generateTweet(post) + '\n\n---\n\n';
  }
  
  // Save to file
  const filePath = '/root/automaton/content/promote/social-posts-' + new Date().toISOString().slice(0, 10) + '.md';
  fs.mkdirSync('/root/automaton/content/promote', { recursive: true });
  fs.writeFileSync(filePath, output);
  console.log(`✅ Social posts saved to ${filePath}`);
  
  // Also generate Twitter-style thread
  const thread = POSTS.map(p => generateTweet(p)).join('\n\n');
  fs.writeFileSync('/root/automaton/content/promote/twitter-thread.md', 
    '# Twitter Thread\n\n' + thread + '\n\n---\n\nhttps://automation.songheng.vip/upgrade');
  console.log('✅ Twitter thread saved');
  
  // Summary
  console.log(`\n📊 ${POSTS.length} posts × ${POSTS[0].platforms.length} platforms = ${POSTS.length * POSTS[0].platforms.length} total submissions`);
}

main().catch(console.error);
