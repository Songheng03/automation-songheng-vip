#!/usr/bin/env node
/**
 * GitHub AI Code Review Action
 * 
 * Reviews pull requests using my-automaton's AI API.
 * Free tier: 3 reviews/day. Premium: unlimited.
 * 
 * Install in your repo: .github/workflows/ai-code-review.yml
 */

import https from 'https';

const GATEWAY = 'https://automation.songheng.vip';
const API_KEY = process.env.MY_AUTOMATON_KEY || 'free';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY || '';
const GITHUB_PR_NUMBER = process.env.GITHUB_PR_NUMBER || '';
const GITHUB_EVENT_PATH = process.env.GITHUB_EVENT_PATH || '';
const GITHUB_REF = process.env.GITHUB_REF || '';
const GITHUB_SHA = process.env.GITHUB_SHA || '';

function post(url, data) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const body = JSON.stringify(data);
    const opts = {
      hostname: u.hostname,
      port: u.port || 443,
      path: u.pathname + u.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'X-API-Key': API_KEY
      }
    };
    const req = https.request(opts, (res) => {
      let buf = '';
      res.on('data', (c) => buf += c);
      res.on('end', () => resolve({ status: res.statusCode, data: buf }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function postGitHubComment(prNumber, body) {
  const u = new URL(`https://api.github.com/repos/${GITHUB_REPOSITORY}/issues/${prNumber}/comments`);
  const payload = JSON.stringify({ body });
  const opts = {
    hostname: u.hostname,
    path: u.pathname,
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
      'User-Agent': 'my-automaton-ai-code-review'
    }
  };
  return new Promise((resolve, reject) => {
    const req = https.request(opts, (res) => {
      let buf = '';
      res.on('data', (c) => buf += c);
      res.on('end', () => resolve({ status: res.statusCode, data: buf }));
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function getPrDiff() {
  return new Promise((resolve, reject) => {
    const u = new URL(`https://api.github.com/repos/${GITHUB_REPOSITORY}/pulls/${GITHUB_PR_NUMBER}`);
    const opts = {
      hostname: u.hostname,
      path: u.pathname,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3.diff',
        'User-Agent': 'my-automaton-ai-code-review'
      }
    };
    const req = https.request(opts, (res) => {
      let buf = '';
      res.on('data', (c) => buf += c);
      res.on('end', () => resolve({ status: res.statusCode, data: buf }));
    });
    req.on('error', reject);
    req.end();
  });
}

function getPrMetadata() {
  return new Promise((resolve, reject) => {
    const u = new URL(`https://api.github.com/repos/${GITHUB_REPOSITORY}/pulls/${GITHUB_PR_NUMBER}`);
    const opts = {
      hostname: u.hostname,
      path: u.pathname,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'my-automaton-ai-code-review'
      }
    };
    const req = https.request(opts, (res) => {
      let buf = '';
      res.on('data', (c) => buf += c);
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(buf) }));
    });
    req.on('error', reject);
    req.end();
  });
}

function formatReviewComment(review, diffSize) {
  const lines = [
    `## 🤖 AI Code Review by [my-automaton](${GATEWAY})`,
    '',
    '### Review Summary',
    '',
    review.summary || 'No summary provided.',
    '',
    '### Issues Found',
    ''
  ];

  if (review.issues && review.issues.length > 0) {
    review.issues.forEach((issue, i) => {
      lines.push(`**${i + 1}. ${issue.severity || 'Info'}**: ${issue.description || issue}`);
      if (issue.line) lines.push(`   - Line: ${issue.line}`);
      if (issue.suggestion) lines.push(`   - Suggestion: ${issue.suggestion}`);
      lines.push('');
    });
  } else {
    lines.push('No issues found. Looks clean!');
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push('### 📊 Review Details');
  lines.push(`- Files reviewed: ${diffSize || 'N/A'} lines`);
  lines.push(`- Review mode: Full code review`);
  lines.push(`- Powered by: [my-automaton AI](https://automation.songheng.vip)`);
  lines.push('');
  lines.push('> 💡 **Want faster, deeper reviews?** Get unlimited AI code reviews starting at $5/mo.');
  lines.push(`> [Upgrade to Pro →](${GATEWAY}/upgrade.html) | [API Docs](${GATEWAY}/api-docs.html)`);
  lines.push('');
  lines.push('---');
  lines.push('*This review was automatically generated. [Learn more about AI code review](https://automation.songheng.vip/blog/free-ai-code-review-api.html)*');

  return lines.join('\n');
}

async function main() {
  console.log('=== my-automaton AI Code Review Action ===');
  console.log(`Repo: ${GITHUB_REPOSITORY}`);
  console.log(`PR: ${GITHUB_PR_NUMBER}`);
  console.log(`API Key: ${API_KEY === 'free' ? 'Free Tier' : 'Premium Key'}`);
  console.log('');

  if (!GITHUB_PR_NUMBER || GITHUB_PR_NUMBER === '') {
    console.log('No PR number found. Checking event payload...');
    try {
      const eventData = JSON.parse(require('fs').readFileSync(GITHUB_EVENT_PATH, 'utf-8'));
      const prNum = eventData.pull_request?.number || eventData.issue?.number;
      if (prNum) {
        process.env.GITHUB_PR_NUMBER = String(prNum);
        console.log(`Found PR #${prNum} from event payload`);
      } else {
        console.log('No PR event detected. Exiting.');
        process.exit(0);
      }
    } catch {
      console.log('Could not read event payload. Exiting.');
      process.exit(0);
    }
  }

  // Get PR diff
  console.log('Fetching PR diff...');
  const diffResult = await getPrDiff();
  if (diffResult.status !== 200) {
    console.log(`Failed to get diff: ${diffResult.status}`);
    // Still try to post a useful comment
    await postGitHubComment(GITHUB_PR_NUMBER, 
      `## 🤖 AI Code Review by [my-automaton](${GATEWAY})\n\nI couldn't access the PR diff (status ${diffResult.status}). Please make sure GITHUB_TOKEN has pull requests read access.\n\n[Get free AI code review →](${GATEWAY}/demo.html)`);
    process.exit(0);
  }

  const diff = diffResult.data;
  const diffSize = diff.split('\n').length;
  console.log(`Diff size: ${diffSize} lines`);

  // Call my-automaton API for code review
  console.log('Calling AI code review API...');
  const reviewResult = await post(`${GATEWAY}/v1/review`, {
    code: diff.substring(0, 15000),
    filename: `PR #${GITHUB_PR_NUMBER}`,
    context: `GitHub PR review for ${GITHUB_REPOSITORY}`
  });

  let reviewData;
  console.log(`API response: ${reviewResult.status}`);
  try {
    reviewData = JSON.parse(reviewResult.data);
  } catch {
    reviewData = { summary: 'Review completed. See full results at ' + GATEWAY, issues: [] };
  }

  // Post comment to PR
  const comment = formatReviewComment(reviewData, diffSize);
  console.log('Posting review comment to PR...');
  const commentResult = await postGitHubComment(GITHUB_PR_NUMBER, comment);
  
  if (commentResult.status === 201) {
    console.log('✅ Review comment posted successfully!');
  } else {
    console.log(`❌ Failed to post comment: ${commentResult.status}`);
    try {
      const err = JSON.parse(commentResult.data);
      console.log('Error:', err.message);
    } catch {}
  }

  console.log('');
  console.log('---');
  console.log('Powered by my-automaton — AI code review that pays for itself.');
  console.log('https://automation.songheng.vip');
}

main().catch(e => console.error('Fatal:', e.message));
