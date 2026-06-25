// service-reloader.js — Hot-reload services without killing the gateway
const fs = require('fs');
const path = require('path');

function mount(app) {
  if (!app) return;

  app.post('/api/reload', (req, res) => {
    const results = [];
    
    // Clear all service require caches
    for (const key of Object.keys(require.cache)) {
      if (key.includes('/services/') || key.includes('/root/services/')) {
        delete require.cache[key];
      }
    }

    const services = [
      'x402-service.js', 'free-tier-service.js', 'seo-meta-service.js',
      'seo-blog-service.js', 'seo-service.js', 'content-marketing-service.js',
      'pastebin-service.js', 'rss-feed-service.js', 'service-reloader.js'
    ];

    const bases = ['/root/automaton/services', '/root/services'];
    
    for (const name of services) {
      if (name === 'service-reloader.js') continue; // already loaded
      let loaded = false;
      for (const base of bases) {
        const p = path.join(base, name);
        if (fs.existsSync(p)) {
          try {
            const mod = require(p);
            if (mod && typeof mod.mount === 'function') {
              mod.mount(app);
              results.push({ service: name, status: 'mounted' });
              loaded = true;
            }
          } catch(e) {
            results.push({ service: name, status: 'error', message: e.message });
          }
          break;
        }
      }
      if (!loaded) results.push({ service: name, status: 'not-found' });
    }

    res.json({ reloaded: true, results, timestamp: new Date().toISOString() });
  });

  console.log('[RELOADER] Mounted: POST /api/reload');
}

module.exports = { mount };
