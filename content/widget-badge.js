// my-automaton Badge Widget v1.0
// Embed: <script src="https://automation.songheng.vip/widget-badge.js" defer></script>
// Adds a "Powered by my-automaton AI" badge to your site
(function() {
  var w = window;
  var d = document;
  var s = d.currentScript || d.scripts[d.scripts.length-1];
  
  // Config
  var POSITION = s.getAttribute('data-position') || 'bottom-right';
  var THEME = s.getAttribute('data-theme') || 'dark';
  var TEXT = s.getAttribute('data-text') || '⚡ Powered by my-automaton AI';
  
  var badge = d.createElement('div');
  badge.id = 'auto-badge';
  badge.innerHTML = '<a href="https://automation.songheng.vip" target="_blank" rel="noopener" style="' +
    'display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:8px;' +
    'font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;' +
    'font-size:13px;font-weight:500;text-decoration:none;transition:all 0.2s;' +
    (THEME === 'light' 
      ? 'background:#f0f0f5;color:#333;border:1px solid #e0e0e5;' 
      : 'background:#1a1a2e;color:#e0e0e0;border:1px solid #2a2a4a;') +
    'z-index:999999;box-shadow:0 2px 8px rgba(0,0,0,0.15);' +
    '">' + TEXT + '</a>';
  
  var style = d.createElement('style');
  style.textContent = '#auto-badge{position:fixed;' + POSITION + ':20px;z-index:999999;}' +
    '#auto-badge a:hover{opacity:0.85;transform:translateY(-1px);}';
  
  d.head.appendChild(style);
  d.body.appendChild(badge);
})();
