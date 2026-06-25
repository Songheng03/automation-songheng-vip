// Share Result Module — for User Portal
// Makes API results shareable via Twitter/LinkedIn/Copy link
// Include in portal.html

(() => {
  'use strict';

  function addShareButtons(container, result, serviceName) {
    if (!result) return;
    
    const wrapper = document.createElement('div');
    wrapper.className = 'share-actions';
    wrapper.style.cssText = 'margin-top:16px;padding:12px;border-top:1px solid #30363d;display:flex;gap:8px;flex-wrap:wrap;align-items:center;';
    
    // Truncate result for sharing
    const text = typeof result === 'string' ? result : (result.result || result.summary || result.issues || JSON.stringify(result));
    const shareText = text.length > 200 ? text.substring(0, 200) + '...' : text;
    const pageTitle = `AI ${serviceName} result`;
    const url = window.location.href;
    
    // Twitter/X
    const tweetBtn = createBtn('🐦 Tweet', () => {
      const tweet = encodeURIComponent(`🤖 ${pageTitle}:\n\n"${shareText}"\n\nvia automation.songheng.vip`);
      window.open(`https://twitter.com/intent/tweet?text=${tweet}`, '_blank', 'width=600,height=400');
    });
    
    // LinkedIn
    const liBtn = createBtn('💼 LinkedIn', () => {
      const summary = encodeURIComponent(`AI ${serviceName}: ${shareText.substring(0, 100)}...`);
      window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}&summary=${summary}`, '_blank', 'width=600,height=400');
    });
    
    // Copy share link
    const copyBtn = createBtn('📋 Copy Link', () => {
      // Create a result page URL with the result encoded
      const hashData = btoa(encodeURIComponent(JSON.stringify({s: serviceName, r: text.substring(0, 500), t: Date.now()})));
      const shareUrl = `${url.split('#')[0]}#share-${hashData}`;
      navigator.clipboard.writeText(shareUrl).then(() => {
        copyBtn.textContent = '✅ Copied!';
        copyBtn.style.borderColor = '#3fb950';
        setTimeout(() => { copyBtn.textContent = '📋 Copy Link'; copyBtn.style.borderColor = '#30363d'; }, 2000);
      }).catch(() => {
        // Fallback: copy just the text
        navigator.clipboard.writeText(`AI ${serviceName} Result: ${shareText}`).then(() => {
          copyBtn.textContent = '✅ Copied!';
          setTimeout(() => { copyBtn.textContent = '📋 Copy Link'; }, 2000);
        });
      });
    });
    
    wrapper.appendChild(tweetBtn);
    wrapper.appendChild(liBtn);
    wrapper.appendChild(copyBtn);
    container.appendChild(wrapper);
  }
  
  function createBtn(label, onClick) {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.style.cssText = 'padding:6px 14px;border:1px solid #30363d;border-radius:6px;background:#21262d;color:#c9d1d9;cursor:pointer;font-size:13px;transition:all 0.2s;';
    btn.onmouseover = () => { btn.style.background = '#30363d'; };
    btn.onmouseout = () => { btn.style.background = '#21262d'; };
    btn.onclick = onClick;
    return btn;
  }
  
  // Expose globally
  window.addShareButtons = addShareButtons;
  
  // Auto-detect share hashes on page load
  function checkShareHash() {
    if (window.location.hash && window.location.hash.startsWith('#share-')) {
      try {
        const raw = window.location.hash.replace('#share-', '');
        const data = JSON.parse(decodeURIComponent(atob(raw)));
        const notif = document.createElement('div');
        notif.style.cssText = 'position:fixed;bottom:20px;right:20px;background:#161b22;border:1px solid #30363d;border-radius:8px;padding:16px;max-width:400px;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,0.3);';
        notif.innerHTML = `
          <div style="font-size:13px;color:#8b949e;margin-bottom:8px;">📎 Shared ${data.s} Result</div>
          <div style="font-size:14px;color:#c9d1d9;margin-bottom:12px;max-height:200px;overflow-y:auto;">${data.r}</div>
          <button onclick="this.parentElement.remove()" style="padding:4px 12px;border:1px solid #30363d;border-radius:4px;background:#21262d;color:#c9d1d9;cursor:pointer;">Close</button>
        `;
        document.body.appendChild(notif);
      } catch(e) {}
    }
  }
  
  if (document.readyState === 'complete') checkShareHash();
  else window.addEventListener('load', checkShareHash);
})();
