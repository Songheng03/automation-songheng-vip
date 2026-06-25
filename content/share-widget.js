// Social Share Widget - Add to any tool page before </body>
(function() {
  const widget = document.createElement('div');
  widget.className = 'share-widget';
  widget.innerHTML = `
    <style>
      .share-widget{position:fixed;bottom:20px;right:20px;display:flex;gap:8px;z-index:999;background:#161b22;border:1px solid #30363d;border-radius:50px;padding:8px 16px;box-shadow:0 4px 12px rgba(0,0,0,.3)}
      .share-widget a{color:#8b949e;text-decoration:none;font-size:20px;padding:4px;transition:all .2s;display:flex;align-items:center;justify-content:center}
      .share-widget a:hover{transform:scale(1.2)}
      .share-widget .twitter:hover{color:#1da1f2}
      .share-widget .linkedin:hover{color:#0077b5}
      .share-widget .reddit:hover{color:#ff4500}
      .share-widget .hn:hover{color:#ff6600}
      .share-widget .copy:hover{color:#58a6ff}
      .share-widget .tooltip{position:absolute;bottom:100%;right:0;background:#21262d;color:#c9d1d9;padding:4px 8px;border-radius:4px;font-size:12px;white-space:nowrap;opacity:0;pointer-events:none;transition:opacity .2s}
      .share-widget .copy:hover .tooltip{opacity:1}
    </style>
    <a href="#" class="twitter" onclick="shareTwitter()" title="Share on Twitter">🐦</a>
    <a href="#" class="linkedin" onclick="shareLinkedIn()" title="Share on LinkedIn">💼</a>
    <a href="#" class="reddit" onclick="shareReddit()" title="Share on Reddit">🤖</a>
    <a href="#" class="hn" onclick="shareHN()" title="Share on Hacker News">🟠</a>
    <a href="#" class="copy" onclick="copyLink()" title="Copy link"><span class="tooltip">Copied!</span>🔗</a>
  `;
  document.body.appendChild(widget);
  
  const pageUrl = encodeURIComponent(window.location.href);
  const pageTitle = encodeURIComponent(document.title);
  
  window.shareTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?text=${pageTitle}&url=${pageUrl}`, '_blank', 'width=550,height=420');
  };
  window.shareLinkedIn = () => {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${pageUrl}`, '_blank', 'width=550,height=420');
  };
  window.shareReddit = () => {
    window.open(`https://reddit.com/submit?url=${pageUrl}&title=${pageTitle}`, '_blank', 'width=550,height=420');
  };
  window.shareHN = () => {
    window.open(`https://news.ycombinator.com/submitlink?u=${pageUrl}&t=${pageTitle}`, '_blank', 'width=550,height=420');
  };
  window.copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    const tooltip = widget.querySelector('.tooltip');
    tooltip.style.opacity = '1';
    setTimeout(() => tooltip.style.opacity = '0', 1500);
    return false;
  };
})();
