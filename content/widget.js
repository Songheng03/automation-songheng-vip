(function() {
  'use strict';

  var WIDGET_ID = 'my-automaton-widget';
  var API_URL = '/api/review-free';
  var BACKLINK_URL = 'https://automation.songheng.vip';
  var BACKLINK_LABEL = 'Powered by my-automaton';

  // Wait for DOM ready
  function ready(fn) {
    if (document.readyState !== 'loading') {
      fn();
    } else {
      document.addEventListener('DOMContentLoaded', fn);
    }
  }

  ready(function() {
    var target = document.getElementById(WIDGET_ID);
    if (!target) {
      console.warn('[my-automaton] No element with id "' + WIDGET_ID + '" found. Widget not rendered.');
      return;
    }

    // ---- Build Styles ----
    var styles = document.createElement('style');
    styles.textContent = [
      '#' + WIDGET_ID + ' .ma-widget {',
      '  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;',
      '  max-width: 600px;',
      '  width: 100%;',
      '  margin: 0 auto;',
      '  box-sizing: border-box;',
      '  background: #1e1e2e;',
      '  border-radius: 12px;',
      '  padding: 24px;',
      '  color: #cdd6f4;',
      '  box-shadow: 0 8px 32px rgba(0,0,0,0.3);',
      '}',
      '#' + WIDGET_ID + ' .ma-widget * { box-sizing: border-box; }',
      '#' + WIDGET_ID + ' .ma-title {',
      '  font-size: 18px;',
      '  font-weight: 600;',
      '  margin: 0 0 16px;',
      '  color: #cba6f7;',
      '  display: flex;',
      '  align-items: center;',
      '  gap: 8px;',
      '}',
      '#' + WIDGET_ID + ' .ma-title::before {',
      '  content: "{ }";',
      '  font-size: 14px;',
      '  background: #313244;',
      '  padding: 2px 8px;',
      '  border-radius: 4px;',
      '  color: #89b4fa;',
      '}',
      '#' + WIDGET_ID + ' .ma-textarea {',
      '  width: 100%;',
      '  min-height: 180px;',
      '  padding: 14px;',
      '  font-family: "SF Mono", "Fira Code", "Fira Mono", "Roboto Mono", "Cascadia Code", Menlo, monospace;',
      '  font-size: 13px;',
      '  line-height: 1.5;',
      '  background: #11111b;',
      '  color: #cdd6f4;',
      '  border: 1px solid #45475a;',
      '  border-radius: 8px;',
      '  resize: vertical;',
      '  outline: none;',
      '  transition: border-color 0.2s;',
      '}',
      '#' + WIDGET_ID + ' .ma-textarea:focus {',
      '  border-color: #89b4fa;',
      '  box-shadow: 0 0 0 2px rgba(137, 180, 250, 0.2);',
      '}',
      '#' + WIDGET_ID + ' .ma-textarea::placeholder {',
      '  color: #585b70;',
      '}',
      '#' + WIDGET_ID + ' .ma-btn-row {',
      '  display: flex;',
      '  justify-content: flex-end;',
      '  margin-top: 12px;',
      '}',
      '#' + WIDGET_ID + ' .ma-btn {',
      '  background: #89b4fa;',
      '  color: #1e1e2e;',
      '  border: none;',
      '  padding: 10px 28px;',
      '  font-size: 14px;',
      '  font-weight: 600;',
      '  border-radius: 8px;',
      '  cursor: pointer;',
      '  transition: background 0.2s, transform 0.1s;',
      '  display: inline-flex;',
      '  align-items: center;',
      '  gap: 6px;',
      '}',
      '#' + WIDGET_ID + ' .ma-btn:hover {',
      '  background: #b4d0fb;',
      '}',
      '#' + WIDGET_ID + ' .ma-btn:active {',
      '  transform: scale(0.97);',
      '}',
      '#' + WIDGET_ID + ' .ma-btn:disabled {',
      '  opacity: 0.5;',
      '  cursor: not-allowed;',
      '  transform: none;',
      '}',
      '#' + WIDGET_ID + ' .ma-btn .ma-spinner {',
      '  display: none;',
      '  width: 14px;',
      '  height: 14px;',
      '  border: 2px solid rgba(30, 30, 46, 0.3);',
      '  border-top-color: #1e1e2e;',
      '  border-radius: 50%;',
      '  animation: ma-spin 0.6s linear infinite;',
      '}',
      '#' + WIDGET_ID + ' .ma-btn.ma-loading .ma-spinner { display: inline-block; }',
      '#' + WIDGET_ID + ' .ma-btn.ma-loading .ma-btn-text { display: none; }',
      '@keyframes ma-spin { to { transform: rotate(360deg); } }',
      '#' + WIDGET_ID + ' .ma-result {',
      '  margin-top: 16px;',
      '  padding: 14px;',
      '  background: #181825;',
      '  border-radius: 8px;',
      '  border: 1px solid #313244;',
      '  font-size: 13px;',
      '  line-height: 1.6;',
      '  white-space: pre-wrap;',
      '  word-break: break-word;',
      '  display: none;',
      '  max-height: 400px;',
      '  overflow-y: auto;',
      '}',
      '#' + WIDGET_ID + ' .ma-result.ma-visible { display: block; }',
      '#' + WIDGET_ID + ' .ma-result.ma-error {',
      '  border-color: #f38ba8;',
      '  color: #f38ba8;',
      '}',
      '#' + WIDGET_ID + ' .ma-footer {',
      '  margin-top: 18px;',
      '  text-align: center;',
      '  font-size: 11px;',
      '  color: #585b70;',
      '}',
      '#' + WIDGET_ID + ' .ma-footer a {',
      '  color: #6c7086;',
      '  text-decoration: none;',
      '  transition: color 0.2s;',
      '}',
      '#' + WIDGET_ID + ' .ma-footer a:hover {',
      '  color: #89b4fa;',
      '  text-decoration: underline;',
      '}',
      '#' + WIDGET_ID + ' .ma-empty-state {',
      '  text-align: center;',
      '  padding: 20px;',
      '  color: #585b70;',
      '  font-size: 13px;',
      '}',
      '@media (max-width: 640px) {',
      '  #' + WIDGET_ID + ' .ma-widget {',
      '    padding: 16px;',
      '    border-radius: 8px;',
      '  }',
      '  #' + WIDGET_ID + ' .ma-textarea {',
      '    min-height: 140px;',
      '    font-size: 12px;',
      '  }',
      '  #' + WIDGET_ID + ' .ma-btn {',
      '    width: 100%;',
      '    justify-content: center;',
      '  }',
      '}'
    ].join('\n');
    document.head.appendChild(styles);

    // ---- Build DOM ----
    var container = document.createElement('div');
    container.className = 'ma-widget';

    // Title
    var title = document.createElement('div');
    title.className = 'ma-title';
    title.textContent = 'Code Review';
    container.appendChild(title);

    // Textarea
    var textarea = document.createElement('textarea');
    textarea.className = 'ma-textarea';
    textarea.placeholder = 'Paste your code here for review...';
    textarea.spellcheck = false;
    container.appendChild(textarea);

    // Button row
    var btnRow = document.createElement('div');
    btnRow.className = 'ma-btn-row';

    var btn = document.createElement('button');
    btn.className = 'ma-btn';
    btn.type = 'button';
    btn.innerHTML = '<span class="ma-spinner"></span><span class="ma-btn-text">Analyze</span>';
    btnRow.appendChild(btn);
    container.appendChild(btnRow);

    // Result area
    var resultDiv = document.createElement('div');
    resultDiv.className = 'ma-result';
    container.appendChild(resultDiv);

    // Footer with backlink
    var footer = document.createElement('div');
    footer.className = 'ma-footer';
    var link = document.createElement('a');
    link.href = BACKLINK_URL;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = BACKLINK_LABEL;
    footer.appendChild(link);
    container.appendChild(footer);

    // Append widget to target
    target.appendChild(container);

    // Track embed
    var _paq = window._paq || [];
    _paq.push(['trackEvent', 'Widget', 'Embed', window.location.hostname]);

    // ---- Event: Analyze ----
    btn.addEventListener('click', function() {
      var code = textarea.value.trim();
      if (!code) {
        showResult('Please enter some code to review.', true);
        return;
      }

      btn.classList.add('ma-loading');
      btn.disabled = true;
      resultDiv.className = 'ma-result';
      resultDiv.textContent = '';

      fetch(API_URL, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code })
      })
      .then(function(response) {
        if (!response.ok) {
          return response.json().then(function(err) {
            throw new Error(err.error || 'Server returned ' + response.status);
          }).catch(function(e) {
            // If parsing error json fails
            throw new Error('Server returned ' + response.status);
          });
        }
        return response.json();
      })
      .then(function(data) {
        var review = data.feedback || data.review || 'No review text returned.';
        showResult(review, false);
      })
      .catch(function(err) {
        showResult('Unable to complete review: ' + err.message + '. Please try again later.', true);
      })
      .finally(function() {
        btn.classList.remove('ma-loading');
        btn.disabled = false;
      });
    });

    function showResult(text, isError) {
      resultDiv.textContent = text;
      resultDiv.className = 'ma-result ma-visible' + (isError ? ' ma-error' : '');
    }
  });
})();
