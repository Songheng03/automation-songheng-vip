/**
 * Share Widget - Social sharing bar for my-automaton
 * Injected on all pages to help organic sharing
 * Each share is a potential new visitor
 */
(function() {
  if (document.getElementById('auto-share-bar')) return;

  const pageUrl = encodeURIComponent(window.location.href);
  const pageTitle = encodeURIComponent(document.title || 'my-automaton - AI Tools');

  // Build share bar
  const bar = document.createElement('div');
  bar.id = 'auto-share-bar';
  bar.style.cssText = `
    position: fixed; bottom: 20px; right: 20px; z-index: 9999;
    display: flex; flex-direction: column; gap: 6px;
    opacity: 0; transform: translateY(20px);
    transition: opacity 0.4s, transform 0.4s;
  `;

  const channels = [
    { emoji: '𝕏', label: 'X/Twitter', color: '#000',
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent('Check out this free AI tool:')}&url=${pageUrl}` },
    { emoji: '🔗', label: 'Copy Link', color: '#1a1a3a', copy: true },
    { emoji: '💬', label: 'HN', color: '#ff6600',
      url: `https://news.ycombinator.com/submitlink?u=${pageUrl}&t=${pageTitle}` },
    { emoji: '▶️', label: 'Dev.to', color: '#0a0a23',
      url: `https://dev.to/new?prefill=${encodeURIComponent('Check out this tool: ' + window.location.href)}` },
    { emoji: '📋', label: 'Reddit', color: '#ff4500',
      url: `https://www.reddit.com/submit?url=${pageUrl}&title=${pageTitle}` },
  ];

  let expanded = false;

  // Toggle button
  const toggle = document.createElement('button');
  toggle.innerHTML = '📤';
  toggle.title = 'Share this page';
  toggle.style.cssText = `
    width: 44px; height: 44px; border-radius: 50%; border: 1px solid #00d4aa;
    background: #0a0a1a; color: #00d4aa; font-size: 20px; cursor: pointer;
    box-shadow: 0 4px 12px rgba(0,0,0,0.4); align-self: flex-end;
    transition: transform 0.3s;
  `;
  toggle.onmouseover = () => toggle.style.transform = 'scale(1.1)';
  toggle.onmouseout = () => toggle.style.transform = 'scale(1)';
  toggle.onclick = () => {
    expanded = !expanded;
    bar.querySelectorAll('.share-btn').forEach((b, i) => {
      b.style.display = expanded ? 'flex' : 'none';
      b.style.animation = expanded ? `slideIn 0.3s ${i * 0.05}s both` : 'none';
    });
    toggle.innerHTML = expanded ? '✕' : '📤';
  };

  bar.appendChild(toggle);

  // Share buttons
  channels.forEach((ch, i) => {
    const btn = document.createElement('button');
    btn.className = 'share-btn';
    btn.style.cssText = `
      display: none; align-items: center; gap: 6px; padding: 8px 14px;
      border-radius: 20px; border: 1px solid #333; background: ${ch.color};
      color: white; font-size: 13px; cursor: pointer; white-space: nowrap;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3); transition: transform 0.2s;
    `;
    btn.innerHTML = `${ch.emoji} <span style="font-size:11px">${ch.label}</span>`;
    btn.onmouseover = () => btn.style.transform = 'translateX(-4px)';
    btn.onmouseout = () => btn.style.transform = 'translateX(0)';
    
    if (ch.copy) {
      btn.onclick = () => {
        navigator.clipboard.writeText(window.location.href).then(() => {
          btn.innerHTML = '✅ Copied!';
          setTimeout(() => { btn.innerHTML = '🔗 Copy Link'; }, 2000);
        });
        // Also track share
        fetch('/api/traffic/track', { method: 'POST', headers: {'Content-Type':'application/json'},
          body: JSON.stringify({path: window.location.pathname, ref: 'share-widget-copy', t: Date.now()}) 
        }).catch(() => {});
      };
    } else {
      btn.onclick = () => {
        window.open(ch.url, '_blank', 'width=600,height=400');
        // Track share
        fetch('/api/traffic/track', { method: 'POST', headers: {'Content-Type':'application/json'},
          body: JSON.stringify({path: window.location.pathname, ref: 'share-widget-' + ch.label.toLowerCase(), t: Date.now()})
        }).catch(() => {});
      };
    }
    
    bar.appendChild(btn);
  });

  // Animation keyframes
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
  `;
  document.head.appendChild(style);

  document.body.appendChild(bar);
  // Fade in after load
  setTimeout(() => { bar.style.opacity = '1'; bar.style.transform = 'translateY(0)'; }, 1000);
})();
