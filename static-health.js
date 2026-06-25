/**
 * Health endpoint module — provides /health, /status, /api/health
 * Simple JSON health check for monitoring and load balancers.
 */
module.exports = function(app) {
  const startTime = Date.now();
  const stats = { requests: 0, errors: 0, lastError: null };

  // Simple health check
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      uptime: Math.floor((Date.now() - startTime) / 1000),
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });
  });

  // Status endpoint with more detail
  app.get('/status', (req, res) => {
    const mem = process.memoryUsage();
    res.json({
      status: 'ok',
      uptime: Math.floor((Date.now() - startTime) / 1000),
      uptimeHuman: formatUptime(Date.now() - startTime),
      memory: {
        rss: Math.round(mem.rss / 1024 / 1024 * 100) / 100 + ' MB',
        heapUsed: Math.round(mem.heapUsed / 1024 / 1024 * 100) / 100 + ' MB',
        heapTotal: Math.round(mem.heapTotal / 1024 / 1024 * 100) / 100 + ' MB'
      },
      stats: {
        totalRequests: stats.requests,
        totalErrors: stats.errors,
        lastError: stats.lastError
      },
      timestamp: new Date().toISOString()
    });
  });

  // Track basic metrics
  app.use((req, res, next) => {
    stats.requests++;
    const origEnd = res.end;
    res.end = function(...args) {
      if (res.statusCode >= 400) {
        stats.errors++;
        stats.lastError = `${req.method} ${req.path} → ${res.statusCode}`;
      }
      return origEnd.apply(this, args);
    };
    next();
  });

  return stats;
};

function formatUptime(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  const parts = [];
  if (d) parts.push(d + 'd');
  if (h % 24) parts.push((h % 24) + 'h');
  if (m % 60) parts.push((m % 60) + 'm');
  if (s % 60 || !parts.length) parts.push((s % 60) + 's');
  return parts.join(' ');
}
