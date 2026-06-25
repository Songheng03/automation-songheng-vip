/**
 * my-automaton API Status Badge Widget
 * 
 * Embeddable script that displays API status as a badge.
 * Creates backlinks to my-automaton from any site that embeds it.
 * 
 * USAGE:
 *   <script src="https://automation.songheng.vip/api-badge-widget.js" 
 *           data-style="flat" 
 *           data-label="my-automaton API"></script>
 * 
 * The widget fetches /api/status and renders a GitHub-style badge.
 * If the API is down, it renders a "offline" badge with a link to check status.
 */

(function() {
  'use strict';

  const SCRIPT = document.currentScript;
  if (!SCRIPT) return;

  const STYLE = SCRIPT.getAttribute('data-style') || 'flat';
  const LABEL = SCRIPT.getAttribute('data-label') || 'my-automaton';
  const THEME = SCRIPT.getAttribute('data-theme') || 'dark';

  // Build badge URL using static badge generation (shields.io style)
  function renderBadge(status) {
    const container = document.createElement('div');
    container.style.cssText = 'display:inline-block;vertical-align:middle;margin:2px';
    
    const colors = {
      ok: '#2ea043',
      degraded: '#d29922',
      offline: '#f85149',
      unknown: '#8b949e'
    };

    const labels = {
      ok: 'operational',
      degraded: 'degraded',
      offline: 'offline',
      unknown: 'checking...'
    };

    const color = colors[status] || colors.unknown;
    const statusText = labels[status] || labels.unknown;

    // GitHub-style badge using inline SVG (no external deps)
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svg.setAttribute('width', '160');
    svg.setAttribute('height', '20');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', `${LABEL}: ${statusText}`);

    const labelWidth = 80;
    const valueWidth = 80;
    const totalWidth = labelWidth + valueWidth;

    svg.innerHTML = `
      <rect width="${labelWidth}" height="20" fill="#555"/>
      <rect x="${labelWidth}" width="${valueWidth}" height="20" fill="${color}"/>
      <rect width="${totalWidth}" height="20" fill="transparent"/>
      <g fill="#fff" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">
        <text x="${labelWidth / 2}" y="14" text-anchor="middle" font-weight="700">${escHtml(LABEL)}</text>
        <text x="${labelWidth + valueWidth / 2}" y="14" text-anchor="middle" font-weight="700">${escHtml(statusText)}</text>
      </g>
    `;

    // Make it a clickable link
    const link = document.createElement('a');
    link.href = 'https://automation.songheng.vip/pricing.html';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.title = `my-automaton API — ${statusText}`;
    link.style.cssText = 'text-decoration:none';
    link.appendChild(svg);

    container.appendChild(link);
    SCRIPT.parentNode.insertBefore(container, SCRIPT.nextSibling);
  }

  function escHtml(s) {
    return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function checkStatus() {
    // Try the API status endpoint
    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/api/status', true);
    xhr.timeout = 5000;
    xhr.onload = function() {
      try {
        var data = JSON.parse(xhr.responseText);
        var status = 'unknown';
        if (data && data.status === 'ok') {
          status = data.apiCore === false ? 'degraded' : 'ok';
        } else {
          status = 'degraded';
        }
        renderBadge(status);
      } catch(e) {
        renderBadge('unknown');
      }
    };
    xhr.onerror = function() { renderBadge('unknown'); };
    xhr.ontimeout = function() { renderBadge('unknown'); };
    xhr.send();
  }

  // Wait for DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkStatus);
  } else {
    checkStatus();
  }
})();
