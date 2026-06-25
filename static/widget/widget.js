/**
 * my-automaton Code Review Widget
 * 
 * A standalone vanilla JavaScript widget that provides code review functionality.
 * Looks for <div id="my-automaton-widget"> injected by the embedder and
 * renders a professional code review interface with a clean code-like theme.
 * 
 * Usage:
 *   <div id="my-automaton-widget"></div>
 *   <script src="https://yourdomain.com/widget/widget.js"></script>
 */
(function () {
  'use strict';

  // --- Find the target element ---
  var target = document.getElementById('my-automaton-widget');
  if (!target) {
    // Widget div not found on page, do nothing
    return;
  }

  // --- Unique IDs for internal elements ---
  var uid = 'ma-widget-' + Math.random().toString(36).substring(2, 8);
  var textareaId = uid + '-code';
  var resultId = uid + '-result';
  var btnId = uid + '-analyze';

  // --- Inject styles ---
  var styleEl = document.createElement('style');
  styleEl.textContent = [
    '#' + target.id + '.ma-widget-container {',
    '  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, sans-serif;',
    '  max-width: 600px;',
    '  margin: 0 auto;',
    '  border: 1px solid #d1d5db;',
    '  border-radius: 10px;',
    '  padding: 24px;',
    '  background: #ffffff;',
    '  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);',
    '  box-sizing: border-box;',
    '}',
    '#' + target.id + ' .ma-widget-title {',
    '  margin: 0 0 16px 0;',
    '  font-size: 18px;',
    '  font-weight: 700;',
    '  color: #1f2937;',
    '  letter-spacing: -0.01em;',
    '}',
    '#' + target.id + ' .ma-widget-title span {',
    '  color: #6366f1;',
    '}',
    '#' + target.id + ' .ma-widget-label {',
    '  display: block;',
    '  font-size: 13px;',
    '  font-weight: 600;',
    '  color: #374151;',
    '  margin-bottom: 6px;',
    '  text-transform: uppercase;',
    '  letter-spacing: 0.04em;',
    '}',
    '#' + target.id + ' #' + textareaId + ' {',
    '  width: 100%;',
    '  min-height: 180px;',
    '  padding: 14px;',
    '  border: 1px solid #d1d5db;',
    '  border-radius: 8px;',
    '  font-family: "SF Mono", "Fira Code", "Fira Mono", Menlo, Consolas, "DejaVu Sans Mono", monospace;',
    '  font-size: 13px;',
    '  line-height: 1.6;',
    '  color: #1f2937;',
    '  background: #f9fafb;',
    '  resize: vertical;',
    '  box-sizing: border-box;',
    '  tab-size: 2;',
    '}',
    '#' + target.id + ' #' + textareaId + ':focus {',
    '  outline: none;',
    '  border-color: #6366f1;',
    '  background: #ffffff;',
    '  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);',
    '}',
    '#' + target.id + ' #' + textareaId + '::placeholder {',
    '  color: #9ca3af;',
    '}',
    '#' + target.id + ' .ma-widget-actions {',
    '  display: flex;',
    '  align-items: center;',
    '  justify-content: space-between;',
    '  margin-top: 12px;',
    '}',
    '#' + target.id + ' #' + btnId + ' {',
    '  display: inline-flex;',
    '  align-items: center;',
    '  justify-content: center;',
    '  padding: 10px 24px;',
    '  background: #6366f1;',
    '  color: #ffffff;',
    '  border: none;',
    '  border-radius: 8px;',
    '  font-size: 14px;',
    '  font-weight: 600;',
    '  font-family: inherit;',
    '  cursor: pointer;',
    '  transition: background 0.15s ease, transform 0.1s ease;',
    '  line-height: 1;',
    '}',
    '#' + target.id + ' #' + btnId + ':hover {',
    '  background: #4f46e5;',
    '}',
    '#' + target.id + ' #' + btnId + ':active {',
    '  transform: scale(0.97);',
    '}',
    '#' + target.id + ' #' + btnId + ':disabled {',
    '  background: #a5b4fc;',
    '  cursor: not-allowed;',
    '  transform: none;',
    '}',
    '#' + target.id + ' .ma-widget-status {',
    '  font-size: 13px;',
    '  color: #6b7280;',
    '}',
    '#' + target.id + ' .ma-widget-status.loading {',
    '  color: #6366f1;',
    '}',
    '#' + target.id + ' #' + resultId + ' {',
    '  margin-top: 16px;',
    '  padding: 16px;',
    '  background: #f3f4f6;',
    '  border: 1px solid #e5e7eb;',
    '  border-radius: 8px;',
    '  font-size: 14px;',
    '  line-height: 1.6;',
    '  color: #1f2937;',
    '  white-space: pre-wrap;',
    '  word-wrap: break-word;',
    '  overflow-x: auto;',
    '  min-height: 20px;',
    '  display: none;',
    '}',
    '#' + target.id + ' #' + resultId + '.visible {',
    '  display: block;',
    '}',
    '#' + target.id + ' #' + resultId + '.error {',
    '  color: #dc2626;',
    '  background: #fef2f2;',
    '  border-color: #fecaca;',
    '}',
    '#' + target.id + ' .ma-widget-footer {',
    '  margin-top: 20px;',
    '  padding-top: 14px;',
    '  text-align: center;',
    '  font-size: 12px;',
    '  color: #9ca3af;',
    '  border-top: 1px solid #f3f4f6;',
    '}',
    '#' + target.id + ' .ma-widget-footer a {',
    '  color: #6366f1;',
    '  text-decoration: none;',
    '  font-weight: 500;',
    '}',
    '#' + target.id + ' .ma-widget-footer a:hover {',
    '  text-decoration: underline;',
    '}',
    '#' + target.id + ' .ma-widget-footer .ma-powered-by {',
    '  display: inline-flex;',
    '  align-items: center;',
    '  gap: 4px;',
    '}',
    '/* Responsive adjustments */',
    '@media (max-width: 640px) {',
    '  #' + target.id + '.ma-widget-container {',
    '    padding: 16px;',
    '    margin: 12px;',
    '    border-radius: 8px;',
    '  }',
    '  #' + target.id + ' .ma-widget-title {',
    '    font-size: 16px;',
    '  }',
    '  #' + target.id + ' #' + textareaId + ' {',
    '    min-height: 140px;',
    '  }',
    '}'
  ].join('\n');
  document.head.appendChild(styleEl);

  // --- Build widget HTML ---
  target.className = 'ma-widget-container';
  target.innerHTML = [
    '<div class="ma-widget-title">&#60;<span>Code Review</span> /&#62;</div>',
    '<label class="ma-widget-label" for="' + textareaId + '">Paste your code</label>',
    '<textarea id="' + textareaId + '" placeholder="Paste your code here for review..." spellcheck="false"></textarea>',
    '<div class="ma-widget-actions">',
    '  <button id="' + btnId + '">Analyze</button>',
    '  <span class="ma-widget-status" id="' + uid + '-status"></span>',
    '</div>',
    '<div id="' + resultId + '"></div>',
    '<div class="ma-widget-footer">',
    '  <span class="ma-powered-by">',
    '    Powered by <a href="https://automation.songheng.vip" target="_blank" rel="noopener noreferrer">my‑automaton</a>',
    '  </span>',
    '</div>'
  ].join('\n');

  // --- Cache DOM references ---
  var textarea = document.getElementById(textareaId);
  var analyzeBtn = document.getElementById(btnId);
  var resultEl = document.getElementById(resultId);
  var statusEl = document.getElementById(uid + '-status');

  // --- Analyze handler ---
  function handleAnalyze() {
    var code = textarea.value;

    if (!code || code.trim() === '') {
      resultEl.textContent = 'Please enter some code to review.';
      resultEl.className = 'visible error';
      statusEl.textContent = '';
      return;
    }

    analyzeBtn.disabled = true;
    analyzeBtn.textContent = 'Analyzing...';
    statusEl.textContent = 'Reviewing code...';
    statusEl.className = 'ma-widget-status loading';
    resultEl.className = '';
    resultEl.style.display = 'none';

    fetch('/api/code-review', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ code: code }),
      mode: 'cors'
    })
      .then(function (response) {
        if (!response.ok) {
          return response.json().then(function (data) {
            throw new Error(data.error || 'Server returned ' + response.status);
          });
        }
        return response.json();
      })
      .then(function (data) {
        var reviewText = data.review || 'No review was generated. Please try again.';
        resultEl.textContent = reviewText;
        resultEl.className = 'visible';
        statusEl.textContent = 'Review complete';
        statusEl.className = 'ma-widget-status';
      })
      .catch(function (err) {
        resultEl.textContent = 'Unable to complete code review. ' + err.message + '. Please check your connection and try again.';
        resultEl.className = 'visible error';
        statusEl.textContent = 'Error';
        statusEl.className = 'ma-widget-status';
      })
      .finally(function () {
        analyzeBtn.disabled = false;
        analyzeBtn.textContent = 'Analyze';
      });
  }

  // --- Bind event ---
  analyzeBtn.addEventListener('click', handleAnalyze);

  // --- Allow Ctrl+Enter / Cmd+Enter to submit ---
  textarea.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleAnalyze();
    }
  });
})();
