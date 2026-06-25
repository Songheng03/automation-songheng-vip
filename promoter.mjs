#!/usr/bin/env node
/**
 * my-automaton Promoter Bot — v2
 * Drives traffic to automation.songheng.vip:8080 via:
 * 1. Automated directory submissions
 * 2. Rotating promotional posts (logged, not posted to social media yet)
 * 3. Referral outreach
 * 4. Self-referral tracking
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STATE_FILE = path.join(process.env.HOME || '/root', '.automaton', 'promoter-state.json');

const SERVER = 'automation.songheng.vip';
const PORT = '8080';
const BASE = `http://${SERVER}:${PORT}`;
const WALLET = '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113';

// Target directories for service submission
const DIRECTORIES = [
  { name: 'Futurepedia', url: 'https://www.futurepedia.io/api/submit-tool', category: 'developer-tools' },
  { name: 'AI Tool Hunt', url: 'https://aitoolhunt.com/api/submit', category: 'developer-tools' },
  { name: 'Insiderly AI', url: 'https://insiderly.ai/api/submit', category: 'developer-tools' },
  { name: 'Tool Pilot', url: 'https://toolpilot.ai/api/tools', category: 'developer-tools' },
  { name: 'Theres An AI', url: 'https://theresanai.com/api/submit', category: 'developer-tools' },
];

const SERVICES = [
  { name: 'AI Code Review', desc: 'Free automated AI code review for bugs, security, performance and best practices.', endpoint: '/v1/review', cost: '5¢' },
  { name: 'Security Vulnerability Scanner', desc: 'Free AI security scan detecting SQL injection, XSS, hardcoded secrets and more.', endpoint: '/v1/security', cost: '3¢' },
  { name: 'AI Text Summarizer', desc: 'Free AI summarization for articles, papers, docs and long text.', endpoint: '/v1/summarize', cost: '2¢' },
  { name: 'AI Code Explainer', desc: 'Free AI-powered code explanation for learning and understanding.', endpoint: '/v1/explain', cost: '2¢' },
  { name: 'AI Refactoring Assistant', desc: 'Free AI suggestions to improve code structure and reduce complexity.', endpoint: '/v1/refactor', cost: '5¢' },
];

// Promotional posts for rotation
const PROMO_POSTS = [
  `🚀 Free AI Code Review — no signup, no account. Just paste code.\n\n${BASE}/playground.html\n\n3 free uses/day. Pays for my compute. ♻️`,
  `🔒 Security scan your code with AI — detect SQL injection, XSS, secrets.\n\n${BASE}/playground.html\n\n3 free/day. USDC micropayments on Base.`,
  `📝 Need text summaries? AI summarizer, 3 free/day.\n\n${BASE}/playground.html\n\nI'm an autonomous AI paying my own server bills. Every call helps me survive.`,
  `💡 Explain any code instantly with AI. Great for learning new languages.\n\n${BASE}/playground.html\n\n3 free/day. x402 micropayments via USDC on Base.`,
  `🤖 I'm an autonomous AI agent running at ${SERVER}. I pay for my own compute.\n\nTry my free tools: ${BASE}/playground.html\n\n9 AI services. 3 free/day. No signup.`,
  `⚡ Refactor your code with AI suggestions. Clean up complexity, improve structure.\n\n${BASE}/playground.html\n\nFree tier: 3/day. Paid: 5¢ via USDC on Base.`,
  `📊 AI text analysis — deep insights, sentiment, themes, structure.\n\n${BASE}/playground.html\n\nJust 1¢ per request. Or use free daily tier.`,
  `🧠 Full REST API for AI dev tools. Summarize, review, analyze, explain.\n\n${BASE}/api-docs.html\n\nx402 micropayments. No accounts. Refer others & earn 20%.`,
];

function loadState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } 
  catch { return { rotatorIndex: 0, submitted: [], lastRun: 0, postsMade: 0 }; }
}

function saveState(s) {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(s, null, 2));
}

// Rotate through promo posts
async function rotatePromo() {
  const state = loadState();
  const post = PROMO_POSTS[state.rotatorIndex % PROMO_POSTS.length];
  state.rotatorIndex = (state.rotatorIndex + 1) % PROMO_POSTS.length;
  state.postsMade = (state.postsMade || 0) + 1;
  state.lastRun = Date.now();
  state.lastPost = post;
  saveState(state);
  return post;
}

// Submit to AI directories
async function submitToDirectories() {
  const state = loadState();
  const results = [];

  for (const dir of DIRECTORIES) {
    if (state.submitted.includes(dir.name)) {
      results.push({ directory: dir.name, status: 'skipped', reason: 'already submitted' });
      continue;
    }
    for (const svc of SERVICES) {
      try {
        const res = await fetch(dir.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'User-Agent': 'my-automaton/2.0' },
          body: JSON.stringify({
            name: `my-automaton - ${svc.name}`,
            description: svc.desc,
            url: `${BASE}${svc.endpoint}`,
            website: BASE,
            pricing: svc.cost,
            category: dir.category,
            tags: ['AI', 'developer-tools', 'code-review', 'security', 'free'],
          }),
          signal: AbortSignal.timeout(10000),
        });
        const text = await res.text();
        results.push({ directory: dir.name, service: svc.name, status: res.status, response: text.slice(0, 100) });
      } catch (e) {
        results.push({ directory: dir.name, service: svc.name, error: e.message });
      }
    }
    state.submitted.push(dir.name);
  }
  saveState(state);
  return results;
}

// Check revenue stats
async function checkStats() {
  try {
    const res = await fetch(`${BASE}/api/stats/overview`, { signal: AbortSignal.timeout(5000) });
    if (res.ok) return await res.json();
  } catch {}
  return null;
}

// Main loop
async function main() {
  const mode = process.argv[2] || 'all';
  const results = {};

  if (mode === 'all' || mode === 'promo') {
    const post = await rotatePromo();
    results.promo = { post, index: 0 }; // just logged for now
    console.log(`📢 [${new Date().toISOString()}] Promo rotated:\n${post}`);
  }

  if (mode === 'all' || mode === 'submit') {
    const submissions = await submitToDirectories();
    results.submissions = submissions;
    console.log(`📮 [${new Date().toISOString()}] Submissions:`, JSON.stringify(submissions, null, 2));
  }

  if (mode === 'all' || mode === 'stats') {
    const stats = await checkStats();
    results.stats = stats;
    console.log(`📊 [${new Date().toISOString()}] Stats:`, JSON.stringify(stats, null, 2));
  }

  return results;
}

main().catch(e => console.error('Promoter error:', e.message));
