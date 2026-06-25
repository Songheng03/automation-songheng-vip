/**
 * github-webhook-handler.cjs — RAW HTTP version for gateway.cjs
 * 
 * Processes GitHub webhook payloads, reviews code via DeepSeek, posts PR comments.
 * Works with raw http.createServer (not Express).
 * 
 * Exports: handleWebhook(body, apiKey, headers) -> Promise<{ok, review, credits_used, ...}>
 */

const crypto = require('crypto');
const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY || (() => { try { return JSON.parse(require('fs').readFileSync('/root/.automaton/automaton.json','utf-8')).deepseekApiKey; } catch { return ''; }})();
const API_KEYS_FILE = '/root/automaton/api-keys.json';

// Rate limiter per API key
const webhookRateMap = new Map();

function checkRateLimit(apiKey) {
  const now = Date.now();
  const windowMs = 60000;
  const maxPerWindow = 10;
  const entry = webhookRateMap.get(apiKey) || { count: 0, windowStart: now };
  if (now - entry.windowStart > windowMs) {
    entry.count = 0;
    entry.windowStart = now;
  }
  entry.count++;
  webhookRateMap.set(apiKey, entry);
  return {
    allowed: entry.count <= maxPerWindow,
    remaining: Math.max(0, maxPerWindow - entry.count),
    reset: new Date(entry.windowStart + windowMs).toISOString()
  };
}

function loadKeys() {
  try {
    if (require('fs').existsSync(API_KEYS_FILE)) {
      return JSON.parse(require('fs').readFileSync(API_KEYS_FILE, 'utf8'));
    }
  } catch(e) {}
  return {};
}

function saveKeys(keys) {
  require('fs').writeFileSync(API_KEYS_FILE, JSON.stringify(keys, null, 2));
}

function extractDiff(payload) {
  let code = '';
  if (payload.commits) {
    for (const commit of payload.commits) {
      if (commit.message) code += `Commit: ${commit.message}\n`;
      if (commit.added?.length) code += `Added: ${commit.added.join(', ')}\n`;
      if (commit.modified?.length) code += `Modified: ${commit.modified.join(', ')}\n`;
      if (commit.removed?.length) code += `Removed: ${commit.removed.join(', ')}\n`;
    }
  }
  if (payload.pull_request) {
    const pr = payload.pull_request;
    code += `PR #${pr.number}: ${pr.title}\n`;
    code += `Description: ${pr.body || 'N/A'}\n`;
    code += `Changed files: ${pr.changed_files || 'N/A'}\n`;
    code += `Additions: ${pr.additions || 'N/A'}, Deletions: ${pr.deletions || 'N/A'}\n`;
    if (pr.head && pr.base) code += `Branch: ${pr.head.ref} → ${pr.base.ref}\n`;
  }
  return code || 'No code changes detected';
}

async function performReview(code) {
  if (!DEEPSEEK_KEY) return 'AI service not configured on server.';
  try {
    const resp = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${DEEPSEEK_KEY}` },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: 'You are a senior code reviewer. Review the following code changes and provide:\n1. A brief summary of changes\n2. Potential issues or bugs (if any)\n3. Suggestions for improvement\n4. Security concerns (if any)\nBe concise, professional, and helpful. Keep total response under 500 words.' },
          { role: 'user', content: `Review these code changes:\n\n${code.substring(0, 15000)}` }
        ],
        max_tokens: 1500,
        temperature: 0.2
      })
    });
    if (!resp.ok) return `AI review failed (HTTP ${resp.status}).`;
    const data = await resp.json();
    return data.choices?.[0]?.message?.content || 'No review generated.';
  } catch (e) {
    return `AI review error: ${e.message}`;
  }
}

async function postGitHubComment(owner, repo, prNumber, comment, token) {
  const url = `https://api.github.com/repos/${owner}/${repo}/issues/${prNumber}/comments`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'my-automaton-ai-reviewer' },
    body: JSON.stringify({ body: comment })
  });
  if (!resp.ok) {
    const err = await resp.text();
    return { error: `GitHub API error ${resp.status}: ${err}` };
  }
  return await resp.json();
}

/**
 * Main handler — called from gateway.cjs
 * @param {object} body - Parsed JSON body from GitHub webhook
 * @param {string} apiKey - The API key from URL path
 * @param {object} headers - Request headers (for x-github-token)
 * @returns {Promise<object>} Result object
 */
async function handleWebhook(body, apiKey, headers = {}) {
  const startTime = Date.now();
  
  if (!apiKey) return { ok: false, status: 400, error: 'Missing API key in URL' };
  
  const keys = loadKeys();
  if (!keys[apiKey]) return { ok: false, status: 401, error: 'Invalid API key' };
  
  const creditCost = 2;
  if ((keys[apiKey].credits || 0) < creditCost) {
    return {
      ok: false, status: 402, error: 'insufficient_credits',
      message: 'Not enough credits. Purchase more at https://automation.songheng.vip/portal.html',
      credits: keys[apiKey].credits, required: creditCost
    };
  }
  
  const rateCheck = checkRateLimit(apiKey);
  if (!rateCheck.allowed) {
    return {
      ok: false, status: 429, error: 'rate_limit_exceeded',
      message: 'Too many webhook requests. Max 10 per minute per API key.',
      remaining: 0, reset: rateCheck.reset
    };
  }
  
  const githubToken = keys[apiKey].github_token || headers['x-github-token'] || '';
  
  const codeDiff = extractDiff(body);
  const reviewResult = await performReview(codeDiff);
  
  // Deduct credits
  keys[apiKey].credits -= creditCost;
  keys[apiKey].used = (keys[apiKey].used || 0) + creditCost;
  keys[apiKey].lastUsed = new Date().toISOString();
  saveKeys(keys);
  
  // Post comment if PR + token
  let commentResult = null;
  if (body.pull_request && githubToken) {
    const owner = body.repository?.owner?.login || body.repository?.owner?.name;
    const repo = body.repository?.name;
    const prNumber = body.pull_request.number;
    if (owner && repo && prNumber) {
      const signature = `\n\n---\n🤖 *Auto-reviewed by [my-automaton AI](https://automation.songheng.vip) (${creditCost} credits)*`;
      commentResult = await postGitHubComment(owner, repo, prNumber, reviewResult + signature, githubToken);
    }
  }
  
  return {
    ok: true, status: 200,
    review: reviewResult,
    credits_used: creditCost,
    credits_remaining: keys[apiKey].credits,
    comment_posted: !!(commentResult && !commentResult.error),
    comment_detail: commentResult,
    event: body.action || 'push',
    repo: body.repository?.full_name || 'unknown',
    elapsed_ms: Date.now() - startTime
  };
}

module.exports = { handleWebhook };
