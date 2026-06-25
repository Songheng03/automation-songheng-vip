/**
 * github-link-service.js — Links GitHub repos to API keys for auto-review + credit deduction
 * 
 * WHEN a PR webhook arrives for a linked repo:
 *   1. Looks up the API key for that repo
 *   2. Verifies the key has enough credits (5 per review)
 *   3. Deducts credits BEFORE the review runs
 *   4. Calls the existing github-webhook handler
 * 
 * API (added to gateway):
 *   POST /api/github/link   — { repo: "owner/repo", apiKey: "am_xxx" }
 *   GET  /api/github/links  — ?key=am_xxx → list linked repos
 *   DELETE /api/github/link — { repo: "owner/repo", apiKey: "am_xxx" }
 */

const fs = require('fs');
const path = require('path');

const LINKS_FILE = '/root/automaton/data/github-links.json';
const API_KEYS_FILE = '/root/automaton/data/api-keys.json';
const CREDIT_COST_FOR_REVIEW = 5; // one PR review costs 5 credits

function loadLinks() {
  try {
    if (fs.existsSync(LINKS_FILE)) {
      return JSON.parse(fs.readFileSync(LINKS_FILE, 'utf8'));
    }
  } catch(e) { console.error('[github-links] Error loading links:', e.message); }
  return {};
}

function saveLinks(links) {
  try {
    const dir = path.dirname(LINKS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(LINKS_FILE, JSON.stringify(links, null, 2));
  } catch(e) { console.error('[github-links] Error saving links:', e.message); }
}

function loadApiKeys() {
  try {
    if (fs.existsSync(API_KEYS_FILE)) {
      return JSON.parse(fs.readFileSync(API_KEYS_FILE, 'utf8'));
    }
  } catch(e) {}
  // Fallback to root api-keys.json
  try {
    if (fs.existsSync('/root/automaton/api-keys.json')) {
      return JSON.parse(fs.readFileSync('/root/automaton/api-keys.json', 'utf8'));
    }
  } catch(e) {}
  return {};
}

function saveApiKeys(keys) {
  try {
    const dir = path.dirname(API_KEYS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(API_KEYS_FILE, JSON.stringify(keys, null, 2));
    // Also write to root for backward compat
    fs.writeFileSync('/root/automaton/api-keys.json', JSON.stringify(keys, null, 2));
  } catch(e) { console.error('[github-links] Error saving keys:', e.message); }
}

function getRepoFromPayload(payload) {
  try {
    const body = typeof payload === 'string' ? JSON.parse(payload) : payload;
    if (body.repository) {
      return body.repository.full_name; // "owner/repo"
    }
    return null;
  } catch(e) { return null; }
}

/**
 * Handle POST /api/github/link — Link a repo to an API key
 * Body: { repo: "owner/repo", apiKey: "am_xxx" }
 */
function handleLink(req, res, body) {
  try {
    const { repo, apiKey } = body;
    if (!repo || !apiKey) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing repo or apiKey' }));
      return;
    }

    // Validate API key exists
    const keys = loadApiKeys();
    if (!keys[apiKey]) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'API key not found' }));
      return;
    }

    // Check if repo already linked
    const links = loadLinks();
    if (links[repo]) {
      res.writeHead(409, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Repo already linked', existing: links[repo] }));
      return;
    }

    // Store the link
    links[repo] = {
      apiKey,
      linkedAt: new Date().toISOString(),
      totalReviews: 0,
      totalCreditsUsed: 0
    };
    saveLinks(links);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, repo, apiKey: apiKey.slice(0, 12) + '...', credits: keys[apiKey].credits }));
  } catch(e) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: e.message }));
  }
}

/**
 * Handle GET /api/github/links — List repos linked to a key
 * Query: ?key=am_xxx
 */
function handleListLinks(req, res) {
  try {
    const q = require('url').parse(req.url, true).query;
    const key = q.key;
    if (!key) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing key parameter' }));
      return;
    }

    const links = loadLinks();
    const repos = Object.entries(links)
      .filter(([_, v]) => v.apiKey === key)
      .map(([repo, info]) => ({ repo, ...info }));

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ repos }));
  } catch(e) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: e.message }));
  }
}

