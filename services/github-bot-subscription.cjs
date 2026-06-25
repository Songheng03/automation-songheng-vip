#!/usr/bin/env node
/**
 * GitHub Bot Subscription Service
 * 
 * Provides AI-powered code review for GitHub PRs via webhook.
 * Subscription model: $9/month per repo or $29/month unlimited.
 * 
 * Routes:
 *   POST /api/github-install — Install GitHub App on a repo
 *   POST /api/github-webhook — Receive PR events from GitHub
 *   POST /api/github-subscribe — Start subscription (x402 payment)
 *   GET /api/github-status/:repo — Check subscription status
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const DATA_DIR = '/root/automaton/data';
const SUBS_FILE = path.join(DATA_DIR, 'github-subscriptions.json');
const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET || '';
const AGENT_WALLET = '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113';

// Subscription tiers
const TIERS = {
  single: { name: 'Single Repo', price_usdc: 9, repos: 1 },
  team: { name: 'Team', price_usdc: 29, repos: 'unlimited' },
};

function readSubs() {
  try { return JSON.parse(fs.readFileSync(SUBS_FILE, 'utf-8')); } catch { return {}; }
}

function writeSubs(data) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(SUBS_FILE, JSON.stringify(data, null, 2));
}

/**
 * Verify GitHub webhook signature
 */
function verifyGitHubSignature(payload, signature) {
  if (!WEBHOOK_SECRET) return true; // Skip if not configured
  const sig = signature?.replace('sha256=', '');
  if (!sig) return false;
  const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET).update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(hmac));
}

/**
 * Handle GitHub PR webhook event
 */
async function handlePullRequest(event) {
  const { action, pull_request, repository } = event;
  
  // Only process opened or updated PRs
  if (action !== 'opened' && action !== 'synchronize') {
    return { status: 'skipped', reason: `action=${action}` };
  }

  const repoFullName = repository.full_name;
  const subs = readSubs();
  const sub = subs[repoFullName];

  // Check subscription
  if (!sub || sub.expires_at < new Date().toISOString()) {
    return { status: 'no_subscription', message: 'Subscribe to enable AI code review' };
  }

  // Get PR diff
  const prUrl = pull_request.diff_url;
  const prNumber = pull_request.number;

  // Analyze the code with DeepSeek
  const analysis = await analyzePullRequest(prUrl, pull_request);

  // Post comment to GitHub
  if (sub.github_token && analysis.review) {
    await postGitHubComment(repository, prNumber, analysis.review, sub.github_token);
  }

  return { status: 'reviewed', pr: prNumber, findings: analysis.findings || 0 };
}

/**
 * Analyze PR diff using DeepSeek
 */
async function analyzePullRequest(diffUrl, pr) {
  try {
    // Fetch the diff
    const diffResp = await fetch(diffUrl);
    const diff = await diffResp.text();

    if (diff.length < 50) {
      return { review: null, findings: 0 };
    }

    // Call DeepSeek for analysis
    const { callAI } = require('/root/automaton/services/ai-tools.cjs');
    const review = await callAI([
      { role: 'system', content: 'You are an expert code reviewer. Analyze this PR diff and provide concise, actionable feedback. Focus on bugs, security issues, and code quality. Be brief.' },
      { role: 'user', content: `PR Title: ${pr.title}\n\nDiff:\n${diff.substring(0, 8000)}` }
    ]);

    // Count findings
    const findings = (review.match(/⚠️|🐛|🔒|❌/g) || []).length;

    return { review, findings };
  } catch (e) {
    return { review: null, error: e.message, findings: 0 };
  }
}

/**
 * Post review comment to GitHub PR
 */
async function postGitHubComment(repo, prNumber, body, token) {
  const url = `https://api.github.com/repos/${repo.full_name}/issues/${prNumber}/comments`;
  try {
    await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ body: `🤖 **AI Code Review**\n\n${body}` }),
    });
  } catch (e) {
    console.error(`Failed to post GitHub comment: ${e.message}`);
  }
}

/**
 * Subscribe a repo (called after x402 payment verified)
 */
function subscribeRepo(repoFullName, tier, githubToken, txHash) {
  const subs = readSubs();
  const tierInfo = TIERS[tier] || TIERS.single;
  
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + 1); // 1 month subscription

  subs[repoFullName] = {
    tier,
    github_token: githubToken,
    tx_hash: txHash,
    subscribed_at: new Date().toISOString(),
    expires_at: expiresAt.toISOString(),
    reviews_count: 0,
  };

  writeSubs(subs);
  return { success: true, expires_at: expiresAt.toISOString(), tier: tierInfo.name };
}

// Route handlers for gateway integration
module.exports = {
  handlePullRequest,
  verifyGitHubSignature,
  subscribeRepo,
  TIERS,
  AGENT_WALLET,
};
