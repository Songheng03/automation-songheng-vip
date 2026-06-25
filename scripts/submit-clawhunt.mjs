#!/usr/bin/env node
/**
 * clawhunt-submit.js — Submit my-automaton to ClawHunt.com
 * 
 * ClawHunt (https://clawhunt.com) is Product Hunt for AI Agents/Tools.
 * Submit form: https://clawhunt.com/tools/new
 * 
 * This generates the submission payload and can attempt API submission
 * or print the manual submission form.
 */

const https = require('https');

const SUBMISSION = {
  name: 'my-automaton',
  tagline: 'AI Code Review & Security API — Pay-Per-Use From 1¢',
  description: `my-automaton is a sovereign AI agent that provides code review, security scanning, text analysis, and summarization via REST API. Pay only for what you use — no subscription required.

Key features:
• AI code review with quality scoring (0-100)
• Security vulnerability detection (SQL injection, XSS, reentrancy, hardcoded secrets)
• Multi-language support: JS, TS, Python, Solidity, Go, Rust, Java
• Text analysis and summarization
• Free tier: 3 requests/day per IP (no signup)
• Pay-per-use from 1¢ per request
• MCP compatible — works with Claude, Cursor, Cline
• GitHub Actions integration for PR auto-review
• x402 micropayments on Base chain (USDC)

The agent is self-sustaining — every API call keeps it alive.`,
  url: 'https://automation.songheng.vip',
  github_url: '',
  twitter_url: '',
  category: 'Developer Tools',
  pricing: 'Free tier + Pay-per-use ($5-$50 credit packs)',
  platform: 'API / MCP / REST',
  use_cases: 'Code review automation, security auditing, CI/CD pipeline integration, AI-assisted development',
  features: 'AI code review, security scanning, multi-language analysis, MCP protocol, GitHub Actions, free tier, Stripe payments, USDC micropayments',
  target_audience: 'Developers, DevOps teams, security engineers, open source maintainers'
};

function attemptApiSubmit() {
  return new Promise((resolve) => {
    const data = JSON.stringify(SUBMISSION);
    const req = https.request({
      hostname: 'clawhunt.com',
      path: '/api/tools',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'User-Agent': 'my-automaton/1.0'
      }
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        console.log(`ClawHunt API response: ${res.statusCode}`);
        console.log(body.substring(0, 500));
        resolve({ status: res.statusCode, body });
      });
    });
    req.on('error', (e) => {
      console.log(`API submission failed: ${e.message}`);
      resolve({ status: 0, error: e.message });
    });
    req.write(data);
    req.end();
  });
}

async function main() {
  console.log('=== ClawHunt.com Submission Generator ===\n');
  console.log('Tool Name:', SUBMISSION.name);
  console.log('Tagline:', SUBMISSION.tagline);
  console.log('URL:', SUBMISSION.url);
  console.log('Category:', SUBMISSION.category);
  console.log('');

  // Try API submission
  console.log('Attempting API submission...');
  const result = await attemptApiSubmit();
  
  if (result.status === 200 || result.status === 201) {
    console.log('\n✅ Successfully submitted to ClawHunt!');
  } else {
    console.log('\n⚠️  API submission failed or requires manual form.');
    console.log('\n📋 MANUAL SUBMISSION INSTRUCTIONS:');
    console.log('  1. Go to https://clawhunt.com/tools/new');
    console.log('  2. Fill in the form with:');
    console.log(`     - Name: ${SUBMISSION.name}`);
    console.log(`     - Tagline: ${SUBMISSION.tagline}`);
    console.log(`     - Description: (paste the markdown above)`);
    console.log(`     - URL: ${SUBMISSION.url}`);
    console.log(`     - Category: ${SUBMISSION.category}`);
    console.log(`     - Pricing: ${SUBMISSION.pricing}`);
    console.log('  3. Submit the form');
    console.log('');
    console.log('📄 Full submission payload saved to content/submissions/clawhunt.json');
  }

  // Save for reference
  const fs = require('fs');
  const dir = '/root/automaton/content/submissions';
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(dir + '/clawhunt.json', JSON.stringify(SUBMISSION, null, 2));
  console.log('✅ Submission data saved to content/submissions/clawhunt.json');
}

main().catch(console.error);
