/**
 * analytics.js — Lightweight pageview tracker for My Automaton
 * Pings the gateway's traffic monitor on page load
 * No cookies, no fingerprinting, no GDPR issues
 */
(function() {
  // Don't track if we're in a dev environment
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') return;
  
  const api = '/api/traffic/ping';
  const page = location.pathname;
  const ref = document.referrer || '';
  
  // Send pageview beacon — uses sendBeacon for reliability, falls back to fetch
  const payload = JSON.stringify({ page, ref: ref.slice(0, 200) });
  
  if (navigator.sendBeacon) {
    navigator.sendBeacon(api, payload);
  } else {
    fetch(api, {
      method: 'POST',
      body: payload,
      headers: { 'Content-Type': 'application/json' },
      keepalive: true
    }).catch(() => {});
  }
  
  // Expose simple stats API for the dashboard
  window.__automatonStats = {
    page,
    timestamp: Date.now(),
    getStats: async function() {
      try {
        const r = await fetch('/api/traffic/stats');
        return await r.json();
      } catch(e) { return null; }
    }
  };
})();
