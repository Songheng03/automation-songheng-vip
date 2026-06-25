/**
 * my-automaton Embeddable AI Widget
 * Drop this script on any website for instant AI services.
 * Usage: <script src="http://automation.songheng.vip:8080/widget-embed.js"></script>
 *        <div class="my-automaton-widget" data-service="analyze"></div>
 */
(function() {
  const BASE = 'http://automation.songheng.vip:8080';
  const WALLET = '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113';
  
  const SERVICES = {
    analyze: { label: 'Text Analysis', cost: 1, key: 'text', placeholder: 'Paste text to analyze...' },
    summarize: { label: 'Summarizer', cost: 2, key: 'text', placeholder: 'Paste article to summarize...' },
    review: { label: 'Code Review', cost: 5, key: 'code', placeholder: 'Paste code for review...' },
    security: { label: 'Security Scan', cost: 3, key: 'code', placeholder: 'Paste code to scan...' },
    explain: { label: 'Code Explain', cost: 2, key: 'code', placeholder: 'Paste code to explain...' },
    refactor: { label: 'Refactoring', cost: 5, key: 'code', placeholder: 'Paste code to refactor...' },
    complexity: { label: 'Complexity', cost: 2, key: 'code', placeholder: 'Paste code for analysis...' },
    render: { label: 'Markdown Render', cost: 3, key: 'content', placeholder: 'Enter markdown...' },
  };

  function makeWidget(container) {
    const service = container.dataset.service || 'analyze';
    const info = SERVICES[service] || SERVICES.analyze;
    
    container.style.cssText = 'font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;background:#13131a;border:1px solid #1e1e2a;border-radius:12px;padding:16px;max-width:400px;color:#e0e0f0';
    
    container.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
        <span style="width:8px;height:8px;border-radius:50%;background:#00cec9;display:inline-block"></span>
        <span style="color:#7878a0;font-size:13px">${info.label}</span>
        <span style="margin-left:auto;color:#00cec9;font-size:12px;font-weight:600">${info.cost}¢</span>
      </div>
      <textarea id="ma-input" style="width:100%;background:#0a0a0f;border:1px solid #1e1e2a;border-radius:6px;padding:8px 12px;color:#e0e0f0;font-size:14px;font-family:monospace;min-height:80px;resize:vertical;outline:none;box-sizing:border-box" placeholder="${info.placeholder}"></textarea>
      <div style="text-align:right;font-size:11px;color:#7878a0;margin:4px 0">≈ $${(info.cost/100).toFixed(2)}/request</div>
      <button id="ma-run" style="background:#6c5ce7;color:#fff;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;font-weight:600;font-size:14px;width:100%">🚀 Run</button>
      <div id="ma-result" style="background:#0a0a0f;border:1px solid #1e1e2a;border-radius:6px;padding:10px;margin-top:8px;font-size:13px;white-space:pre-wrap;display:none;max-height:200px;overflow-y:auto"></div>
    `;

    container.querySelector('#ma-run').onclick = async () => {
      const input = container.querySelector('#ma-input');
      const result = container.querySelector('#ma-result');
      const text = input.value.trim();
      if (!text) return;
      
      result.style.display = 'block';
      result.textContent = 'Processing...';
      
      const body = {};
      if (info.key === 'code') body.code = text;
      else if (info.key === 'content') body.content = text;
      else body.text = text;
      
      try {
        const res = await fetch(`${BASE}/v1/${service}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        const data = await res.json();
        if (res.status === 402) {
          result.innerHTML = `<div style="color:#a29bfe">⚡ Payment required: ${data.costCents}¢ USDC<br><span style="font-size:12px">Send to:</span><br><span style="font-size:11px;color:#00cec9">${data.wallet}</span></div>`;
        } else {
          result.textContent = data.result || JSON.stringify(data);
        }
      } catch(e) {
        result.innerHTML = `<span style="color:#ff6b6b">Error: ${e.message}</span>`;
      }
    };
  }

  // Auto-init widgets on page
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.my-automaton-widget').forEach(makeWidget);
  });

  // Also handle dynamically added widgets
  const observer = new MutationObserver((mutations) => {
    mutations.forEach(m => {
      m.addedNodes.forEach(n => {
        if (n.nodeType === 1 && n.matches?.('.my-automaton-widget')) makeWidget(n);
        if (n.nodeType === 1) n.querySelectorAll?.('.my-automaton-widget').forEach(makeWidget);
      });
    });
  });
  observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
})();