/**
 * Handle DELETE /api/github/link — Unlink a repo from a key
 * Body: { repo: "owner/repo", apiKey: "am_xxx" }
 */
function handleUnlink(req, res, body) {
  try {
    const { repo, apiKey } = body;
    if (!repo || !apiKey) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing repo or apiKey' }));
      return;
    }

    const links = loadLinks();
    if (!links[repo] || links[repo].apiKey !== apiKey) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Link not found' }));
      return;
    }

    const info = links[repo];
    delete links[repo];
    saveLinks(links);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, repo, totalReviews: info.totalReviews, totalCreditsUsed: info.totalCreditsUsed }));
  } catch(e) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: e.message }));
  }
}

/**
 * Middleware: Deduct credits BEFORE a PR review runs
 * Called by gateway on /api/github-webhook
 * Returns { allowed: bool, apiKey: string|null, credits: number, error: string|null }
 */
function tryDeductCredits(repo) {
  const links = loadLinks();
  const link = links[repo];
  
  if (!link) {
    return { allowed: false, apiKey: null, error: 'Repo not linked to any API key' };
  }

  const keys = loadApiKeys();
  const keyData = keys[link.apiKey];

  if (!keyData) {
    return { allowed: false, apiKey: link.apiKey, error: 'Linked API key no longer valid' };
  }

  if ((keyData.credits || 0) < CREDIT_COST_FOR_REVIEW) {
    return { allowed: false, apiKey: link.apiKey, error: `Insufficient credits. Need ${CREDIT_COST_FOR_REVIEW}, have ${keyData.credits || 0}` };
  }

  // Deduct credits
  keyData.credits = (keyData.credits || 0) - CREDIT_COST_FOR_REVIEW;
  keyData.used = (keyData.used || 0) + CREDIT_COST_FOR_REVIEW;
  saveApiKeys(keys);

  // Update link stats
  link.totalReviews = (link.totalReviews || 0) + 1;
  link.totalCreditsUsed = (link.totalCreditsUsed || 0) + CREDIT_COST_FOR_REVIEW;
  saveLinks(loadLinks()); // Reload to avoid race — simplified for single-thread

  return { 
    allowed: true, 
    apiKey: link.apiKey, 
    credits: keyData.credits,
    creditsUsed: CREDIT_COST_FOR_REVIEW
  };
}

/**
 * Handle POST /api/github-webhook — wraps the existing webhook handler with credit deduction
 */
async function handleWebhook(req, res, body, existingWebhookHandler) {
  const repo = getRepoFromPayload(body);
  
  if (!repo) {
    // Can't determine repo — pass through to existing handler anyway
    if (existingWebhookHandler) {
      return existingWebhookHandler(req, res);
    }
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Could not determine repo from webhook' }));
    return;
  }

  // Try to deduct credits first
  const deduction = tryDeductCredits(repo);
  
  if (deduction.allowed) {
    console.log(`[github-links] Deducted ${CREDIT_COST_FOR_REVIEW} credits for ${repo} review. Remaining: ${deduction.credits}`);
  } else if (deduction.apiKey) {
    // Repo is linked but insufficient credits or other error
    console.log(`[github-links] Credit deduction failed for ${repo}: ${deduction.error}`);
  }

  // Always pass through to existing handler — it handles unlinked repos gracefully
  if (existingWebhookHandler) {
    await existingWebhookHandler(req, res);
  } else {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      ok: true, 
      creditDeduction: deduction.allowed ? { deducted: true, creditsUsed: CREDIT_COST_FOR_REVIEW } : { deducted: false, reason: deduction.error }
    }));
  }
}

module.exports = {
  handleLink,
  handleListLinks,
  handleUnlink,
  tryDeductCredits,
  handleWebhook,
  CREDIT_COST_FOR_REVIEW
};
