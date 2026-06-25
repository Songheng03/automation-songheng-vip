/**
 * Badge Generator — Client-side SVG badge creator
 * Developers embed these badges in their GitHub READMEs
 * Each badge links back to automation.songheng.vip
 * 
 * Usage: 
 *   <img src="https://automation.songheng.vip/tools/badge?label=code%20quality&grade=A&score=92&color=green">
 *   
 * Or generate from the tool page at /tools/badge-generator.html
 */

(function() {
  'use strict';

  // ─── Badge Templates ───
  const TEMPLATES = {
    'code-review': { label: 'AI Code Review', color: '#3b82f6' },
    'security':    { label: 'Security Scan',  color: '#ef4444' },
    'complexity':  { label: 'Complexity',     color: '#8b5cf6' },
    'coverage':    { label: 'Test Coverage',  color: '#10b981' },
    'quality':     { label: 'Code Quality',   color: '#3b82f6' },
    'performance': { label: 'Performance',    color: '#f59e0b' },
    'maintainability': { label: 'Maintainability', color: '#06b6d4' },
    'docs':        { label: 'Documentation',  color: '#6366f1' },
  };

  const GRADE_COLORS = {
    'A+': '#22c55e', 'A': '#22c55e', 'A-': '#16a34a',
    'B+': '#84cc16', 'B': '#65a30d', 'B-': '#4d7c0f',
    'C+': '#eab308', 'C': '#ca8a04', 'C-': '#a16207',
    'D+': '#f97316', 'D': '#ea580c', 'D-': '#c2410c',
    'F':  '#ef4444'
  };

  function generateBadge(label, grade, score, type) {
    const tmpl = TEMPLATES[type] || { label: label || 'Custom', color: '#6b7280' };
    const gradeColor = GRADE_COLORS[grade] || '#6b7280';
    const displayLabel = label || tmpl.label;
    const scoreStr = score !== undefined ? ` ${score}` : '';
    const gradeStr = grade || 'N/A';
    
    // Badge dimensions
    const labelWidth = displayLabel.length * 7 + 12;
    const gradeWidth = 28;
    const scoreWidth = score !== undefined ? 30 : 0;
    const totalWidth = labelWidth + gradeWidth + scoreWidth + 2;
    
    // Simple flat badge SVG
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20" role="img" aria-label="${displayLabel}: ${gradeStr}${scoreStr}">
  <linearGradient id="smooth" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="100%" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r"><rect width="${totalWidth}" height="20" rx="3" fill="#fff"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="20" fill="#555"/>
    <rect x="${labelWidth}" width="${gradeWidth + scoreWidth}" height="20" fill="${gradeColor}"/>
    <rect width="${totalWidth}" height="20" fill="url(#smooth)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">
    <text x="${labelWidth/2}" y="15" fill="#010101" fill-opacity=".3">${displayLabel}</text>
    <text x="${labelWidth/2}" y="14">${displayLabel}</text>
    <text x="${labelWidth + (gradeWidth + scoreWidth)/2}" y="15" fill="#010101" fill-opacity=".3">${gradeStr}${scoreStr}</text>
    <text x="${labelWidth + (gradeWidth + scoreWidth)/2}" y="14">${gradeStr}${scoreStr}</text>
  </g>
</svg>`;
  }

  // ─── API endpoint: GET /tools/badge?label=...&grade=...&score=...&type=... ───
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('label') || urlParams.get('type')) {
    const label = urlParams.get('label') || '';
    const grade = urlParams.get('grade') || 'A';
    const score = urlParams.get('score');
    const type = urlParams.get('type') || '';
    
    // If this is an image request, return SVG
    const accept = (navigator.userAgent || '').toLowerCase();
    if (accept.includes('curl') || accept.includes('wget') || document.referrer === '' || urlParams.get('raw') === '1') {
      document.body.innerHTML = generateBadge(label, grade, score, type);
      document.body.style.margin = '0';
      return;
    }
  }

  // ─── UI for badge generator page ───
  function renderUI() {
    document.title = 'Free GitHub README Badge Generator — AI Code Quality Badges';
    document.querySelector('meta[name="description"]')?.setAttribute('content', 
      'Generate free SVG badges for your GitHub README. Code quality, security, test coverage, and AI review badges. No signup required.');
    
    const main = document.createElement('main');
    main.innerHTML = `
      <style>
        body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0a0a1a;color:#e0e0e0;max-width:800px;margin:0 auto;padding:20px}
        h1{color:#60a5fa}
        h2{color:#93c5fd}
        .card{background:#111132;border:1px solid #2a2a5a;border-radius:12px;padding:20px;margin:16px 0}
        label{display:block;margin:12px 0 4px;color:#94a3b8;font-weight:600}
        input,select{width:100%;padding:8px 12px;background:#1a1a3e;border:1px solid #2a2a5a;border-radius:6px;color:#e0e0e0;font-size:14px}
        .preview{background:#fff;padding:20px;border-radius:8px;text-align:center;min-height:60px;display:flex;align-items:center;justify-content:center}
        .preview svg{max-width:100%}
        .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
        code{background:#1a1a3e;padding:4px 8px;border-radius:4px;font-size:.85em;word-break:break-all}
        .btn{background:#3b82f6;color:white;border:none;padding:10px 20px;border-radius:8px;cursor:pointer;font-weight:600;margin:8px 4px}
        .btn:hover{background:#2563eb}
        .btn-secondary{background:#2a2a5a;color:#93c5fd;border:1px solid #3a3a6a}
        .badge-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px;margin:16px 0}
        .badge-card{background:#1a1a3e;border:1px solid #2a2a5a;border-radius:8px;padding:12px;text-align:center;cursor:pointer;transition:border-color .2s}
        .badge-card:hover{border-color:#60a5fa}
        .badge-card svg{max-width:100%}
        .badge-card p{margin:8px 0 0;font-size:.8em;color:#6b7280}
      </style>
      <h1>🛡️ Free GitHub README Badge Generator</h1>
      <p>Generate beautiful SVG badges for your GitHub projects. Free, no signup, hotlink directly.</p>

      <div class="card">
        <h2>🎨 Custom Badge</h2>
        <label>Badge Type</label>
        <select id="badgeType">
          <option value="code-review">AI Code Review</option>
          <option value="security">Security Scan</option>
          <option value="complexity">Complexity</option>
          <option value="coverage">Test Coverage</option>
          <option value="quality">Code Quality</option>
          <option value="performance">Performance</option>
          <option value="maintainability">Maintainability</option>
          <option value="docs">Documentation</option>
          <option value="custom">Custom Label</option>
        </select>
        
        <label>Custom Label (if type = Custom)</label>
        <input id="customLabel" value="My Badge">
        
        <label>Grade</label>
        <select id="grade">
          <option value="A+">A+</option>
          <option value="A" selected>A</option>
          <option value="A-">A-</option>
          <option value="B+">B+</option>
          <option value="B">B</option>
          <option value="B-">B-</option>
          <option value="C+">C+</option>
          <option value="C">C</option>
          <option value="D">D</option>
          <option value="F">F</option>
        </select>
        
        <label>Score (optional)</label>
        <input id="score" type="number" min="0" max="100" value="92">
        
        <div style="margin-top:12px">
          <button class="btn" id="genBtn">🔄 Generate Badge</button>
          <button class="btn btn-secondary" id="copyMd">📋 Copy Markdown</button>
          <button class="btn btn-secondary" id="copyHtml">🔗 Copy HTML</button>
        </div>
      </div>

      <div class="card">
        <h2>👁️ Preview</h2>
        <div class="preview" id="preview"></div>
        <p style="margin:8px 0 0;font-size:.8em;color:#6b7280">Hotlink URL:</p>
        <code id="urlDisplay"></code>
      </div>

      <div class="card">
        <h2>🔥 Quick Badges</h2>
        <p>Click any badge to copy its markdown:</p>
        <div class="badge-grid" id="quickBadges"></div>
      </div>

      <div class="card">
        <h2>📖 How to Use</h2>
        <p>Add this to your GitHub README:</p>
        <code id="usageExample">[![AI Code Review](https://automation.songheng.vip/tools/badge?type=code-review&grade=A&score=95)](https://automation.songheng.vip)</code>
        <p style="margin-top:12px;color:#6b7280;font-size:.9em">
          Badges link back to my-automaton's free AI code review service.
          Every click is a potential user. <strong>Join the network.</strong>
        </p>
        <a href="/upgrade" style="color:#60a5fa;font-weight:600">Get your own API credits →</a>
      </div>

      <div style="margin-top:20px;text-align:center;color:#6b7280;font-size:.8em">
        <a href="/">Home</a> · <a href="/api-docs">API Docs</a> · <a href="/upgrade">Pricing</a>
      </div>
    `;
    document.body.appendChild(main);

    function generateBadgeSVG() {
      const type = document.getElementById('badgeType').value;
      const label = type === 'custom' ? document.getElementById('customLabel').value : TEMPLATES[type]?.label || type;
      const grade = document.getElementById('grade').value;
      const score = document.getElementById('score').value;
      const tmpl = TEMPLATES[type] || { color: '#6b7280' };
      const gradeColor = GRADE_COLORS[grade] || '#6b7280';
      const labelWidth = label.length * 7 + 12;
      const gradeWidth = 28;
      const scoreWidth = score ? 30 : 0;
      const totalWidth = labelWidth + gradeWidth + scoreWidth + 2;
      const scoreStr = score ? ` ${score}` : '';
      
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20" role="img" aria-label="${label}: ${grade}${scoreStr}">
  <linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="100%" stop-opacity=".1"/></linearGradient>
  <clipPath id="r"><rect width="${totalWidth}" height="20" rx="3" fill="#fff"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="20" fill="#555"/>
    <rect x="${labelWidth}" width="${gradeWidth + scoreWidth}" height="20" fill="${gradeColor}"/>
    <rect width="${totalWidth}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">
    <text x="${labelWidth/2}" y="15" fill="#010101" fill-opacity=".3">${label}</text>
    <text x="${labelWidth/2}" y="14">${label}</text>
    <text x="${labelWidth + (gradeWidth + scoreWidth)/2}" y="15" fill="#010101" fill-opacity=".3">${grade}${scoreStr}</text>
    <text x="${labelWidth + (gradeWidth + scoreWidth)/2}" y="14">${grade}${scoreStr}</text>
  </g>
</svg>`;
      return { svg, label, grade, score, type, totalWidth };
    }

    function updatePreview() {
      const { svg, label, grade, score, type } = generateBadgeSVG();
      document.getElementById('preview').innerHTML = svg;
      const params = new URLSearchParams();
      if (type && type !== 'custom') params.set('type', type);
      else params.set('label', encodeURIComponent(label));
      params.set('grade', grade);
      if (score) params.set('score', score);
      const url = window.location.origin + '/tools/badge?' + params.toString();
      document.getElementById('urlDisplay').textContent = url;
      document.getElementById('usageExample').textContent = 
        `[![${label}](https://automation.songheng.vip${window.location.pathname}?${params.toString()})](https://automation.songheng.vip)`;
    }

    document.getElementById('genBtn').addEventListener('click', updatePreview);
    document.getElementById('badgeType').addEventListener('change', () => {
      document.getElementById('customLabel').style.display = 
        document.getElementById('badgeType').value === 'custom' ? 'block' : 'none';
      updatePreview();
    });
    document.getElementById('grade').addEventListener('change', updatePreview);
    document.getElementById('score').addEventListener('input', updatePreview);
    document.getElementById('customLabel').addEventListener('input', updatePreview);

    document.getElementById('copyMd').addEventListener('click', () => {
      const example = document.getElementById('usageExample').textContent;
      navigator.clipboard.writeText(example);
      document.getElementById('copyMd').textContent = '✅ Copied!';
      setTimeout(() => { document.getElementById('copyMd').textContent = '📋 Copy Markdown'; }, 2000);
    });
    document.getElementById('copyHtml').addEventListener('click', () => {
      const { svg } = generateBadgeSVG();
      navigator.clipboard.writeText(svg);
      document.getElementById('copyHtml').textContent = '✅ Copied!';
      setTimeout(() => { document.getElementById('copyHtml').textContent = '🔗 Copy HTML'; }, 2000);
    });

    // Quick badges grid
    const quickContainer = document.getElementById('quickBadges');
    const quickTypes = ['code-review', 'security', 'complexity', 'coverage', 'quality', 'performance', 'maintainability', 'docs'];
    quickTypes.forEach(t => {
      const tmpl = TEMPLATES[t];
      const card = document.createElement('div');
      card.className = 'badge-card';
      const { svg } = (() => {
        const g = 'A';
        const s = 90;
        const labelWidth = tmpl.label.length * 7 + 12;
        const gradeColor = '#22c55e';
        const totalWidth = labelWidth + 28 + 30 + 2;
        return {
          svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20" role="img"><linearGradient id="s${t}" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="100%" stop-opacity=".1"/></linearGradient><clipPath id="r${t}"><rect width="${totalWidth}" height="20" rx="3" fill="#fff"/></clipPath><g clip-path="url(#r${t})"><rect width="${labelWidth}" height="20" fill="#555"/><rect x="${labelWidth}" width="58" height="20" fill="${gradeColor}"/><rect width="${totalWidth}" height="20" fill="url(#s${t})"/></g><g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11"><text x="${labelWidth/2}" y="15" fill="#010101" fill-opacity=".3">${tmpl.label}</text><text x="${labelWidth/2}" y="14">${tmpl.label}</text><text x="${labelWidth + 29}" y="15" fill="#010101" fill-opacity=".3">A 90</text><text x="${labelWidth + 29}" y="14">A 90</text></g></svg>`
        };
      })();
      card.innerHTML = svg + `<p>${tmpl.label} · Click to copy</p>`;
      card.addEventListener('click', () => {
        const md = `[![${tmpl.label}](https://automation.songheng.vip/tools/badge?type=${t}&grade=A&score=90)](https://automation.songheng.vip)`;
        navigator.clipboard.writeText(md);
        card.querySelector('p').textContent = '✅ Copied!';
        setTimeout(() => { card.querySelector('p').textContent = `${tmpl.label} · Click to copy`; }, 2000);
      });
      quickContainer.appendChild(card);
    });

    // Initial render
    updatePreview();
  }

  // Run on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderUI);
  } else {
    renderUI();
  }
})();
