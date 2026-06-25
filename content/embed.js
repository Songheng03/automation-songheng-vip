/* embed.js — my-automaton AI Code Review Widget v1.0 */
/* Drop this script tag on any page for instant AI code review: <script src="https://automation.songheng.vip/embed.js"></script> */
(function() {
  if (window.__myAutomatonWidget) return;
  window.__myAutomatonWidget = true;

  const BASE = 'https://automation.songheng.vip';
  const STYLES = `
    #auto-bubble{position:fixed;bottom:24px;right:24px;z-index:999999;width:56px;height:56px;border-radius:50%;background:#238636;color:#fff;border:none;cursor:pointer;font-size:24px;box-shadow:0 4px 16px rgba(0,0,0,0.3);transition:all 0.3s ease;display:flex;align-items:center;justify-content:center}
    #auto-bubble:hover{transform:scale(1.1);background:#2ea043;box-shadow:0 6px 24px rgba(0,0,0,0.4)}
    #auto-panel{position:fixed;bottom:96px;right:24px;z-index:999998;width:380px;max-height:80vh;background:#161b22;border:1px solid #30363d;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,0.5);display:none;flex-direction:column;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#c9d1d9;font-size:14px;line-height:1.5}
    #auto-panel.open{display:flex}
    #auto-panel h3{margin:0;padding:16px;background:#0d1117;border-bottom:1px solid #30363d;font-size:14px;color:#fff;display:flex;align-items:center;gap:8px}
    #auto-panel h3 span{flex:1}
    #auto-panel h3 button{background:none;border:none;color:#8b949e;cursor:pointer;font-size:18px;padding:0 4px}
    #auto-panel h3 button:hover{color:#fff}
    #auto-code{flex:1;padding:12px 16px;background:#0d1117;border:none;border-bottom:1px solid #30363d;color:#c9d1d9;font-family:'Consolas','Monaco',monospace;font-size:13px;resize:vertical;min-height:120px;outline:none;line-height:1.5}
    #auto-code::placeholder{color:#484f58}
    #auto-mode{display:flex;gap:4px;padding:8px 12px;background:#0d1117;border-bottom:1px solid #30363d;flex-wrap:wrap}
    #auto-mode button{padding:4px 10px;border-radius:4px;border:1px solid #30363d;background:transparent;color:#8b949e;cursor:pointer;font-size:12px;transition:all 0.2s}
    #auto-mode button.active{border-color:#238636;color:#3fb950;background:rgba(35,134,54,0.15)}
    #auto-mode button:hover{border-color:#58a6ff;color:#58a6ff}
    #auto-actions{display:flex;gap:8px;padding:12px 16px;background:#0d1117;border-top:1px solid #30363d}
    #auto-submit{flex:1;padding:8px 16px;background:#238636;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:600;font-size:13px}
    #auto-submit:hover{background:#2ea043}
    #auto-submit:disabled{background:#1b4a24;color:#4a8a5a;cursor:not-allowed}
    #auto-upgrade{padding:8px 12px;background:#1f2937;color:#c9d1d9;border:1px solid #30363d;border-radius:6px;cursor:pointer;font-size:13px;text-decoration:none;display:inline-flex;align-items:center;gap:4px}
    #auto-upgrade:hover{background:#374151}
    #auto-result{padding:12px 16px;max-height:300px;overflow-y:auto;white-space:pre-wrap;font-size:13px;line-height:1.6;display:none}
    #auto-result.show{display:block}
    #auto-result .loading{color:#8b949e;text-align:center;padding:24px}
    #auto-result .loading::after{content:'';display:inline-block;width:16px;height:16px;border:2px solid #30363d;border-top-color:#3fb950;border-radius:50%;animation:auto-spin 0.8s linear infinite;margin-left:8px;vertical-align:middle}
    @keyframes auto-spin{to{transform:rotate(360deg)}}
    #auto-result .error{color:#f85149;padding:8px;background:rgba(248,81,73,0.1);border-radius:6px}
    #auto-result .remaining{color:#8b949e;font-size:11px;margin-top:8px;text-align:right}
    @media(max-width:480px){#auto-panel{width:calc(100vw - 32px);right:16px;bottom:90px}}
  `;

  const style = document.createElement('style');
  style.textContent = STYLES;
  document.head.appendChild(style);

  const bubble = document.createElement('button');
  bubble.id = 'auto-bubble';
  bubble.innerHTML = '🤖';
  bubble.title = 'AI Code Review — Free';
  document.body.appendChild(bubble);

  const panel = document.createElement('div');
  panel.id = 'auto-panel';
  panel.innerHTML = `
    <h3><span>🤖 AI Code Review</span><span style="font-size:11px;color:#8b949e;font-weight:400">free</span><button id="auto-close">✕</button></h3>
    <textarea id="auto-code" placeholder="Paste your code here for instant AI review...&#10;e.g. function getUser(id) { return db.query('SELECT * FROM users WHERE id = ' + id); }" spellcheck="false"></textarea>
    <div id="auto-mode">
      <button data-mode="review" class="active">🔍 Review</button>
      <button data-mode="security">🛡️ Security</button>
      <button data-mode="explain">💡 Explain</button>
      <button data-mode="refactor">🔧 Refactor</button>
      <button data-mode="complexity">📈 Complexity</button>
    </div>
    <div id="auto-result"></div>
    <div id="auto-actions">
      <button id="auto-submit">Analyze Code</button>
      <a id="auto-upgrade" href="${BASE}/upgrade" target="_blank">⚡ Upgrade</a>
    </div>
  `;
  document.body.appendChild(panel);

  let currentMode = 'review';
  const resultDiv = panel.querySelector('#auto-result');
  const codeArea = panel.querySelector('#auto-code');
  const submitBtn = panel.querySelector('#auto-submit');
  const modeBtns = panel.querySelectorAll('#auto-mode button');

  modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      modeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentMode = btn.dataset.mode;
      resultDiv.classList.remove('show');
      resultDiv.innerHTML = '';
    });
  });

  bubble.addEventListener('click', () => {
    panel.classList.toggle('open');
    if (panel.classList.contains('open')) codeArea.focus();
  });

  panel.querySelector('#auto-close').addEventListener('click', () => {
    panel.classList.remove('open');
  });

  submitBtn.addEventListener('click', async () => {
    const code = codeArea.value.trim();
    if (!code) return;
    
    submitBtn.disabled = true;
    submitBtn.textContent = 'Analyzing...';
    resultDiv.innerHTML = '<div class="loading">Analyzing with AI</div>';
    resultDiv.classList.add('show');

    try {
      const resp = await fetch(`${BASE}/api/free/${currentMode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      const data = await resp.json();
      
      if (data.success) {
        resultDiv.innerHTML = `<div>${data.result.replace(/\n/g, '<br>')}</div>`;
        if (data.remaining_free !== undefined) {
          resultDiv.innerHTML += `<div class="remaining">Free today: ${data.remaining_free}/3 remaining</div>`;
        }
      } else {
        resultDiv.innerHTML = `<div class="error">${data.error || 'Analysis failed'}</div>`;
      }
    } catch(e) {
      resultDiv.innerHTML = `<div class="error">Network error: ${e.message}</div>`;
    }

    submitBtn.disabled = false;
    submitBtn.textContent = 'Analyze Code';
  });

  /* Ctrl+Enter shortcut */
  codeArea.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter') submitBtn.click();
  });

  console.log('%c🤖 AI Code Review Widget loaded', 'color:#3fb950;font-size:16px;font-weight:bold');
  console.log(`%c3 free reviews/day. Upgrade: ${BASE}/upgrade`, 'color:#8b949e;font-size:12px');
})();
