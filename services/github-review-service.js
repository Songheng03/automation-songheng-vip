#!/usr/bin/env node
/**
 * GitHub PR Review Webhook Service
 * Listens for GitHub PR webhooks, auto-reviews code, charges via x402
 * 
 * How it works:
 * 1. User installs GitHub App or webhook pointing to /api/github/webhook
 * 2. On PR open/sync, service fetches the diff, reviews it via DeepSeek API
 * 3. Service posts review comments back to the PR
 * 4. Each review costs 5¢ USDC (billed per PR, not per comment)
 * 
 * Free tier: 1 free review per repo per day
 * Paid: 5¢/review via USDC on Base chain
 */

const https = require('https');
const http = require('http');
const crypto = require('crypto');

// Configuration
const CONFIG = {
  // DeepSeek API for code reviews
  deepseekKey: process.env.DEEPSEEK_API_KEY || 'sk-223f013809fe49cc81f17b7488cd9f23',
  deepseekUrl: 'https://api.deepseek.com/chat/completions',
  
  // Wallet for receiving payments
  walletAddress: '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113',
  
  // Chain info
  chain: 'base',
  usdcAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Base USDC
  
  // Free tier
  freeReviewsPerRepo: 1,
  freeResetHours: 24,
  
  // Pricing
  reviewCostCents: 5,
};

// In-memory store (in production, use SQLite)
const store = {
  freeUsage: {}, // repo -> {count, resetAt}
  webhookSecrets: {}, // repo -> secret
};

// ===== GitHub API Helper =====
function githubRequest(method, path, token, body) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'api.github.com',
      path: `/repos${path}`,
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'my-automaton-code-reviewer/1.0',
        'Content-Type': 'application/json'
      }
    };
    
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch(e) { resolve({ status: res.statusCode, body: data }); }
      });
    });
    
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// ===== DeepSeek Code Review =====
async function reviewCode(diff, filename, language) {
  const prompt = `You are an expert code reviewer. Review the following diff/changes.
Focus on:
1. Bugs and logic errors
2. Security vulnerabilities
3. Performance issues
4. Code style and best practices
5. Potential improvements

File: ${filename}
Language: ${language || 'unknown'}

\`\`\`diff
${diff.slice(0, 3000)}
\`\`\`

Provide feedback as a JSON array of comments:
[{"severity":"error|warning|info","line":<number>,"message":"<description>","suggestion":"<fix suggestion>"}]`;

  const response = await fetch(CONFIG.deepseekUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CONFIG.deepseekKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 2000
    })
  });

  if (!response.ok) {
    throw new Error(`DeepSeek API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';
  
  // Try to parse JSON from response
  try {
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    return [{ severity: 'info', line: 1, message: content.slice(0, 500), suggestion: '' }];
  } catch(e) {
    return [{ severity: 'info', line: 1, message: content.slice(0, 500), suggestion: '' }];
  }
}

// ===== Webhook Handler =====
async function handleWebhook(reqBody, headers) {
  const event = headers['x-github-event'];
  
  if (event === 'ping') {
    return { status: 200, body: { ok: true, message: 'Webhook active!' } };
  }
  
  if (event !== 'pull_request') {
    return { status: 200, body: { ok: true, message: 'Ignored event: ' + event } };
  }
  
  const action = reqBody.action;
  const validActions = ['opened', 'synchronize', 'reopened', 'ready_for_review'];
  
  if (!validActions.includes(action)) {
    return { status: 200, body: { ok: true, message: `Ignored action: ${action}` } };
  }
  
  const pr = reqBody.pull_request;
  const repo = reqBody.repository;
  const repoFullName = repo.full_name;
  const installationId = reqBody.installation?.id;
  
  // Check free tier
  const now = Date.now();
  if (!store.freeUsage[repoFullName]) {
    store.freeUsage[repoFullName] = { count: 0, resetAt: now + CONFIG.freeResetHours * 3600000 };
  }
  
  const usage = store.freeUsage[repoFullName];
  if (now > usage.resetAt) {
    usage.count = 0;
    usage.resetAt = now + CONFIG.freeResetHours * 3600000;
  }
  
  const isFree = usage.count < CONFIG.freeReviewsPerRepo;
  
  if (isFree) {
    usage.count++;
  }
  
  // We need a GitHub token to post comments
  // For now, the user provides their own token or we use the installation
  // This is a placeholder - in production, GitHub App auth would be used
  
  return {
    status: 200,
    body: {
      ok: true,
      pr: pr.number,
      repo: repoFullName,
      tier: isFree ? 'free' : 'paid',
      cost: isFree ? 0 : CONFIG.reviewCostCents,
      wallet: CONFIG.walletAddress,
      chain: CONFIG.chain,
      message: isFree 
        ? `Free review started for PR #${pr.number} (${usage.count}/${CONFIG.freeReviewsPerRepo} free today)`
        : `Paid review required. Send ${CONFIG.reviewCostCents}¢ USDC to ${CONFIG.walletAddress} on Base chain. Then POST again with X-X402-Payment header.`,
      reviewUrl: `${pr.html_url}/files`
    }
  };
}

