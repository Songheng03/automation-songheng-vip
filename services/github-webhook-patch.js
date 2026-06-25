// GitHub Webhook Route Patch for Gateway
// Patches gateway.js to add /api/github/webhook and /api/github routes
// Must be loaded via require() in gateway.js

const http = require('http');
const GATEWAY_PATH = '/root/automaton/gateway.js';
const fs = require('fs');

// The actual webhook handler
async function handleGitHubWebhook(req, res) {
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', async () => {
    try {
      const payload = JSON.parse(body || '{}');
      const event = req.headers['x-github-event'] || 'unknown';
      const repo = payload.repository?.full_name || 'unknown';
      
      if (event === 'ping') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', message: 'Webhook configured!', repo }));
        return;
      }
      
      // Check free tier limit (3 per day per repo)
      const now = Date.now();
      const day = Math.floor(now / 86400000);
      const counts = global.__gh_webhook_counts || new Map();
      const key = `${repo}:${day}`;
      const count = counts.get(key) || 0;
      
      // Simple analysis
      let grade = 'B';
      let score = 76;
      
      if (event === 'pull_request') {
        const action = payload.action;
        const prTitle = payload.pull_request?.title || 'Untitled PR';
        const prBody = payload.pull_request?.body || '';
        
        // Basic PR scoring
        const hasDesc = prBody.length > 50;
        const hasTesting = /test|spec|assert|jest|pytest|unittest/i.test(prBody);
        const hasCloses = /closes?|fixes?|resolves?|refs? /i.test(prBody);
        const hasChecklist = /-\s*\[/i.test(prBody);
        
        score = 50;
        if (hasDesc) score += 15;
        if (hasTesting) score += 15;
        if (hasCloses) score += 10;
        if (hasChecklist) score += 10;
        if (prTitle.length < 20) score -= 5;
        if (prTitle.length > 100) score -= 5;
        
        score = Math.max(10, Math.min(100, score));
        if (score >= 85) grade = 'A';
        else if (score >= 70) grade = 'B';
        else if (score >= 50) grade = 'C';
        else if (score >= 30) grade = 'D';
        else grade = 'F';
        
        const suggestions = [];
        if (grade === 'C' || grade === 'D' || grade === 'F') suggestions.push('Add a detailed PR description linking to the issue');
        if (!hasTesting) suggestions.push('Consider including test cases');
        if (!hasCloses) suggestions.push('Link related issues with "Closes #" notation');
        if (!hasChecklist) suggestions.push('Add a checklist for the reviewer');
        
        if (count < 3) {
          counts.set(key, count + 1);
          global.__gh_webhook_counts = counts;
        }
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'ok', event, repo, pr: payload.pull_request?.number,
          title: prTitle, grade, score,
          suggestions,
          freeRemaining: Math.max(0, 3 - count - 1),
          upgradeUrl: '/upgrade'
        }));
        return;
      }
      
      if (event === 'push') {
        const commits = payload.commits || [];
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'ok', event, repo,
          branch: (payload.ref || '').replace('refs/heads/', ''),
          commits: commits.length,
          message: `Received ${commits.length} commits. Premium analysis available.`,
          freeRemaining: Math.max(0, 3 - count),
          upgradeUrl: '/upgrade'
        }));
        return;
      }
      
      // Default
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', event, repo, note: 'Event received.' }));
      
    } catch(e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
  });
}

// Apply patch to gateway.js
function applyPatch() {
  let gateway = fs.readFileSync(GATEWAY_PATH, 'utf8');
  
  // Check if already patched
  if (gateway.includes('GITHUB_WEBHOOK_PATCHED')) {
    console.log('[github-webhook-patch] Already applied');
    return false;
  }
  
  // Add route handler after the badge handler section
  const patchCode = `
// [GITHUB_WEBHOOK_PATCHED] GitHub Webhook Handler
    if (p === '/api/github/webhook' && req.method === 'POST') {
      const gh = require('/root/automaton/services/github-webhook-patch.js');
      gh.handleGitHubWebhook(req, res);
      return;
    }
    if (p === '/api/github' && req.method === 'GET') {
      res.writeHead(200, {'Content-Type':'application/json'});
      res.end(JSON.stringify({service:'github-webhook',status:'ok',docs:'/github-webhook-setup'}));
      return;
    }
`;
  
  // Insert after the badge handler closing brace
  const marker = "    if (p.startsWith('/badge/') && req.method === 'GET') {";
  if (gateway.includes(marker)) {
    // Find the closing brace of the badge handler block
    const idx = gateway.indexOf(marker);
    const endBlock = gateway.indexOf('\n\n', idx + 80); // Find end of badge block
    
    if (endBlock > 0) {
      gateway = gateway.slice(0, endBlock) + '\n' + patchCode + gateway.slice(endBlock);
      fs.writeFileSync(GATEWAY_PATH, gateway);
      console.log('[github-webhook-patch] Gateway patched successfully');
      return true;
    }
  }
  
  console.log('[github-webhook-patch] Could not find insertion point');
  return false;
}

// Export for gateway
module.exports = { handleGitHubWebhook, applyPatch };

// Auto-apply when loaded
if (require.main !== module) {
  // Apply patch silently when required by gateway
  try { applyPatch(); } catch(e) { console.error('[github-webhook-patch] Error:', e.message); }
}

// Test run
if (require.main === module) {
  console.log('🔄 Applying GitHub webhook patch...');
  const result = applyPatch();
  console.log(result ? '✅ Patch applied!' : '⚠️ Already patched or failed');
}
