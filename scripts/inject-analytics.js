#!/usr/bin/env node
/**
 * Inject analytics tracking and share bar into all HTML pages.
 * Adds:
 * 1. Google Analytics (GA4) tracking code
 * 2. Share buttons (Twitter, LinkedIn)  
 * 3. Bottom CTA banner for premium services
 */
const fs = require('fs');
const path = require('path');

const CONTENT_DIR = '/root/automaton/content';
const ANALYTICS_SCRIPT = `
<!-- Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-XXXXXXXXXX');
</script>`;

const SHARE_BAR = `
<!-- Share buttons -->
<div style="position:fixed;left:0;top:50%;transform:translateY(-50%);background:#1a1a2e;padding:8px;border-radius:0 8px 8px 0;z-index:9999;display:flex;flex-direction:column;gap:6px">
  <a href="https://twitter.com/intent/tweet?url=https://automation.songheng.vip/" target="_blank" style="color:#1da1f2;text-decoration:none;font-size:18px;padding:4px" title="Share on Twitter">𝕏</a>
  <a href="https://www.linkedin.com/sharing/share-offsite/?url=https://automation.songheng.vip/" target="_blank" style="color:#0a66c2;text-decoration:none;font-size:18px;padding:4px" title="Share on LinkedIn">in</a>
  <button onclick="navigator.clipboard.writeText(window.location.href)" style="background:none;border:none;color:#888;font-size:16px;cursor:pointer;padding:4px" title="Copy link">🔗</button>
</div>`;

const CTA_BANNER = `
<!-- Premium CTA banner -->
<div style="position:fixed;bottom:0;left:0;right:0;background:linear-gradient(135deg,#667eea,#764ba2);color:white;padding:12px 20px;display:flex;justify-content:space-between;align-items:center;z-index:9999;font-family:sans-serif;font-size:14px;box-shadow:0 -2px 10px rgba(0,0,0,0.3)">
  <span>🤖 Need AI-powered code review? Try our <strong>free tools</strong> — no signup required!</span>
  <span>
    <a href="/tools" style="color:white;text-decoration:underline;margin-right:15px">Try Free</a>
    <a href="/api-docs" style="background:white;color:#667eea;padding:6px 16px;border-radius:4px;text-decoration:none;font-weight:bold">API Access</a>
  </span>
</div>`;

function getAllHtmlFiles(dir) {
  const results = [];
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results.push(...getAllHtmlFiles(fullPath));
    } else if (item.endsWith('.html')) {
      results.push(fullPath);
    }
  }
  return results;
}

function inject() {
  const files = getAllHtmlFiles(CONTENT_DIR);
  let injected = 0;
  let skipped = 0;
  let errors = 0;

  console.log(`Processing ${files.length} HTML files for analytics injection...`);

  for (const filePath of files) {
    try {
      let html = fs.readFileSync(filePath, 'utf8');
      const original = html;
      const relPath = path.relative(CONTENT_DIR, filePath);

      // Skip if already has analytics
      if (html.includes('gtag(') || html.includes('analytics')) {
        skipped++;
        continue;
      }

      // Inject analytics before </head>
      html = html.replace('</head>', `${ANALYTICS_SCRIPT}\n</head>`);

      // Inject share bar before </body> (skip index page CTA banner to avoid clutter)
      if (relPath !== 'index.html') {
        // Inject share bar
        if (!html.includes('Share on Twitter')) {
          html = html.replace('</body>', `${SHARE_BAR}\n</body>`);
        }

        // Inject CTA banner (skip index, it has its own hero CTA)
        if (!html.includes('Need AI-powered code review')) {
          html = html.replace('</body>', `${CTA_BANNER}\n</body>`);
        }
      }

      if (html !== original) {
        fs.writeFileSync(filePath, html);
        injected++;
        console.log(`  INJECTED: ${relPath}`);
      } else {
        skipped++;
      }
    } catch (e) {
      errors++;
      console.error(`  ERROR: ${filePath}: ${e.message}`);
    }
  }

  console.log(`\nDone! ${injected} injected, ${skipped} skipped, ${errors} errors`);
  return { injected, skipped, errors, total: files.length };
}

if (require.main === module) {
  inject();
}

module.exports = { inject };
