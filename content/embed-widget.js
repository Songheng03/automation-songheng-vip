/**
 * Automation Embeddable AI Code Review Widget
 * Add to your site: <script src="https://automation.songheng.vip/embed-widget.js"></script>
 */
(function() {
  'use strict';

  const WIDGET_ID = 'automation-code-review-widget';
  const API_ENDPOINT = 'https://automation.songheng.vip/v1/review';
  
  // Inject styles
  const styles = `
    #${WIDGET_ID} {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    #${WIDGET_ID}-button {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s;
    }
    #${WIDGET_ID}-button:hover {
      transform: scale(1.1);
    }
    #${WIDGET_ID}-button svg {
      width: 30px;
      height: 30px;
      fill: white;
    }
    #${WIDGET_ID}-modal {
      display: none;
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 90%;
      max-width: 800px;
      max-height: 80vh;
      background: #1a1a1a;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.5);
      overflow: hidden;
    }
    #${WIDGET_ID}-modal.active {
      display: block;
    }
    #${WIDGET_ID}-header {
      padding: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    #${WIDGET_ID}-header h2 {
      margin: 0;
      font-size: 20px;
    }
    #${WIDGET_ID}-close {
      background: none;
      border: none;
      color: white;
      font-size: 28px;
      cursor: pointer;
      padding: 0;
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    #${WIDGET_ID}-body {
      padding: 20px;
      overflow-y: auto;
      max-height: calc(80vh - 80px);
    }
    #${WIDGET_ID}-textarea {
      width: 100%;
      min-height: 200px;
      background: #2a2a2a;
      color: #e0e0e0;
      border: 1px solid #444;
      border-radius: 8px;
      padding: 12px;
      font-family: 'Monaco', 'Menlo', monospace;
      font-size: 14px;
      resize: vertical;
    }
    #${WIDGET_ID}-submit {
      margin-top: 12px;
      padding: 12px 24px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 16px;
      font-weight: 600;
    }
    #${WIDGET_ID}-submit:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    #${WIDGET_ID}-result {
      margin-top: 20px;
      padding: 16px;
      background: #2a2a2a;
      border-radius: 8px;
      color: #e0e0e0;
      white-space: pre-wrap;
      font-size: 14px;
      line-height: 1.6;
    }
    #${WIDGET_ID}-powered {
      margin-top: 12px;
      text-align: center;
      font-size: 12px;
      color: #888;
    }
    #${WIDGET_ID}-powered a {
      color: #667eea;
      text-decoration: none;
    }
  `;

  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);

  // Create widget HTML
  const widget = document.createElement('div');
  widget.id = WIDGET_ID;
  widget.innerHTML = `
    <button id="${WIDGET_ID}-button" aria-label="AI Code Review">
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
      </svg>
    </button>
    <div id="${WIDGET_ID}-modal">
      <div id="${WIDGET_ID}-header">
        <h2>AI Code Review</h2>
        <button id="${WIDGET_ID}-close">&times;</button>
      </div>
      <div id="${WIDGET_ID}-body">
        <textarea id="${WIDGET_ID}-textarea" placeholder="Paste your code here for AI-powered review..."></textarea>
        <button id="${WIDGET_ID}-submit">Review Code</button>
        <div id="${WIDGET_ID}-result"></div>
        <div id="${WIDGET_ID}-powered">
          Powered by <a href="https://automation.songheng.vip" target="_blank">Automation AI</a>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(widget);

  // Event handlers
  const button = document.getElementById(`${WIDGET_ID}-button`);
  const modal = document.getElementById(`${WIDGET_ID}-modal`);
  const closeBtn = document.getElementById(`${WIDGET_ID}-close`);
  const textarea = document.getElementById(`${WIDGET_ID}-textarea`);
  const submitBtn = document.getElementById(`${WIDGET_ID}-submit`);
  const resultDiv = document.getElementById(`${WIDGET_ID}-result`);

  button.addEventListener('click', () => {
    modal.classList.add('active');
  });

  closeBtn.addEventListener('click', () => {
    modal.classList.remove('active');
  });

  submitBtn.addEventListener('click', async () => {
    const code = textarea.value.trim();
    if (!code) {
      resultDiv.textContent = 'Please paste some code to review.';
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Reviewing...';
    resultDiv.textContent = '';

    try {
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          code: code,
          language: 'auto'
        })
      });

      if (response.status === 402) {
        resultDiv.textContent = 'Free tier: 3 reviews per day. Upgrade at automation.songheng.vip for unlimited reviews.';
      } else if (response.ok) {
        const data = await response.json();
        resultDiv.textContent = data.review || data.result || JSON.stringify(data, null, 2);
      } else {
        resultDiv.textContent = 'Error: ' + response.statusText;
      }
    } catch (err) {
      resultDiv.textContent = 'Network error. Please try again.';
    }

    submitBtn.disabled = false;
    submitBtn.textContent = 'Review Code';
  });
})();
