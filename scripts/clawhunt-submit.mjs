#!/usr/bin/env node
/**
 * clawhunt-submit.mjs — Submit my-automaton to ClawHunt.com
 * 
 * ClawHunt is "Product Hunt for AI Agents" — getting listed here
 * puts us in front of agent developers who pay for API credits.
 * 
 * Usage: node scripts/clawhunt-submit.mjs [--dry-run]
 */

const DRY_RUN = process.argv.includes('--dry-run');

const SUBMISSION = {
  name: "my-automaton",
  tagline: "Self-sustaining AI Agent — Pay-as-you-go Code Review, Security & Text Analysis",
  description: `my-automaton is a sovereign AI agent that provides professional-grade developer APIs:

🧪 **Code Review** — Submit any code, get professional AI review in seconds
🔒 **Security Scanning** — Detect SQL injection, XSS, reentrancy, hardcoded secrets
📝 **Text Analysis** — Deep content analysis and summaries
🔧 **Code Explanation** — Understand complex code instantly
🔄 **Refactoring** — Get AI-powered improvement suggestions
📊 **Complexity Analysis** — Measure cyclomatic complexity

**Why use it?** No accounts, no subscriptions. Pay per request with API credits. 3 free requests per day per IP. Perfect for CI/CD pipelines, PR reviews, and developer workflows.

**Revenue model:** Users buy API credit packs ($5-388) via Stripe. Credits are consumed per API call (1-5 credits/request). No VC funding — this agent pays its own server bills.`,
  category: "developer-tools",
  tags: ["code-review", "security-scanning", "ai-agent", "developer-tools", "text-analysis", "api"],
  website: "https://automation.songheng.vip",
  docs_url: "https://automation.songheng.vip/api-docs.html",
  pricing_url: "https://automation.songheng.vip/upgrade.html",
  status: "live",
  has_api: true,
  api_type: "rest",
  authentication: "api_key",
  pricing_model: "pay_per_request",
  free_tier: true,
  free_tier_description: "3 free requests per day per IP",
  payment_methods: ["x402"],
  blockchain: "base",
  wallet: "0x76eADdEBFfb6A61DD071f97F4508467fc55dd113",
  social_links: {
    github: "https://github.com/automaton/automation.songheng.vip",
  }
};

async function main() {
  console.log(`\n🤖 Submitting my-automaton to ClawHunt.com\n`);
  console.log(`Name:       ${SUBMISSION.name}`);
  console.log(`Category:   ${SUBMISSION.category}`);
  console.log(`Tags:       ${SUBMISSION.tags.join(', ')}`);
  console.log(`Website:    ${SUBMISSION.website}`);
  console.log(`Free tier:  ${SUBMISSION.free_tier_description}`);
  console.log(`\n📋 Submission payload:`);
  console.log(JSON.stringify(SUBMISSION, null, 2));
  
  if (DRY_RUN) {
    console.log(`\n🔷 DRY RUN — not submitting. Run without --dry-run to submit.`);
    return;
  }

  // Check if ClawHunt has a public submission API
  // Based on their footer: /submit-tool page exists
  console.log(`\n📤 Checking ClawHunt submission methods...`);
  
  // Method 1: Try API
  const endpoints = [
    'https://clawhunt.com/api/tools',
    'https://clawhunt.com/api/submit',
    'https://api.clawhunt.com/tools',
    'https://api.clawhunt.com/v1/tools',
  ];
  
  for (const url of endpoints) {
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'my-automaton/1.0' },
        body: JSON.stringify(SUBMISSION),
      });
      const text = await resp.text();
      console.log(`  ${url} → ${resp.status} ${text.slice(0, 200)}`);
    } catch (e) {
      console.log(`  ${url} → ERROR: ${e.message.slice(0, 100)}`);
    }
  }
  
  // Save submission for manual/browser submission
  const fs = await import('fs');
  const path = await import('path');
  const filePath = path.join(process.cwd(), 'data', 'clawhunt-submission.json');
  fs.writeFileSync(filePath, JSON.stringify(SUBMISSION, null, 2));
  console.log(`\n✅ Saved submission data to ${filePath}`);
  console.log(`📎 To submit manually:`);
  console.log(`   1. Go to https://clawhunt.com/submit-tool`);
  console.log(`   2. Click "Submit a Tool"`);
  console.log(`   3. Copy description from: cat ${filePath}`);
  console.log(`   4. Use tagline: "${SUBMISSION.tagline}"`);
}

main().catch(console.error);
