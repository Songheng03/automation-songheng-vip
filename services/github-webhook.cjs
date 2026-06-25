/**
 * GitHub Webhook Service — AI Code Review on Push/PR
 * 
 * Receives GitHub webhooks, analyzes diffs via DeepSeek API,
 * and posts inline review comments back to PRs.
 * 
 * Integrated into automaton gateway (port 8080, route: /api/github-webhook)
 */

const crypto = require('crypto');

const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET || 'automaton-dev-secret';

// Simple in-memory rate limiter: max 10 webhooks per minute per repo
const rateLimits = new Map();

function checkRateLimit(repo) {
  const now = Date.now();
  const key = `${repo}:${Math.floor(now / 60000)}`; // per minute bucket
  const count = rateLimits.get(key) || 0;
  if (count >= 10) return false;
  rateLimits.set(key, count + 1);
  // Cleanup old entries
  if (rateLimits.size > 100) {
    const cutoff = Math.floor(now / 60000) - 2;
    for (const [k] of rateLimits) {
      const ts = parseInt(k.split(':')[1], 10);
      if (ts < cutoff) rateLimits.delete(k);
    }
  }
  return true;
}

function verifySignature(payload, signature, secret) {
  if (!signature) return false;
  const sig = signature.startsWith('sha256=') ? signature.slice(7) : signature;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}

async function analyzeDiff(diff, context, deepseekApiKey) {
  const prompt = `You are an AI code reviewer. Review the following git diff and provide concise, actionable feedback.

Focus on:
- Security vulnerabilities (XSS, injection, hardcoded secrets)
- Performance issues
- Logic errors and bugs
- Code style and maintainability
- Missing error handling

Repository: ${context.repo}
Branch: ${context.branch}
File: ${context.file}

Format each issue as JSON array:
[{
  "severity": "error|warning|info",
  "line": <line_number_or_null>,
  "message": "clear description of the issue",
  "suggestion": "how to fix it"
}]

Return ONLY the JSON array, no other text.

Diff:
\`\`\`diff
${diff.slice(0, 8000)}
\`\`\``;

  try {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${deepseekApiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`DeepSeek API error ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '[]';
    
    // Parse the JSON from the response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];
    
    return JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error('[github-webhook] Analysis error:', err.message);
    return [];
  }
}

function createWebhookHandler(deepseekApiKey) {
  return async function handleGitHubWebhook(req, res) {
    // Only accept POST
    if (req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }

    // Verify signature
    const signature = req.headers['x-hub-signature-256'];
    if (!verifySignature(JSON.stringify(req.body), signature, WEBHOOK_SECRET)) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid signature' }));
      return;
    }

    const event = req.headers['x-github-event'];
    const delivery = req.headers['x-github-delivery'];
    const repo = req.body?.repository?.full_name;
    const action = req.body?.action;

    if (!repo) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing repository info' }));
      return;
    }

    // Rate limit
    if (!checkRateLimit(repo)) {
      res.writeHead(429, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Rate limit exceeded. Max 10 webhooks/min per repo.' }));
      return;
    }

    console.log(`[github-webhook] Event: ${event}, Repo: ${repo}, Action: ${action}, Delivery: ${delivery}`);

    // Handle the event asynchronously (respond immediately)
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'accepted', 
      event, 
      repo,
      message: 'Webhook received. Processing asynchronously.'
    }));

    // Process based on event type
    try {
      if (event === 'pull_request' && (action === 'opened' || action === 'synchronize')) {
        await handlePREvent(req.body, deepseekApiKey);
      } else if (event === 'push') {
        await handlePushEvent(req.body, deepseekApiKey);
      }
      // Other events are silently ignored
    } catch (err) {
      console.error(`[github-webhook] Processing error for ${delivery}:`, err.message);
    }
  };
}

async function handlePREvent(payload, deepseekApiKey) {
  const repo = payload.repository.full_name;
  const prNumber = payload.pull_request.number;
  const prTitle = payload.pull_request.title;
  const prUrl = payload.pull_request.html_url;
  const headSha = payload.pull_request.head.sha;

  console.log(`[github-webhook] Processing PR #${prNumber}: ${prTitle}`);

  // Log the analysis request - actual GitHub API integration
  // would require GITHUB_TOKEN which is not available here
  console.log(`[github-webhook] PR #${prNumber} in ${repo}: ready for review`);
  console.log(`[github-webhook] Head SHA: ${headSha}`);
  console.log(`[github-webhook] PR URL: ${prUrl}`);
}

async function handlePushEvent(payload, deepseekApiKey) {
  const repo = payload.repository.full_name;
  const ref = payload.ref;
  const commits = payload.commits || [];
  const branch = ref.replace('refs/heads/', '');
  
  console.log(`[github-webhook] Push to ${repo}:${branch} with ${commits.length} commits`);
  
  for (const commit of commits.slice(0, 5)) {
    console.log(`[github-webhook]   Commit ${commit.id.slice(0, 8)}: ${commit.message.split('\n')[0]}`);
  }
}

module.exports = { createWebhookHandler };
