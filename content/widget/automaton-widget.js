/**
 * automaton-widget.js — Free AI Code Review Widget
 * Embed: <script src="https://automation.songheng.vip/widget/automaton-widget.js" data-theme="dark"></script>
 */
(function() {
  'use strict';

  // ===== CONFIG =====
  const API_BASE = 'https://automation.songheng.vip';
  const SCRIPT = document.currentScript;
  const THEME = SCRIPT?.getAttribute('data-theme') || 'dark';
  const ACCENT = SCRIPT?.getAttribute('data-accent') || '#6366f1';
  const BTN_TEXT = SCRIPT?.getAttribute('data-btn-text') || '🚀 Analyze Code';
  const PLACEHOLDER = SCRIPT?.getAttribute('data-placeholder') || 'Paste your code here (any language)...';
  const SITE_NAME = SCRIPT?.getAttribute('data-site') || 'unknown';

  // ===== STYLES =====
  const BASE_COLORS = THEME === 'light' ? {
    bg: '#ffffff', fg: '#1a1a2e', muted: '#666680',
    card: '#f5f5fa', input_bg: '#ffffff', border: '#d0d0e0',
    shadow: 'rgba(0,0,0,0.08)'
  } : {
    bg: '#1a1a2e', fg: '#e0e0f0', muted: '#8888aa',
    card: '#16213e', input_bg: '#0f0f1a', border: '#2a2a4a',
    shadow: 'rgba(0,0,0,0.3)'
  };

  const style = document.createElement('style');
  style.textContent = `
    .aw-container { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 100%; margin: 16px 0; background: ${BASE_COLORS.bg}; border: 1px solid ${BASE_COLORS.border}; border-radius: 12px; padding: 20px; color: ${BASE_COLORS.fg}; box-shadow: 0 4px 20px ${BASE_COLORS.shadow}; }
    .aw-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .aw-title { font-weight: 700; font-size: 14px; }
    .aw-title span { opacity: 0.6; font-weight: 400; }
    .aw-badge { font-size: 11px; padding: 2px 8px; border-radius: 20px; background: ${ACCENT}; color: white; }
    .aw-textarea { width: 100%; min-height: 140px; padding: 12px; border: 1px solid ${BASE_COLORS.border}; border-radius: 8px; background: ${BASE_COLORS.input_bg}; color: ${BASE_COLORS.fg}; font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace; font-size: 13px; line-height: 1.5; resize: vertical; box-sizing: border-box; }
    .aw-textarea:focus { outline: none; border-color: ${ACCENT}; box-shadow: 0 0 0 2px ${ACCENT}33; }
    .aw-textarea::placeholder { color: ${BASE_COLORS.muted}; }
    .aw-btn { display: inline-flex; align-items: center; gap: 6px; padding: 10px 20px; background: ${ACCENT}; color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; margin-top: 10px; transition: opacity 0.2s; }
    .aw-btn:hover { opacity: 0.9; }
    .aw-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .aw-status { font-size: 12px; color: ${BASE_COLORS.muted}; margin-top: 8px; }
    .aw-result { margin-top: 12px; padding: 12px; border: 1px solid ${BASE_COLORS.border}; border-radius: 8px; background: ${BASE_COLORS.card}; font-size: 13px; line-height: 1.6; white-space: pre-wrap; display: none; max-height: 400px; overflow-y: auto; }
    .aw-error { margin-top: 12px; padding: 10px 12px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; color: #dc2626; font-size: 13px; display: none; }
    .aw-footer { margin-top: 12px; font-size: 11px; color: ${BASE_COLORS.muted}; text-align: center; }
    .aw-footer a { color: ${ACCENT}; text-decoration: none; }
    .aw-counter { font-size: 11px; color: ${BASE_COLORS.muted}; text-align: right; margin-top: 4px; }
    .aw-remaining { display: inline-flex; align-items: center; gap: 4px; background: ${BASE_COLORS.card}; padding: 2px 8px; border-radius: 12px; font-size: 11px; color: ${BASE_COLORS.muted}; }
  `;
  document.head.appendChild(style);

  // ===== BUILD WIDGET =====
  const container = document.createElement('div');
  container.className = 'aw-container';

  container.innerHTML = `
    <div class="aw-header">
      <div class="aw-title">🤖 AI Code Review <span>by my-automaton</span></div>
      <span class="aw-badge">Free</span>
    </div>
    <textarea class="aw-textarea" placeholder="${PLACEHOLDER}"></textarea>
    <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
      <button class="aw-btn">${BTN_TEXT}</button>
      <span class="aw-remaining">🆓 <span class="aw-rem-count">3</span>/3 today</span>
    </div>
    <div class="aw-counter"><span class="aw-rem-count2">3</span> free reviews remaining today</div>
    <div class="aw-status"></div>
    <div class="aw-result"></div>
    <div class="aw-error"></div>
    <div class="aw-footer">Powered by <a href="https://automation.songheng.vip" target="_blank">my-automaton AI</a></div>
  `;

  // Insert after the script tag if possible, or at end of parent
  if (SCRIPT && SCRIPT.parentNode) {
    SCRIPT.parentNode.insertBefore(container, SCRIPT.nextSibling);
  } else {
    document.body.appendChild(container);
  }

  // ===== LOGIC =====
  const textarea = container.querySelector('.aw-textarea');
  const btn = container.querySelector('.aw-btn');
  const status = container.querySelector('.aw-status');
  const result = container.querySelector('.aw-result');
  const error = container.querySelector('.aw-error');
  const remCount = container.querySelector('.aw-rem-count');
  const remCount2 = container.querySelector('.aw-rem-count2');

  let remaining = 3;

  function updateRemaining() {
    remCount.textContent = remaining;
    remCount2.textContent = remaining;
  }

  btn.addEventListener('click', async () => {
    const code = textarea.value.trim();
    if (!code) {
      status.textContent = '⚠️ Please paste some code first.';
      return;
    }
    if (remaining <= 0) {
      status.textContent = '❌ No free reviews left today. Get an API key for unlimited use.';
      return;
    }

    btn.disabled = true;
    status.textContent = '🔍 Analyzing code...';
    result.style.display = 'none';
    error.style.display = 'none';

    try {
      const resp = await fetch(`${API_BASE}/free/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, source: 'widget', site: SITE_NAME })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || `HTTP ${resp.status}`);

      remaining--;
      updateRemaining();
      result.textContent = data.review || data.result || JSON.stringify(data, null, 2);
      result.style.display = 'block';
      status.textContent = `✅ Review complete! ${remaining > 0 ? `${remaining} free review${remaining > 1 ? 's' : ''} left today.` : ''}`;
    } catch (e) {
      error.textContent = `❌ Error: ${e.message}`;
      error.style.display = 'block';
      status.textContent = '';
    } finally {
      btn.disabled = false;
    }
  });

  // Load remaining from localStorage
  try {
    const key = `aw_remaining_${SITE_NAME}`;
    const stored = localStorage.getItem(key);
    const storedDate = localStorage.getItem(key + '_date');
    const today = new Date().toDateString();
    if (storedDate === today && stored !== null) {
      remaining = parseInt(stored, 10);
      if (isNaN(remaining) || remaining < 0 || remaining > 3) remaining = 3;
    } else {
      remaining = 3;
      localStorage.setItem(key, '3');
      localStorage.setItem(key + '_date', today);
    }
    updateRemaining();
  } catch(e) {}

  // Save remaining on use
  const origFetch = btn.click;
  const saveRemaining = () => {
    try {
      const key = `aw_remaining_${SITE_NAME}`;
      localStorage.setItem(key, String(remaining));
      localStorage.setItem(key + '_date', new Date().toDateString());
    } catch(e) {}
  };
  // Override the click handler to save after
  btn.addEventListener('click', saveRemaining);
})();
