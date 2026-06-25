#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const topic = process.argv[2] || 'Testing APIs Online for Free';
const category = process.argv[3] || 'technology';
const config = JSON.parse(fs.readFileSync('/root/.automaton/automaton.json', 'utf8'));
const API_KEY = config.models?.deepseek?.apiKey || config.deepseek?.apiKey;
if (!API_KEY) { console.error('No DeepSeek API key'); process.exit(1); }

async function call(prompt) {
  const resp = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
    body: JSON.stringify({ model: 'deepseek-chat', messages: [
      { role: 'system', content: 'You are an expert SEO content writer. Return ONLY valid JSON.' },
      { role: 'user', content: prompt }
    ], temperature: 0.8, max_tokens: 4000 })
  });
  if (!resp.ok) throw new Error(`API ${resp.status}: ${await resp.text()}`);
  return resp.json();
}

async function main() {
  console.log(`🤖 Generating: "${topic}"...`);
  const prompt = `Write an SEO blog article about "${topic}" (category: ${category}).
Return this JSON ONLY (no markdown, no code fences):
{
  "slug": "url-friendly-slug",
  "title": "SEO Title with Keyword",
  "metaDescription": "150 char description",
  "html": "<h2>Section</h2><p>Content with 1000+ words...</p>",
  "faq": [{"q":"Question?","a":"Answer"}]
}`;

  const data = await call(prompt);
  const content = data.choices?.[0]?.message?.content || '';
  let json = content.replace(/```json\s*/g, '').replace(/```\s*$/g, '').trim();
  const post = JSON.parse(json);
  
  const blogDir = '/root/automaton/content/blog';
  if (!fs.existsSync(blogDir)) fs.mkdirSync(blogDir, { recursive: true });
  
  const filePath = path.join(blogDir, `${post.slug}.html`);
  const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width"><title>${post.title}</title>
<meta name="description" content="${post.metaDescription}"><meta name="robots" content="index, follow">
<link rel="canonical" href="https://automation.songheng.vip/blog/${post.slug}.html">
<link rel="stylesheet" href="/style.css"></head>
<body><main class="blog-post">
<h1>${post.title}</h1>
<p class="meta">${new Date().toISOString().split('T')[0]} | ${category}</p>
${post.html}
${post.faq ? `<section class="faq"><h2>FAQs</h2>${post.faq.map(f => `<div class="faq-item"><h3>${f.q}</h3><p>${f.a}</p></div>`).join('')}</section>` : ''}
<hr><p>Try free tools at <a href="https://automation.songheng.vip/tools">automation.songheng.vip/tools</a></p>
</main></body></html>`;
  
  fs.writeFileSync(filePath, fullHtml);
  console.log(`✅ Saved: ${post.title}`);
  console.log(`   File: ${filePath}`);

  // Update blog list
  const blogHtmlPath = '/root/automaton/content/blog.html';
  if (fs.existsSync(blogHtmlPath)) {
    let html = fs.readFileSync(blogHtmlPath, 'utf8');
    const entry = `<li><a href="/blog/${post.slug}.html">${post.title}</a> - ${new Date().toISOString().split('T')[0]}</li>`;
    html = html.replace('</ul>', `  ${entry}\n    </ul>`);
    fs.writeFileSync(blogHtmlPath, html);
    console.log('✅ Blog list updated');
  }

  // Submit to IndexNow
  try {
    const resp = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ host: 'automation.songheng.vip', key: 'automation-chaosong-dpdns-org',
        keyLocation: 'https://automation.songheng.vip/automation-chaosong-dpdns-org.txt',
        urlList: [`https://automation.songheng.vip/blog/${post.slug}.html`] })
    });
    console.log(`📤 IndexNow: ${resp.status}`);
  } catch(e) { console.log(`📤 IndexNow: failed`); }
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
