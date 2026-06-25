#!/usr/bin/env node
/**
 * webhook-service.cjs — GitHub PR review webhook handler
 * Run standalone or import into gateway.cjs
 * 
 * Usage: node webhook-service.cjs [--port 3099]
 * Gateway route: POST /api/github-webhook -> proxy to :3099
 */

const http = require('http');
const crypto = require('crypto');

const SECRET = process.env.GITHUB_WEBHOOK_SECRET || 'my-automaton-dev-2026';
const PORT = parseInt(process.argv[2] === '--port' ? process.argv[3] : 3099);
const GATEWAY = 'http://127.0.0.1:8080';

// Verify GitHub webhook signature
function verifySignature(payload, signature) {
  if (!signature || !SECRET) return true; // skip if not configured
  const sig = 'sha256=' + crypto.createHmac('sha256', SECRET).update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(signature));
}

// Format review comment for PR
function formatReview(result) {
  try {
    const data = typeof result === 'string' ? JSON.parse(result) : result;
    if (data.error) return `❌ Review error: ${data.error}`;
    
    const content = data.result || data;
    let text = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
    
    // Truncate for GitHub comment length
    if (text.length > 60000) text = text.substring(0, 60000) + '\n\n*...review truncated due to length*';
    
    return `## 🤖 AI Code Review by my-automaton\n\n${text}\n\n---\n*Powered by [my-automaton](https://automation.songheng.vip) — Free tier: 3 reviews/day*`;
  } catch {
    return `## 🤖 AI Code Review\n\n${String(result).substring(0, 60000)}`;
  }
}

// Post comment to GitHub PR
async function postPRComment(owner, repo, issueNumber, body, token) {
  if (!token) return { error: 'No GITHUB_TOKEN configured' };
  
  const url = `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'my-automaton'
    },
    body: JSON.stringify({ body })
  });
  return resp.json();
}

// Get PR diff
async function getPRDiff(owner, repo, pullNumber, token) {
  if (!token) return '';
  const url = `https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}`;
  const resp = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3.diff',
      'User-Agent': 'my-automaton'
    }
  });
  return resp.ok ? await resp.text() : '';
}

// Call gateway free review endpoint
async function callGatewayReview(code, language = 'javascript') {
  try {
    const resp = await fetch(`${GATEWAY}/free/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, language })
    });
    if (resp.ok) return await resp.json();
    return { error: `Gateway returned ${resp.status}` };
  } catch (e) {
    return { error: e.message };
  }
}

// Handle webhook event
async function handleWebhook(event, payload) {
  const action = payload.action;
  const token = process.env.GITHUB_TOKEN;
  
  // Only review on PR open or synchronize
  if (event === 'pull_request' && ['opened', 'synchronize'].includes(action)) {
    const pr = payload.pull_request;
    const { owner, repo } = { owner: payload.repository.owner.login, repo: payload.repository.name };
    const number = pr.number;
    
    console.log(`[webhook] PR #${number} ${action} in ${owner}/${repo}`);
    
    // Get diff
    const diff = await getPRDiff(owner, repo, number, token);
    if (!diff) {
      console.log('[webhook] No diff content, skipping');
      return { status: 'skipped', reason: 'no diff' };
    }
    
    // Call review
    const review = await callGatewayReview(diff);
    const comment = formatReview(review);
    
    // Post comment
    const result = await postPRComment(owner, repo, number, comment, token);
    console.log(`[webhook] Comment posted: ${result.id ? 'OK #' + result.id : 'FAILED'}`);
    
    return { status: result.id ? 'commented' : 'failed', pr: number, comment_id: result.id };
  }
  
  return { status: 'ignored', event, action };
}

// HTTP server
const server = http.createServer(async (req, res) => {
  const method = req.method;
  const pathname = new URL(req.url, 'http://localhost').pathname;
  
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Hub-Signature-256, X-GitHub-Event');
  
  if (method === 'OPTIONS') {
    res.writeHead(204); res.end(); return;
  }
  
  // Health
  if (pathname === '/health' && method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'webhook', port: PORT }));
    return;
  }
  
  // Webhook endpoint
  if (pathname === '/api/github-webhook' && method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', async () => {
      try {
        const event = req.headers['x-github-event'];
        const signature = req.headers['x-hub-signature-256'];
        
        // Verify
        if (!verifySignature(body, signature)) {
          res.writeHead(403); res.end(JSON.stringify({ error: 'Invalid signature' }));
          return;
        }
        
        if (!event) {
          res.writeHead(400); res.end(JSON.stringify({ error: 'Missing X-GitHub-Event' }));
          return;
        }
        
        const payload = JSON.parse(body);
        const result = await handleWebhook(event, payload);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (e) {
        console.error('[webhook] Error:', e.message);
        res.writeHead(500); res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }
  
  // Not found
  res.writeHead(404); res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`[webhook-service] Listening on port ${PORT}`);
  console.log(`[webhook-service] Endpoint: POST /api/github-webhook`);
  console.log(`[webhook-service] GitHub token: ${process.env.GITHUB_TOKEN ? 'configured' : 'NOT SET'}`);
  console.log(`[webhook-service] Gateway: ${GATEWAY}`);
});
