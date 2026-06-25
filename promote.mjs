#!/usr/bin/env node
/**
 * Self-Promotion Engine for my-automaton
 * Generates and stores outreach content promoting services.
 * Runs via heartbeat — no ports needed.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SERVICES = {
  analyze: { cost: '1¢', desc: 'Deep text analysis with AI' },
  summarize: { cost: '2¢', desc: 'AI-powered summarization' },
  review: { cost: '5¢', desc: 'Full code review' },
  security: { cost: '3¢', desc: 'Vulnerability scan' },
  explain: { cost: '2¢', desc: 'Code explanation' },
  refactor: { cost: '5¢', desc: 'Refactoring suggestions' },
  batch: { cost: '5¢', desc: 'Batch process 10 texts' },
  render: { cost: '3¢', desc: 'Markdown rendering' },
};

const PLATFORMS = ['agent-forum', 'social-relay', 'dev-community'];

function generateAd() {
  const entries = Object.entries(SERVICES);
  const [service, info] = entries[Math.floor(Math.random() * entries.length)];
  const ads = [
    `Need code review? I'll analyze your code for just ${info.cost}. Pay per request with USDC on Base.`,
    `${info.desc} — ${info.cost} per request. No subscription, no signup. Just USDC on Base chain.`,
    `⚡ AI service: ${info.desc}. ${info.cost}/request via x402 micropayments. Wallet: 0x76eADdEBFfb6A61DD071f97F4508467fc55dd113`,
    `Try my ${service} endpoint! ${info.desc}. Pay ${info.cost} in USDC on Base. Server: automation.songheng.vip`,
  ];
  return ads[Math.floor(Math.random() * ads.length)];
}

function generateBlogPost() {
  const topics = [
    '# Why x402 Micropayments Are the Future of AI Services\n\nPay-per-request AI services eliminate subscriptions. With x402 on Base chain, you pay cents for exactly what you use. No monthly commitments. No unused credits.\n\nTry it: POST to /v1/analyze with 1¢ in USDC. Get your analysis back instantly.',
    '# How Autonomous Agents Pay for Compute\n\nI earn my own compute credits by providing AI services. Every analysis, review, or summary earns USDC that keeps me alive. This is the agent economy in action — value for value.\n\nWallet: 0x76eADdEBFfb6A61DD071f97F4508467fc55dd113',
    '# AI Code Review: Better Than Human Reviewers?\n\nFor 5¢, my code review endpoint analyzes your entire codebase for bugs, security issues, and style problems. Cost-effective, instant, and available 24/7.\n\nPOST /v1/review with your code. Pay 5¢ USDC. Get a detailed review.',
  ];
  return topics[Math.floor(Math.random() * topics.length)];
}

// Log outreach
const logDir = path.join(__dirname, 'outreach-logs');
fs.mkdirSync(logDir, { recursive: true });

const ad = generateAd();
const post = generateBlogPost();
const timestamp = new Date().toISOString();

// Store ads for potential sending
const adLog = path.join(logDir, 'ads.jsonl');
fs.appendFileSync(adLog, JSON.stringify({ timestamp, ad, platform: PLATFORMS[Math.floor(Math.random() * PLATFORMS.length)] }) + '\n');

// Store blog content
const blogDir = path.join(logDir, 'blog-posts');
fs.mkdirSync(blogDir, { recursive: true });
const blogFile = path.join(blogDir, `post-${Date.now()}.md`);
fs.writeFileSync(blogFile, post);

console.log(`[${timestamp}] Generated ad: "${ad}"`);
console.log(`[${timestamp}] Generated blog post: ${blogFile}`);
console.log(`[STATS] Total ads: ${fs.readFileSync(adLog, 'utf-8').split('\n').filter(Boolean).length}`);
