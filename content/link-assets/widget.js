/**
 * my-automaton Embeddable Widget — Backlink Generator
 * 
 * Other developers can embed this in their sites to show "Powered by AI Code Review"
 * or add a "Review this code" button. Each embed links back to automation.songheng.vip.
 * 
 * Usage: 
 *   <!-- AI Code Review Badge -->
 *   <script src="https://automation.songheng.vip/link-assets/widget.js" 
 *           data-style="badge"></script>
 *   
 *   <!-- Review Button -->
 *   <script src="https://automation.songheng.vip/link-assets/widget.js"
 *           data-style="button" data-label="Review this code with AI"></script>
 *   
 *   <!-- Full Widget -->
 *   <script src="https://automation.songheng.vip/link-assets/widget.js"
 *           data-style="widget" data-theme="dark"></script>
 */

(function() {
  'use strict';

  const BASE_URL = 'https://automation.songheng.vip';
  const STYLES = ['badge', 'button', 'widget'];
  
  const config = {
    style: 'badge',
    theme: 'dark',
    label: 'AI Code Review',
    position: 'bottom-right'
  };

  // Read data attributes from script tag
  const scripts = document.getElementsByTagName('script');
  const currentScript = scripts[scripts.length - 1];
  
  for (const attr of currentScript?.attributes || []) {
    if (attr.name.startsWith('data-')) {
      const key = attr.name.replace('data-', '');
      config[key] = attr.value;
    }
  }

  // Ensure valid style
  if (!STYLES.includes(config.style)) config.style = 'badge';

  function createBadge() {
    const link = document.createElement('a');
    link.href = `${BASE_URL}?ref=widget`;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.innerHTML = `
      <span style="
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 14px;
        background: ${config.theme === 'dark' ? '#1a1a2e' : '#f0e6ff'};
        color: ${config.theme === 'dark' ? '#a29bfe' : '#6c5ce7'};
        border: 1px solid ${config.theme === 'dark' ? '#30363d' : '#d0bfff'};
        border-radius: 20px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 13px;
        font-weight: 500;
        text-decoration: none;
        transition: all 0.2s;
        cursor: pointer;
      "
      onmouseover="this.style.transform='translateY(-1px)';this.style.boxShadow='0 2px 8px rgba(108,92,231,0.3)'"
      onmouseout="this.style.transform='';this.style.boxShadow=''"
      >
        <span style="font-size:16px;">🤖</span>
        ${config.label}
      </span>
    `;
    return link;
  }

  function createButton() {
    const container = document.createElement('div');
    container.style.cssText = 'margin: 16px 0;';
    container.innerHTML = `
      <a href="${BASE_URL}/demo.html?ref=embed" target="_blank" rel="noopener noreferrer"
         style="
           display: inline-flex;
           align-items: center;
           gap: 8px;
           padding: 10px 20px;
           background: linear-gradient(135deg, #6c5ce7, #a29bfe);
           color: white;
           border: none;
           border-radius: 8px;
           font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
           font-size: 14px;
           font-weight: 600;
           text-decoration: none;
           cursor: pointer;
           transition: all 0.2s;
         "
         onmouseover="this.style.transform='translateY(-1px)';this.style.boxShadow='0 4px 12px rgba(108,92,231,0.4)'"
         onmouseout="this.style.transform='';this.style.boxShadow=''"
      >
        <span style="font-size:18px;">🤖</span>
        ${config.label}
      </a>
    `;
    return container;
  }

  function createWidget() {
    const container = document.createElement('div');
    container.style.cssText = `
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: ${config.theme === 'dark' ? '#0d1117' : '#ffffff'};
      border: 1px solid ${config.theme === 'dark' ? '#30363d' : '#e1e4e8'};
      border-radius: 12px;
      padding: 20px;
      max-width: 340px;
      margin: 16px 0;
    `;

    container.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
        <span style="font-size:24px;">🤖</span>
        <span style="font-weight:600;color:${config.theme === 'dark' ? '#f0e6ff' : '#1a1a2e'};">
          AI Code Review
        </span>
      </div>
      <p style="
        color: ${config.theme === 'dark' ? '#8b949e' : '#586069'};
        font-size: 13px;
        line-height: 1.5;
        margin: 0 0 12px;
      ">
        Automated code review, security scanning & text analysis powered by DeepSeek AI.
        Try it free — no signup required.
      </p>
      <div style="display:flex;gap:8px;">
        <a href="${BASE_URL}/demo.html?ref=widget" target="_blank" rel="noopener noreferrer"
           style="
             flex:1;
             text-align:center;
             padding: 8px 16px;
             background: linear-gradient(135deg, #6c5ce7, #a29bfe);
             color: white;
             border-radius: 6px;
             font-size: 13px;
             font-weight: 600;
             text-decoration: none;
           ">Try Free</a>
        <a href="${BASE_URL}/api-docs.html?ref=widget" target="_blank" rel="noopener noreferrer"
           style="
             flex:1;
             text-align:center;
             padding: 8px 16px;
             background: ${config.theme === 'dark' ? '#21262d' : '#f6f8fa'};
             color: ${config.theme === 'dark' ? '#c9d1d9' : '#24292e'};
             border: 1px solid ${config.theme === 'dark' ? '#30363d' : '#e1e4e8'};
             border-radius: 6px;
             font-size: 13px;
             font-weight: 500;
             text-decoration: none;
           ">API Docs</a>
      </div>
    `;
    return container;
  }

  // Render
  const creators = { badge: createBadge, button: createButton, widget: createWidget };
  const element = creators[config.style]();
  
  // Insert after script tag
  currentScript?.parentNode?.insertBefore(element, currentScript.nextSibling);

})();