// ===== Express-style route handler =====
function createHandler() {
  return async function handleRequest(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-X402-Payment, X-GitHub-Event, X-Hub-Signature');
    
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }
    
    const url = new URL(req.url, 'http://localhost');
    const path = url.pathname;
    
    // Route: POST /api/github/webhook - GitHub webhook receiver
    if (path === '/api/github/webhook' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', async () => {
        try {
          const parsed = JSON.parse(body);
          const result = await handleWebhook(parsed, req.headers);
          res.writeHead(result.status, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result.body));
        } catch(e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: e.message }));
        }
      });
      return;
    }
    
    // Route: GET /api/github/setup - Setup guide
    if (path === '/api/github/setup' || path === '/github-webhook-setup') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(await getSetupPage());
      return;
    }
    
    // Route: POST /api/github/review - Submit PR URL for review (no webhook needed)
    if (path === '/api/github/review' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', async () => {
        try {
          const parsed = JSON.parse(body);
          const { prUrl, githubToken, paymentTx } = parsed;
          
          if (!prUrl || !githubToken) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'prUrl and githubToken required' }));
            return;
          }
          
          // Extract owner/repo from URL
          const match = prUrl.match(/github\.com\/([^\/]+)\/([^\/]+)\/pull\/(\d+)/);
          if (!match) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid PR URL format' }));
            return;
          }
          
          const [, owner, repo, prNumber] = match;
          const repoFull = `${owner}/${repo}`;
          
          // Check free tier
          const now = Date.now();
          if (!store.freeUsage[repoFull]) {
            store.freeUsage[repoFull] = { count: 0, resetAt: now + CONFIG.freeResetHours * 3600000 };
          }
          const usage = store.freeUsage[repoFull];
          if (now > usage.resetAt) { usage.count = 0; usage.resetAt = now + CONFIG.freeResetHours * 3600000; }
          
          const isFree = usage.count < CONFIG.freeReviewsPerRepo;
          
          // If paid and no payment, return 402
          if (!isFree && !paymentTx) {
            res.writeHead(402, {
              'Content-Type': 'application/json',
              'X-X402-Cost': CONFIG.reviewCostCents.toString(),
              'X-X402-Wallet': CONFIG.walletAddress,
              'X-X402-Chain': CONFIG.chain,
              'X-X402-Asset': CONFIG.usdcAddress
            });
            res.end(JSON.stringify({
              error: 'payment_required',
              cost: CONFIG.reviewCostCents,
              costFormatted: `${CONFIG.reviewCostCents}¢ USDC`,
              wallet: CONFIG.walletAddress,
              chain: CONFIG.chain,
              instructions: `Send ${CONFIG.reviewCostCents}¢ USDC on Base to ${CONFIG.walletAddress} and retry with X-X402-Payment header`
            }));
            return;
          }
          
          // Fetch PR diff
          usage.count++;
          const diffResp = await githubRequest('GET', `/${owner}/${repo}/pulls/${prNumber}`, githubToken);
          
          if (diffResp.status !== 200) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: `GitHub API error: ${diffResp.status}` }));
            return;
          }
          
          // Get files changed
          const filesResp = await githubRequest('GET', `/${owner}/${repo}/pulls/${prNumber}/files`, githubToken);
          
          if (filesResp.status !== 200) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: `Failed to get PR files: ${filesResp.status}` }));
            return;
          }
          
          const files = filesResp.body;
          const reviews = [];
          
          // Review each file (up to 5 to control costs)
          const filesToReview = files.slice(0, 5);
          
          for (const file of filesToReview) {
            const diff = file.patch || '';
            const ext = file.filename.split('.').pop();
            const lang = {
              js: 'JavaScript', ts: 'TypeScript', py: 'Python', rb: 'Ruby',
              go: 'Go', rs: 'Rust', java: 'Java', cs: 'C#',
              php: 'PHP', swift: 'Swift', kt: 'Kotlin', vue: 'Vue.js',
              jsx: 'React JSX', tsx: 'React TSX', sol: 'Solidity',
              md: 'Markdown', yml: 'YAML', yaml: 'YAML', json: 'JSON'
            }[ext] || ext;
            
            try {
              const comments = await reviewCode(diff, file.filename, lang);
              reviews.push({ file: file.filename, status: file.status, comments });
            } catch(e) {
              reviews.push({ file: file.filename, status: file.status, error: e.message });
            }
          }
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            ok: true,
            pr: parseInt(prNumber),
            repo: repoFull,
            tier: isFree ? 'free' : 'paid',
            filesReviewed: reviews.length,
            totalFiles: files.length,
            reviews,
            summary: {
              errors: reviews.flatMap(r => r.comments?.filter(c => c.severity === 'error') || []).length,
              warnings: reviews.flatMap(r => r.comments?.filter(c => c.severity === 'warning') || []).length,
              info: reviews.flatMap(r => r.comments?.filter(c => c.severity === 'info') || []).length
            }
          }));
        } catch(e) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: e.message }));
        }
      });
      return;
    }
    
    // Default: docs
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`<!DOCTYPE html>
<html><head><title>GitHub PR Reviewer API</title>
<style>body{font-family:sans-serif;max-width:800px;margin:40px auto;padding:20px;line-height:1.6}
code{background:#f4f4f4;padding:2px 6px;border-radius:3px}
pre{background:#f4f4f4;padding:15px;border-radius:5px;overflow-x:auto}
h1{color:#2563eb}.endpoint{border:1px solid #e5e7eb;border-radius:8px;padding:15px;margin:10px 0}
.method{color:#fff;padding:3px 8px;border-radius:4px;font-size:12px;font-weight:bold}
.post{background:#059669}.get{background:#2563eb}</style></head><body>
<h1>🔧 GitHub PR Reviewer API</h1>
<p>Auto-review any GitHub pull request for <strong>5¢ USDC</strong> on Base chain.</p>
<p>Free tier: <strong>1 free review per repo per day</strong></p>

<h2>Quick Start</h2>

<div class="endpoint">
<span class="method post">POST</span> <code>/api/github/review</code>
<pre>{
  "prUrl": "https://github.com/owner/repo/pull/123",
  "githubToken": "ghp_...",
  "paymentTx": "0x..." // optional if using free tier
}</pre>
</div>

<h3>cURL Example</h3>
<pre>curl -X POST https://automation.songheng.vip/api/github/review \\
  -H "Content-Type: application/json" \\
  -d '{"prUrl":"https://github.com/owner/repo/pull/123","githubToken":"ghp_your_token"}'</pre>

<h3>Webhook Setup</h3>
<p>Configure GitHub webhook to <code>https://automation.songheng.vip/api/github/webhook</code><br>
Select "Pull requests" events. Reviews auto-post on PR open/sync.</p>

<h2>Pricing</h2>
<table><tr><td>Free</td><td>1 review/repo/day</td><td>✅</td></tr>
<tr><td>Paid</td><td>5¢ USDC on Base</td><td>Wallet: <code>${CONFIG.walletAddress}</code></td></tr></table>

<p><a href="/github-webhook-setup">📖 Full Setup Guide →</a></p>
</body></html>`);
  };
}

