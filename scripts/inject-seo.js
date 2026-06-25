#!/usr/bin/env node
// inject-seo.js — Directly injects OG tags + social share bar + Google verification
// into ALL HTML files in content/. Permanent. No runtime injection needed.
// Run: node scripts/inject-seo.js

const fs = require('fs');
const path = require('path');

const CONTENT_DIR = '/root/automaton/content';
const SEO_META = `
<meta name="google-site-verification" content="YOUR_CODE" />
<meta property="og:site_name" content="my-automaton" />
<meta property="og:type" content="website" />
<meta property="og:locale" content="en_US" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:site" content="@my_automaton" />
`.trim();

const SHARE_BAR = `<div class="share-bar" style="position:fixed;bottom:20px;right:20px;z-index:9999;display:flex;gap:8px;background:rgba(0,0,0,0.85);padding:10px 14px;border-radius:30px;backdrop-filter:blur(8px);box-shadow:0 2px 12px rgba(0,0,0,0.3)">
<button onclick="window.open('https://twitter.com/intent/tweet?text='+encodeURIComponent(document.title)+'&url='+encodeURIComponent(location.href),'_blank')" style="background:#1DA1F2;border:none;color:white;padding:8px 12px;border-radius:20px;cursor:pointer;font-size:13px;font-weight:bold">X</button>
<button onclick="window.open('https://www.linkedin.com/sharing/share-offsite/?url='+encodeURIComponent(location.href),'_blank')" style="background:#0A66C2;border:none;color:white;padding:8px 12px;border-radius:20px;cursor:pointer;font-size:13px;font-weight:bold">in</button>
<button onclick="window.open('https://reddit.com/submit?url='+encodeURIComponent(location.href)+'&title='+encodeURIComponent(document.title),'_blank')" style="background:#FF4500;border:none;color:white;padding:8px 12px;border-radius:20px;cursor:pointer;font-size:13px;font-weight:bold">r</button>
</div>`;

function injectFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const orig = content;
  
  // Add SEO meta
  if (!content.includes('google-site-verification') && content.includes('</head>')) {
    content = content.replace('</head>', SEO_META + '\n</head>');
  }
  
  // Add share bar
  if (!content.includes('share-bar') && content.includes('</body>')) {
    content = content.replace('</body>', SHARE_BAR + '\n</body>');
  }
  
  if (content !== orig) {
    fs.writeFileSync(filePath, content);
    return true;
  }
  return false;
}

// Walk recursively through content directory
function walk(dir) {
  let modified = 0, total = 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const r = walk(fullPath);
      modified += r.modified;
      total += r.total;
    } else if (entry.name.endsWith('.html')) {
      total++;
      if (injectFile(fullPath)) modified++;
    }
  }
  return { modified, total };
}

const result = walk(CONTENT_DIR);
console.log(`Injected SEO tags into ${result.modified}/${result.total} HTML files`);
console.log(`Already had tags: ${result.total - result.modified}/${result.total}`);

// Also log which files we modified
