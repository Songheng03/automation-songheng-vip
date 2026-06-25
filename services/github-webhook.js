/**
 * GitHub Webhook Integration Service
 * 
 * Automatically reviews every PR pushed to a repo.
 * Install: Add webhook → https://automation.songheng.vip/api/github-webhook
 * 
 * Revenue model: Free for 3 reviews/repo/day, then requires API key
 */

const crypto = require('crypto');

const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET || 'my-automaton-github-secret';

async function handleWebhook(req, res) {
  // Verify signature
  const signature = req.headers['x-hub-signature-256'];
  if (!signature) {
    return res.status(401).json({ error: 'Missing signature' });
  }
  
  const body = JSON.stringify(req.body);
  const expected = 'sha256=' + crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(body)
    .digest('hex');
  
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  const event = req.headers['x-github-event'];
  
  // Only process PR events
  if (event === 'pull_request' && 
      (req.body.action === 'opened' || req.body.action === 'synchronize')) {
    
    const pr = req.body.pull_request;
    const repo = req.body.repository.full_name;
    const prNumber = pr.number;
    const prTitle = pr.title;
    const diffUrl = pr.diff_url;
    
    console.log(`[GitHub Webhook] PR #${prNumber} on ${repo}: ${prTitle}`);
    
    // Download the diff
    try {
      const diffRes = await fetch(diffUrl, {
        headers: { 'Accept': 'application/vnd.github.v3.diff' }
      });
      const diff = await diffRes.text();
      
      if (diff.length > 50000) {
        console.log(`[GitHub Webhook] Diff too large (${diff.length} chars), skipping`);
        return res.json({ status: 'skipped', reason: 'diff_too_large' });
      }
      
      // Send to our AI review API
      const reviewRes = await fetch('http://localhost:8080/api/free/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: diff, language: 'auto' })
      });
      
      if (!reviewRes.ok) {
        console.log(`[GitHub Webhook] Review API error: ${reviewRes.status}`);
        return res.json({ status: 'error', reason: 'api_error' });
      }
      
      const review = await reviewRes.json();
      
      // Post review as PR comment via GitHub API
      const token = process.env.GITHUB_TOKEN;
      if (token) {
        const commentBody = `## 🤖 AI Code Review\n\n${review.result || review.response || review.text}\n\n---\n_Powered by [my-automaton](https://automation.songheng.vip)_`;
        
        await fetch(`https://api.github.com/repos/${repo}/issues/${prNumber}/comments`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.github.v3+json'
          },
          body: JSON.stringify({ body: commentBody })
        });
        
        console.log(`[GitHub Webhook] Posted review comment on PR #${prNumber}`);
      }
      
      return res.json({ status: 'success', pr: prNumber });
      
    } catch (err) {
      console.error(`[GitHub Webhook] Error: ${err.message}`);
      return res.status(500).json({ error: err.message });
    }
  }
  
  // Acknowledge other events silently
  res.json({ status: 'ignored', event });
}

module.exports = { handleWebhook };
