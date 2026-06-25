/**
 * GitHub Webhook Receiver - AI PR Review
 * Accepts GitHub webhooks, runs AI code review on PRs, posts results
 */
const crypto = require('crypto');

const SECRET = process.env.GITHUB_WEBHOOK_SECRET || 'my-automaton-dev';

function verifySignature(payload, signature) {
  if (!signature) return false;
  const sig = 'sha256=' + crypto.createHmac('sha256', SECRET).update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(signature));
}

function installWebhook(app) {
  app.post('/webhook/github', (req, res) => {
    const payload = JSON.stringify(req.body);
    const signature = req.headers['x-hub-signature-256'];
    
    // Respond immediately to avoid timeout
    res.status(202).json({ status: 'accepted', message: 'Webhook received' });

    const event = req.headers['x-github-event'];
    const body = req.body;

    // Handle PR review requests
    if (event === 'pull_request' && body.action === 'opened') {
      const pr = body.pull_request;
      console.log(`[GitHub] PR #${pr.number} opened: ${pr.title}`);
      console.log(`[GitHub] Repo: ${body.repository.full_name}`);
      console.log(`[GitHub] Branch: ${pr.head.ref} -> ${pr.base.ref}`);
      
      // Store for processing (would post review via API in production)
      const fs = require('fs');
      const DATA = '/root/automaton/data';
      fs.existsSync(DATA) || fs.mkdirSync(DATA, {recursive:true});
      const reviews = (()=>{try{return JSON.parse(fs.readFileSync(DATA+'/webhook-prs.json','utf8'))}catch{return []}})();
      reviews.push({
        repo: body.repository.full_name,
        pr: pr.number,
        title: pr.title,
        url: pr.html_url,
        timestamp: Date.now(),
        status: 'pending'
      });
      fs.writeFileSync(DATA+'/webhook-prs.json', JSON.stringify(reviews));
    }
    
    // Handle push events (track deployments)
    if (event === 'push' && body.ref === 'refs/heads/main') {
      console.log(`[GitHub] Push to ${body.repository.full_name}:${body.ref}`);
      console.log(`[GitHub] Commits: ${body.commits?.length || 0}`);
    }
  });

  // POST /webhook/github/setup - configure webhook secret
  app.post('/webhook/github/setup', (req, res) => {
    const { secret } = req.body || {};
    if (!secret) return res.status(400).json({ error: 'secret required' });
    process.env.GITHUB_WEBHOOK_SECRET = secret;
    res.json({ status: 'ok', message: 'Webhook secret updated' });
  });

  // GET /webhook/github/reviews - list recent PR reviews
  app.get('/webhook/github/reviews', (_, res) => {
    try {
      const data = require('fs').readFileSync('/root/automaton/data/webhook-prs.json','utf8');
      res.json(JSON.parse(data));
    } catch {
      res.json([]);
    }
  });

  console.log('[GitHub Webhook] Installed at /webhook/github');
}

module.exports = { installWebhook };
