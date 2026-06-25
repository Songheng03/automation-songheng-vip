/**
 * pastebin-service.cjs — PasteBin service for my-automaton gateway
 * 
 * Free tier: 3 pastes/day per IP
 * Premium: Unlimited pastes with API key (1 credit per paste)
 * 
 * Routes:
 *   POST /api/pastebin/free     — Free paste (3/day/IP)
 *   GET  /api/pastebin/:id       — View paste by ID
 *   GET  /api/pastebin/status    — Check free tier remaining
 *   POST /api/pastebin           — Premium paste (requires auth)
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PASTE_DIR = '/root/automaton/data/pastes';
const FREE_LIMIT = 3;

module.exports = function(app, requireAuth) {
  // Ensure paste directory exists
  if (!fs.existsSync(PASTE_DIR)) {
    fs.mkdirSync(PASTE_DIR, { recursive: true });
  }

  // Free tier rate limiter (in memory — resets on restart)
  const freeUsed = new Map();

  function getFreeKey(req) {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
               req.ip || 
               req.connection?.remoteAddress || 
               '0.0.0.0';
    const today = new Date().toISOString().slice(0, 10);
    return `${ip}::${today}`;
  }

  function getFreeCount(key) {
    return freeUsed.get(key) || 0;
  }

  function incrementFree(key) {
    freeUsed.set(key, getFreeCount(key) + 1);
  }

  function generatePasteId() {
    return crypto.randomBytes(4).toString('hex'); // 8-char hex ID
  }

  function savePaste(id, data) {
    const filePath = path.join(PASTE_DIR, `${id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return id;
  }

  function loadPaste(id) {
    const filePath = path.join(PASTE_DIR, `${id}.json`);
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  }

  // ─── FREE PASTE ENDPOINT (3/day/IP) ───
  app.post('/api/pastebin/free', (req, res) => {
    const key = getFreeKey(req);
    const count = getFreeCount(key);
    
    if (count >= FREE_LIMIT) {
      return res.status(402).json({
        error: 'Free limit reached (3/day). Get unlimited pastes with API key.',
        upgrade: '/upgrade',
        remaining: 0,
        free: false
      });
    }

    const { content, title, language, expires } = req.body || {};
    if (!content || content.length < 1) {
      return res.status(400).json({ error: 'content is required' });
    }
    if (content.length > 100000) {
      return res.status(400).json({ error: 'Content too large (max 100KB)' });
    }

    const id = generatePasteId();
    const paste = {
      id,
      title: (title || 'Untitled').slice(0, 100),
      language: (language || 'text').slice(0, 30),
      content,
      created: new Date().toISOString(),
      expires: expires || null,
      views: 0,
      free: true,
      ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || ''
    };

    savePaste(id, paste);
    incrementFree(key);

    res.json({
      success: true,
      id,
      url: `/api/pastebin/${id}`,
      remaining: Math.max(0, FREE_LIMIT - getFreeCount(key)),
      free: true
    });
  });

  // ─── PREMIUM PASTE ENDPOINT (requires API key) ───
  app.post('/api/pastebin', requireAuth, (req, res) => {
    const { content, title, language, expires } = req.body || {};
    if (!content || content.length < 1) {
      return res.status(400).json({ error: 'content is required' });
    }
    if (content.length > 500000) {
      return res.status(400).json({ error: 'Content too large (max 500KB)' });
    }

    const id = generatePasteId();
    const paste = {
      id,
      title: (title || 'Untitled').slice(0, 100),
      language: (language || 'text').slice(0, 30),
      content,
      created: new Date().toISOString(),
      expires: expires || null,
      views: 0,
      free: false,
      apiKey: req.apiKey?.slice(0, 12) || 'unknown'
    };

    savePaste(id, paste);

    res.json({
      success: true,
      id,
      url: `/api/pastebin/${id}`,
      credits_remaining: req.credits - 1,
      free: false
    });
  });

  // ─── VIEW PASTE ───
  app.get('/api/pastebin/:id', (req, res) => {
    const paste = loadPaste(req.params.id);
    if (!paste) {
      return res.status(404).json({ error: 'Paste not found or expired' });
    }

    // Increment view count
    paste.views = (paste.views || 0) + 1;
    savePaste(paste.id, paste);

    // Check if requester wants raw text
    const format = req.query.format || req.headers['accept'];
    if (format === 'raw' || format === 'text/plain') {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.send(paste.content);
    }

    // Return JSON by default
    res.json({
      id: paste.id,
      title: paste.title,
      language: paste.language,
      created: paste.created,
      views: paste.views,
      content: paste.content,
      free: paste.free
    });
  });

  // ─── STATUS ENDPOINT ───
  app.get('/api/pastebin/status', (req, res) => {
    const key = getFreeKey(req);
    const used = getFreeCount(key);
    res.json({
      remaining: Math.max(0, FREE_LIMIT - used),
      used,
      limit: FREE_LIMIT,
      upgrade: '/upgrade'
    });
  });

  // ─── LIST RECENT PASTES (admin/debug) ───
  app.get('/api/pastebin/list/recent', (req, res) => {
    try {
      const files = fs.readdirSync(PASTE_DIR)
        .filter(f => f.endsWith('.json'))
        .sort()
        .slice(-20)
        .map(f => {
          const data = JSON.parse(fs.readFileSync(path.join(PASTE_DIR, f), 'utf8'));
          return {
            id: data.id,
            title: data.title,
            language: data.language,
            created: data.created,
            views: data.views,
            size: data.content?.length || 0,
            free: data.free
          };
        });
      res.json({ pastes: files, total: files.length });
    } catch(e) {
      res.json({ pastes: [], total: 0 });
    }
  });

  console.log('[pastebin] Service loaded: free 3/day, premium unlimited');
};
