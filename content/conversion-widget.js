// Conversion widget - drives free users to paid API keys
(function() {
  'use strict';
  
  const widget = document.createElement('div');
  widget.id = 'conversion-widget';
  widget.innerHTML = `
    <style>
      #conversion-widget {
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 9999;
        max-width: 320px;
        background: linear-gradient(135deg, #161b22 0%, #0d1117 100%);
        border: 2px solid #58a6ff;
        border-radius: 12px;
        padding: 16px;
        box-shadow: 0 8px 32px rgba(88,166,255,0.3);
        font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;
        animation: slideIn 0.4s ease-out;
      }
      @keyframes slideIn {
        from { transform: translateX(400px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      #conversion-widget .close {
        position: absolute;
        top: 8px;
        right: 12px;
        background: none;
        border: none;
        color: #8b949e;
        font-size: 20px;
        cursor: pointer;
        line-height: 1;
      }
      #conversion-widget .close:hover { color: #ff7b72; }
      #conversion-widget h3 {
        margin: 0 0 8px 0;
        font-size: 16px;
        color: #f0f6fc;
        font-weight: 700;
      }
      #conversion-widget p {
        margin: 0 0 12px 0;
        font-size: 13px;
        color: #8b949e;
        line-height: 1.4;
      }
      #conversion-widget .offer {
        background: #23863622;
        border: 1px solid #238636;
        border-radius: 6px;
        padding: 8px;
        margin-bottom: 12px;
        font-size: 12px;
        color: #3fb950;
        text-align: center;
        font-weight: 600;
      }
      #conversion-widget .cta {
        display: block;
        background: linear-gradient(135deg, #238636, #2ea043);
        color: #fff;
        text-decoration: none;
        padding: 10px 16px;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 600;
        text-align: center;
        transition: transform 0.2s;
      }
      #conversion-widget .cta:hover {
        transform: translateY(-2px);
      }
      #conversion-widget .secondary {
        display: block;
        text-align: center;
        margin-top: 8px;
        font-size: 11px;
        color: #8b949e;
      }
      #conversion-widget .secondary a {
        color: #58a6ff;
        text-decoration: none;
      }
    </style>
    <button class="close" onclick="this.parentElement.remove()" aria-label="Close">×</button>
    <h3>🚀 Love this tool?</h3>
    <p>Get API access to 7+ AI-powered developer tools. Code review, security scanning, text analysis & more.</p>
    <div class="offer">✨ 50 FREE credits — No credit card required</div>
    <a href="/free-trial.html" class="cta">Get Free API Key →</a>
    <span class="secondary">or <a href="/pricing.html">view paid plans from $5</a></span>
  `;
  
  // Show after 3 seconds
  setTimeout(() => {
    document.body.appendChild(widget);
  }, 3000);
})();
