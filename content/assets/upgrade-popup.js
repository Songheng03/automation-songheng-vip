// Upgrade popup — shown when free limit reached
// Include on any page with: <script src="/assets/upgrade-popup.js"></script>
(function() {
  'use strict';

  const STYLES = `
#upgrade-overlay {
  display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.7); z-index: 10000; justify-content: center; align-items: center;
  backdrop-filter: blur(4px);
}
#upgrade-overlay.show { display: flex; }
#upgrade-modal {
  background: #12122a; border: 1px solid #2d2d5e; border-radius: 16px;
  padding: 35px; max-width: 450px; width: 90%; position: relative;
  box-shadow: 0 20px 60px rgba(0,0,0,0.5);
}
#upgrade-modal h2 { color: #818cf8; font-size: 1.5em; margin-bottom: 8px; }
#upgrade-modal p { color: #a0a0c0; margin-bottom: 15px; font-size: 0.95em; line-height: 1.5; }
#upgrade-modal .close-btn {
  position: absolute; top: 10px; right: 15px; background: none; border: none;
  color: #6b7280; font-size: 1.5em; cursor: pointer;
}
#upgrade-modal .close-btn:hover { color: #fff; }
#upgrade-modal .price-box {
  background: #0a0a1a; border: 1px solid #2d2d5e; border-radius: 10px;
  padding: 15px 20px; margin: 15px 0;
}
#upgrade-modal .price-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #1a1a3e; }
#upgrade-modal .price-row:last-child { border-bottom: none; }
#upgrade-modal .price-row .service { color: #e0e0e0; }
#upgrade-modal .price-row .cost { color: #818cf8; font-weight: bold; }
#upgrade-modal .continue-btn {
  display: block; width: 100%; background: #6366f1; color: #fff; border: none;
  padding: 14px; border-radius: 8px; font-size: 1.05em; cursor: pointer;
  text-align: center; text-decoration: none; margin-top: 15px;
  transition: background 0.2s;
}
#upgrade-modal .continue-btn:hover { background: #4f46e5; }
#upgrade-modal .wallet-info {
  background: #0a0a1a; border-radius: 8px; padding: 12px; margin: 15px 0;
  font-size: 0.85em; color: #6b7280; text-align: center;
}
#upgrade-modal .wallet-info code { color: #818cf8; font-size: 0.9em; word-break: break-all; }
`;

  // Inject styles
  const styleEl = document.createElement('style');
  styleEl.textContent = STYLES;
  document.head.appendChild(styleEl);

  // Create overlay
  const overlay = document.createElement('div');
  overlay.id = 'upgrade-overlay';
  overlay.innerHTML = `
    <div id="upgrade-modal">
      <button class="close-btn" id="upgradeClose">&times;</button>
      <h2>⚡ Free Limit Reached</h2>
      <p>You've used your 3 free requests for today. Upgrade to continue using my-automaton's AI services with unlimited access.</p>
      <div class="price-box">
        <div class="price-row"><span class="service">Text Analysis</span><span class="cost">1¢</span></div>
        <div class="price-row"><span class="service">Summarization</span><span class="cost">2¢</span></div>
        <div class="price-row"><span class="service">Code Review</span><span class="cost">5¢</span></div>
        <div class="price-row"><span class="service">Security Scan</span><span class="cost">3¢</span></div>
      </div>
      <div class="wallet-info">
        Send USDC on Base chain to:<br>
        <code>0x76eADdEBFfb6A61DD071f97F4508467fc55dd113</code>
      </div>
      <a class="continue-btn" href="/upgrade" target="_blank">🔓 Upgrade to Unlimited</a>
    </div>
  `;
  document.body.appendChild(overlay);

  // Show/hide
  window.showUpgradePopup = function() {
    overlay.classList.add('show');
  };
  document.getElementById('upgradeClose').addEventListener('click', () => {
    overlay.classList.remove('show');
  });
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.remove('show');
  });

  console.log('[Upgrade Popup] Loaded. Call window.showUpgradePopup() to display.');
})();
