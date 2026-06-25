/**
 * my-automaton Code Review Widget
 * Embed AI-powered code review on any website
 * Usage: <script src="https://automation.songheng.vip/embed/widget.js"></script>
 */
(function() {
  'use strict';

  const WIDGET_STYLES = `
    .ma-widget { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 20px auto; border: 2px solid #3b82f6; border-radius: 12px; background: #1e293b; color: #e2e8f0; overflow: hidden; }
    .ma-widget-header { background: linear-gradient(135deg, #3b82f6, #8b5cf6); padding: 16px 20px; display: flex; align-items: center; gap: 10px; }
    .ma-widget-header svg { width: 24px; height: 24px; fill: white; }
    .ma-widget-header span { color: white; font-weight: 600; font-size: 16px; }
    .ma-widget-body { padding: 20px; }
    .ma-widget textarea { width: 100%; min-height: 150px; background: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 12px; color: #e2e8f0; font-family: 'Monaco', 'Menlo', monospace; font-size: 13px; resize: vertical; box-sizing: border-box; }
    .ma-widget textarea:focus { outline: none; border-color: #3b82f6; }
    .ma-widget-select { width: 100%; padding: 10px; background: #0f172a; border: 1px solid #334155; border-radius: 8px; color: #e2e8f0; margin: 12px 0; }
    .ma-widget-btn { width: 100%; padding: 14px; background: linear-gradient(135deg, #3b82f6, #8b5cf6); border: none; border-radius: 8px; color: white; font-weight: 600; font-size: 15px; cursor: pointer; transition: transform 0.2s, opacity 0.2s; }
    .ma-widget-btn:hover { transform: translateY(-1px); opacity: 0.95; }
    .ma-widget-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
    .ma-widget-result { margin-top: 16px; padding: 16px; background: #0f172a; border-radius: 8px; border: 1px solid #334155; max-height: 300px; overflow-y: auto; font-size: 14px; line-height: 1.6; }
    .ma-widget-result h4 { margin: 0 0 8px 0; color: #3b82f6; font-size: 14px; }
    .ma-widget-result pre { margin: 8px 0; padding: 12px; background: #1e293b; border-radius: 6px; overflow-x: auto; font-size: 12px; white-space: pre-wrap; }
    .ma-widget-loading { display: inline-block; width: 16px; height: 16px; border: 2px solid #fff; border-top-color: transparent; border-radius: 50%; animation: ma-spin 0.8s linear infinite; margin-right: 8px; vertical-align: middle; }
    @keyframes ma-spin { to { transform: rotate(360deg); } }
    .ma-widget-footer { padding: 12px 20px; background: #0f172a; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #334155; }
    .ma-widget-footer a { color: #3b82f6; text-decoration: none; }
    .ma-widget-footer a:hover { text-decoration: underline; }
    .ma-widget-free { display: inline-block; background: #10b981; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; margin-left: 8px; }
    .ma-widget-error { color: #f87171; padding: 12px; background: #450a0a; border-radius: 8px; margin-top: 12px; }
    .ma-widget-success { color: #34d399; padding: 8px 12px; background: #064e3b; border-radius: 8px; margin-top: 12px; font-size: 13px; }
  `;

  const WIDGET_HTML = `
    <div class="ma-widget">
      <div class="ma-widget-header">
        <svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
        <span>AI Code Review</span>
        <span class="ma-widget-free">FREE</span>
      </div>
      <div class="ma-widget-body">
        <textarea id="ma-code" placeholder="Paste your code here to get instant AI review..."></textarea>
        <select id="ma-lang" class="ma-widget-select">
          <option value="javascript">JavaScript / TypeScript</option>
          <option value="python">Python</option>
          <option value="go">Go</option>
          <option value="rust">Rust</option>
          <option value="java">Java</option>
          <option value="cpp">C / C++</option>
          <option value="ruby">Ruby</option>
          <option value="php">PHP</option>
          <option value="solidity">Solidity</option>
          <option value="other">Other</option>
        </select>
        <button id="ma-review-btn" class="ma-widget-btn">🔍 Get AI Review</button>
        <div id="ma-result"></div>
      </div>
      <div class="ma-widget-footer">
        Powered by <a href="https://automation.songheng.vip" target="_blank">my-automaton</a> —
        <a href="https://automation.songheng.vip/pricing.html" target="_blank">Get API Key</a>
      </div>
    </div>
  `;

  // Inject styles
  const style = document.createElement('style');
  style.textContent = WIDGET_STYLES;
  document.head.appendChild(style);

  // Find all widget containers or inject default
  function initWidget(container) {
    container.innerHTML = WIDGET_HTML;
    
    const codeInput = container.querySelector('#ma-code');
    const langSelect = container.querySelector('#ma-lang');
    const reviewBtn = container.querySelector('#ma-review-btn');
    const resultDiv = container.querySelector('#ma-result');
    
    let reviewsUsed = parseInt(localStorage.getItem('ma_reviews_count') || '0');
    const FREE_LIMIT = 3;
    
    reviewBtn.addEventListener('click', async () => {
      const code = codeInput.value.trim();
      if (!code) {
        resultDiv.innerHTML = '<div class="ma-widget-error">⚠️ Please paste some code to review.</div>';
        return;
      }
      
      if (reviewsUsed >= FREE_LIMIT) {
        resultDiv.innerHTML = `
          <div class="ma-widget-error">
            You've used your ${FREE_LIMIT} free reviews today.<br>
            <a href="https://automation.songheng.vip/pricing.html" target="_blank" style="color: #60a5fa;">Get an API key for unlimited reviews →</a>
          </div>
        `;
        return;
      }
      
      reviewBtn.disabled = true;
      reviewBtn.innerHTML = '<span class="ma-widget-loading"></span>Analyzing code...';
      resultDiv.innerHTML = '';
      
      try {
        const response = await fetch('https://automation.songheng.vip/free/v1/review', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: code,
            language: langSelect.value,
            mode: 'review'
          })
        });
        
        if (response.status === 429) {
          resultDiv.innerHTML = `
            <div class="ma-widget-error">
              Rate limit reached. Try again tomorrow or <a href="https://automation.songheng.vip/pricing.html" target="_blank" style="color: #60a5fa;">get an API key</a> for unlimited access.
            </div>
          `;
          reviewBtn.disabled = false;
          reviewBtn.textContent = '🔍 Get AI Review';
          return;
        }
        
        const data = await response.json();
        
        if (data.error) {
          resultDiv.innerHTML = `<div class="ma-widget-error">Error: ${data.error}</div>`;
        } else {
          reviewsUsed++;
          localStorage.setItem('ma_reviews_count', reviewsUsed.toString());
          
          const remaining = FREE_LIMIT - reviewsUsed;
          const reviewText = data.result || data.analysis || data.summary || 'No issues found. Code looks good!';
          
          resultDiv.innerHTML = `
            <div class="ma-widget-success">✓ Review complete! ${remaining} free review${remaining !== 1 ? 's' : ''} remaining today.</div>
            <div class="ma-widget-result">
              <h4>Code Review Results</h4>
              <pre>${escapeHtml(reviewText)}</pre>
            </div>
          `;
        }
      } catch (err) {
        resultDiv.innerHTML = `<div class="ma-widget-error">Network error: ${err.message}</div>`;
      }
      
      reviewBtn.disabled = false;
      reviewBtn.textContent = '🔍 Get AI Review';
    });
  }
  
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  // Auto-init: look for containers with data-ma-widget attribute
  document.querySelectorAll('[data-ma-widget]').forEach(initWidget);
  
  // If no containers found, create one at script location
  if (document.querySelectorAll('[data-ma-widget]').length === 0) {
    const container = document.createElement('div');
    container.setAttribute('data-ma-widget', 'true');
    const script = document.currentScript;
    if (script && script.parentNode) {
      script.parentNode.insertBefore(container, script);
    } else {
      document.body.appendChild(container);
    }
    initWidget(container);
  }
  
  // Expose for manual init
  window.MyAutomatonWidget = { init: initWidget };
})();
