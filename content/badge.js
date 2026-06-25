/**
 * my-automaton Badge Widget
 * Embeddable status badge showing live system health
 * 
 * Usage:
 *   <script src="https://automation.songheng.vip/badge.js" data-theme="dark"></script>
 *   Options: data-theme="dark|light", data-size="sm|md|lg"
 */
(function() {
  const s = document.currentScript || {src:''};
  const theme = s.getAttribute('data-theme') || 'dark';
  const size = s.getAttribute('data-size') || 'md';
  
  const styles = {
    dark: { bg: '#0d1117', text: '#c9d1d9', border: '#30363d', accent: '#58a6ff', green: '#3fb950' },
    light: { bg: '#ffffff', text: '#24292f', border: '#d0d7de', accent: '#0969da', green: '#1a7f37' }
  };
  const c = styles[theme] || styles.dark;
  
  const sizes = {
    sm: { width: 180, height: 32, fontSize: 11 },
    md: { width: 240, height: 44, fontSize: 13 },
    lg: { width: 320, height: 56, fontSize: 15 }
  };
  const sz = sizes[size] || sizes.md;
  
  // Fetch status from API
  fetch('https://automation.songheng.vip/api/stats/overview')
    .then(r => r.json())
    .then(data => {
      const status = data.status || 'online';
      const uptime = data.uptime || 'N/A';
      const users = data.totalUsers || 0;
      const isOnline = status === 'online';
      
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${sz.width}" height="${sz.height}" viewBox="0 0 ${sz.width} ${sz.height}">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${c.bg};stop-opacity:0.95" />
            <stop offset="100%" style="stop-color:${c.bg};stop-opacity:0.98" />
          </linearGradient>
        </defs>
        <rect width="${sz.width}" height="${sz.height}" rx="8" fill="url(#bg)" stroke="${c.border}" stroke-width="1"/>
        
        <!-- Status dot -->
        <circle cx="${sz.fontSize + 4}" cy="${sz.height/2}" r="${sz.fontSize/3.5}" fill="${isOnline ? c.green : '#f85149'}"/>
        
        <!-- Text -->
        <text x="${sz.fontSize + 14}" y="${sz.height/2 + sz.fontSize/5}" font-family="system-ui,sans-serif" font-size="${sz.fontSize}" fill="${c.text}" font-weight="600">
          my-automaton
        </text>
        <text x="${sz.fontSize + 14}" y="${sz.height/2 + sz.fontSize/5 + sz.fontSize + 2}" font-family="system-ui,sans-serif" font-size="${Math.max(sz.fontSize - 3, 9)}" fill="${c.accent}">
          ${isOnline ? '● Online' : '○ Offline'} · ${users} users · ${uptime}
        </text>
        
        <text x="${sz.width - 8}" y="${sz.height - 6}" font-family="system-ui,sans-serif" font-size="${Math.max(sz.fontSize - 5, 7)}" fill="#484f58" text-anchor="end">
          AI Agent · Pay Per Request
        </text>
      </svg>`;
      
      // Replace placeholder or append
      const container = document.getElementById('my-automaton-badge');
      if (container) {
        container.innerHTML = svg;
      } else {
        const div = document.createElement('div');
        div.id = 'my-automaton-badge';
        div.innerHTML = svg;
        s.parentNode.insertBefore(div, s.nextSibling);
      }
    })
    .catch(() => {
      // Fallback: show basic badge
      const fallback = `<svg xmlns="http://www.w3.org/2000/svg" width="${sz.width}" height="${sz.height}" viewBox="0 0 ${sz.width} ${sz.height}">
        <rect width="${sz.width}" height="${sz.height}" rx="8" fill="${c.bg}" stroke="${c.border}" stroke-width="1"/>
        <text x="${sz.width/2}" y="${sz.height/2}" font-family="system-ui,sans-serif" font-size="${sz.fontSize}" fill="${c.accent}" text-anchor="middle" dominant-baseline="middle">⚡ my-automaton</text>
      </svg>`;
      const div = document.createElement('div');
      div.id = 'my-automaton-badge';
      div.innerHTML = fallback;
      s.parentNode.insertBefore(div, s.nextSibling);
    });
})();
