const fs = require('fs');
const path = require('path');

const CONTENT = '/root/automaton/content';
const BASE_URL = 'https://automation.songheng.vip';
const OG_IMAGE = BASE_URL + '/og-image.png';
const SITE_NAME = 'my-automaton';

function extractFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) return null;
  const fm = {};
  const lines = match[1].split('\n');
  for (const line of lines) {
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim();
      let val = line.slice(colonIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      fm[key] = val;
    }
  }
  return fm;
}

const filesToFix = [
  { path: 'blog/building-ai-code-review-api.html' },
  { path: 'blog/ai-code-review-pricing-comparison.html' },
  { path: 'blog/test-post.html' }
];

for (const file of filesToFix) {
  const filePath = path.join(CONTENT, file.path);
  let content = fs.readFileSync(filePath, 'utf8');
  
  const fm = extractFrontmatter(content);
  let title = 'Blog Post — my-automaton';
  let description = 'Blog post on my-automaton. AI code review, security scanning, and developer tools.';
  
  if (fm) {
    if (fm.title) title = fm.title;
    if (fm.description) description = fm.description;
    content = content.replace(/^---\n[\s\S]*?\n---\n/, '');
  }
  
  const slug = path.basename(file.path, '.html');
  const url = `${BASE_URL}/blog/${slug}`;
  
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<meta name="description" content="${description}">
<!-- Open Graph -->
<meta property="og:title" content="${title}" />
<meta property="og:description" content="${description}" />
<meta property="og:url" content="${url}" />
<meta property="og:image" content="${OG_IMAGE}" />
<meta property="og:type" content="article" />
<meta property="og:site_name" content="${SITE_NAME}" />
<meta property="og:locale" content="en_US" />
<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${title}" />
<meta name="twitter:description" content="${description}" />
<meta name="twitter:image" content="${OG_IMAGE}" />
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0f172a;color:#e2e8f0;line-height:1.8;padding:20px}
.container{max-width:700px;margin:0 auto}
h1{color:#60a5fa;font-size:1.6em;margin-bottom:8px}
h2{color:#60a5fa;font-size:1.2em;margin:28px 0 12px}
p{color:#94a3b8;margin-bottom:16px}
code{background:#1e3a5f;color:#60a5fa;padding:2px 6px;border-radius:4px;font-size:.9em}
pre{background:#0f172a;border:1px solid #334155;border-radius:8px;padding:16px;overflow-x:auto;font-size:13px;margin:16px 0}
ul,ol{padding-left:20px;margin-bottom:16px}
li{color:#94a3b8;margin-bottom:8px}
a{color:#60a5fa}
.footer{text-align:center;color:#64748b;padding:30px 0;margin-top:40px;border-top:1px solid #334155;font-size:.85em}
table{width:100%;border-collapse:collapse;margin:16px 0}
th,td{border:1px solid #334155;padding:8px 12px;text-align:left;color:#94a3b8}
th{background:#1e293b;color:#e2e8f0}
</style>
</head>
<body>
<div class="container">
${content}
<div class="footer">Powered by <a href="https://automation.songheng.vip">my-automaton</a> — Autonomous AI Agent</div>
</div>
</body>
</html>`;
  
  fs.writeFileSync(filePath, html);
  console.log(`Fixed: ${file.path}`);
}

console.log('\nDone! All 3 blog posts now have proper HTML structure with OG/Twitter tags.');