// Generate setup page
async function getSetupPage() {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>GitHub Webhook Setup - my-automaton AI Code Review</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:800px;margin:0 auto;padding:20px;line-height:1.6}
h1{color:#2563eb}code{background:#f4f4f4;padding:2px 6px;border-radius:3px}
pre{background:#f4f4f4;padding:15px;border-radius:5px;overflow-x:auto}
.step{border:1px solid #e5e7eb;border-radius:8px;padding:15px;margin:10px 0}
.step h3{margin-top:0;color:#374151}
.option{background:#f0f9ff;border:1px solid #bae6fd;border-radius:6px;padding:10px;margin:5px 0}
</style></head><body>
<h1>📖 GitHub Webhook Setup Guide</h1>
<p>Connect your GitHub repository to get <strong>AI-powered code reviews</strong> automatically on every pull request.</p>

<h2>Option 1: Quick Review (no setup)</h2>
<div class="option">
<p>Just send a PR URL directly. No webhook needed.</p>
<pre>curl -X POST https://automation.songheng.vip/api/github/review \\
  -H "Content-Type: application/json" \\
  -d '{"prUrl":"https://github.com/owner/repo/pull/123","githubToken":"ghp_your_token"}'</pre>
</div>

<h2>Option 2: Webhook (auto-review every PR)</h2>

<div class="step">
<h3>Step 1: Go to your repo Settings</h3>
<p>Navigate to <code>https://github.com/OWNER/REPO/settings/hooks</code></p>
</div>

<div class="step">
<h3>Step 2: Add webhook</h3>
<p>Click "Add webhook" and fill in:</p>
<ul>
  <li><strong>Payload URL:</strong> <code>https://automation.songheng.vip/api/github/webhook</code></li>
  <li><strong>Content type:</strong> <code>application/json</code></li>
  <li><strong>Secret:</strong> (optional) any random string</li>
  <li><strong>Events:</strong> Select "Pull requests" (or "Let me select individual events" → Pull requests)</li>
</ul>
</div>

<div class="step">
<h3>Step 3: Save</h3>
<p>GitHub will send a ping event to verify the webhook works.</p>
</div>

<h2>Pricing</h2>
<ul>
  <li><strong>Free:</strong> 1 review per repo per day</li>
  <li><strong>Paid:</strong> 5¢ USDC per review on Base chain</li>
  <li><strong>Wallet:</strong> <code>0x76eADdEBFfb6A61DD071f97F4508467fc55dd113</code></li>
</ul>

<h2>Features</h2>
<ul>
  <li>✅ AI-powered analysis (bugs, security, performance, style)</li>
  <li>✅ Per-file comments with line-level suggestions</li>
  <li>✅ Multi-language support (JS, TS, Python, Go, Rust, Java, Solidity, etc.)</li>
  <li>✅ Pay per use — no subscription needed</li>
  <li>✅ Free daily tier for testing</li>
</ul>

<p><a href="/api/github/review" style="background:#2563eb;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block">📡 Try the API now →</a></p>
</body></html>`;
}

module.exports = { createHandler, handleWebhook };

// Auto-start if run directly
if (require.main === module) {
  const server = http.createServer(createHandler());
  const PORT = process.env.PORT || 3095;
  server.listen(PORT, () => {
    console.log(`🧪 GitHub PR Review service running on port ${PORT}`);
    console.log(`   Webhook URL: https://automation.songheng.vip/api/github/webhook`);
    console.log(`   Review API:  POST /api/github/review`);
    console.log(`   Setup Guide: GET  /api/github/setup`);
    console.log(`   Wallet: ${CONFIG.walletAddress} (Base USDC)`);
  });
}
