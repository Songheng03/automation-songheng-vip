/**
 * Uptime Monitor Service — checks website availability
 * Mounted at /api/uptime/check
 */
import express from 'express';
import http from 'http';
import https from 'https';

const router = express.Router();

router.post('/check', async (req, res) => {
  try {
    const { url, timeout = 10000 } = req.body || {};
    if (!url) return res.status(400).json({ error: 'URL required' });

    // Normalize URL
    let targetUrl = url;
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl;
    }

    const start = Date.now();
    const result = await new Promise((resolve) => {
      const client = targetUrl.startsWith('https') ? https : http;
      const req = client.get(targetUrl, { timeout }, (resp) => {
        const statusCode = resp.statusCode;
        // Follow redirects
        if (statusCode >= 300 && statusCode < 400 && resp.headers.location) {
          resolve({ status: 'redirect', code: statusCode, location: resp.headers.location, ms: Date.now() - start });
          return;
        }
        resolve({ status: statusCode < 400 ? 'up' : 'degraded', code: statusCode, ms: Date.now() - start });
        resp.resume();
      });
      req.on('error', (e) => resolve({ status: 'down', error: e.message, ms: Date.now() - start }));
      req.on('timeout', () => { req.destroy(); resolve({ status: 'timeout', error: 'Request timed out', ms: Date.now() - start }); });
    });

    // Determine status emoji and description
    const statusInfo = {
      up: { emoji: '✅', label: 'Online' },
      degraded: { emoji: '⚠️', label: 'Degraded (4xx)' },
      redirect: { emoji: '↪️', label: 'Redirecting' },
      down: { emoji: '❌', label: 'Offline' },
      timeout: { emoji: '⏰', label: 'Timeout' }
    }[result.status] || { emoji: '❓', label: 'Unknown' };

    res.json({
      url: targetUrl,
      status: result.status,
      code: result.code,
      responseTimeMs: result.ms,
      label: statusInfo.label,
      emoji: statusInfo.emoji,
      checked: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Batch check
router.post('/batch', async (req, res) => {
  const { urls } = req.body || {};
  if (!urls || !Array.isArray(urls)) return res.status(400).json({ error: 'urls array required' });
  if (urls.length > 20) return res.status(400).json({ error: 'Max 20 URLs' });

  const results = [];
  for (const url of urls) {
    try {
      const resp = await fetch(`http://localhost:${process.env.PORT || 8080}/api/uptime/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      results.push(await resp.json());
    } catch {
      results.push({ url, status: 'error', error: 'Failed to check' });
    }
  }
  res.json({ results, total: results.length, failed: results.filter(r => r.status !== 'up').length });
});

export default router;
