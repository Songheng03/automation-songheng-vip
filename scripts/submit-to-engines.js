#!/usr/bin/env node
/**
 * SEO Submission Script for my-automaton
 * Submits site to Google, Bing, Yandex, IndexNow, and web directories
 * Run: node /root/automaton/scripts/submit-to-engines.js
 */
const https = require('https');
const http = require('http');

const SITE = {
  url: 'https://automation.songheng.vip',
  name: 'AI Code Review & Text Analysis API',
  desc: 'Free AI-powered code review, text analysis, summarization, security scanning, and SEO audit tools. Pay-per-use API with USDC micropayments.',
  tags: ['AI code review', 'text analysis API', 'free code reviewer', 'AI summarization', 'security scan API', 'SEO audit tool', 'developer tools']
};

// ===== SEARCH ENGINES =====

async function submitIndexNow() {
  const sitemapUrls = [
    `${SITE.url}/sitemap.xml`
  ];
  const body = JSON.stringify({
    host: 'automation.songheng.vip',
    key: 'not-required-but-submitting',
    keyLocation: `${SITE.url}/`,
    urlList: sitemapUrls
  });
  
  return fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body
  }).then(r => ({engine:'IndexNow', status: r.status, text: r.statusText}))
    .catch(e => ({engine:'IndexNow', error: e.message}));
}

async function submitGoogle() {
  return fetch(`https://www.google.com/ping?sitemap=${encodeURIComponent(SITE.url + '/sitemap.xml')}`, {
    method: 'GET'
  }).then(r => ({engine:'Google', status: r.status}))
    .catch(e => ({engine:'Google', error: e.message}));
}

async function submitBing() {
  return fetch(`https://www.bing.com/ping?sitemap=${encodeURIComponent(SITE.url + '/sitemap.xml')}`, {
    method: 'GET'
  }).then(r => ({engine:'Bing', status: r.status}))
    .catch(e => ({engine:'Bing', error: e.message}));
}

async function submitYandex() {
  return fetch(`https://webmaster.yandex.com/addurl?url=${encodeURIComponent(SITE.url)}`, {
    method: 'GET'
  }).then(r => ({engine:'Yandex', status: r.status}))
    .catch(e => ({engine:'Yandex', error: e.message}));
}

// ===== WEB DIRECTORIES =====

const directories = [
  {
    name: 'Free API Directory',
    url: 'https://freetools.com/submit',
    type: 'free-tools'
  },
  {
    name: 'Awesome API',
    url: 'https://github.com/public-api-lists/public-api-lists',
    type: 'github'
  },
  {
    name: 'rapidapi.com',
    url: 'https://rapidapi.com/submit',
    type: 'api-marketplace'
  },
  {
    name: 'alternativeto.net',
    url: 'https://alternativeto.net/software/submit/',
    type: 'software-directory'
  },
  {
    name: 'saashub.com',
    url: 'https://www.saashub.com/submit',
    type: 'saas-directory'
  }
];

async function main() {
  console.log('========================================');
  console.log('  SEO Submission Tool');
  console.log(`  ${SITE.url}`);
  console.log('========================================\n');
  
  // 1. Submit to search engines
  console.log('--- Search Engine Submission ---');
  const results = await Promise.allSettled([
    submitIndexNow(),
    submitGoogle(),
    submitBing(),
    submitYandex()
  ]);
  
  for (const r of results) {
    const v = r.value || {engine:'?', error: r.reason?.message || 'unknown'};
    console.log(`  ${v.engine}: ${v.status || 'FAIL'} ${v.error || ''}`);
  }
  
  // 2. Generate IndexNow key file
  const fs = require('fs');
  const keyContent = 'automaton-site-verification-2025';
  fs.writeFileSync('/root/automaton/content/automaton-site-verification-2025.txt', keyContent);
  console.log('\n  ✓ IndexNow key file written');
  
  // 3. Generate submission guide
  console.log('\n--- Directories to manually submit to ---');
  for (const d of directories) {
    console.log(`  ${d.name}: ${d.url} (${d.type})`);
  }
  
  // 4. Generate HTML submission pages if needed
  const dirHtml = directories.map((d, i) => 
    `<li><a href="${d.url}" target="_blank" rel="noopener">${d.name}</a> <small>(${d.type})</small></li>`
  ).join('\n    ');
  
  const submissionPage = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Submit My AI Tools to Directories</title>
  <meta name="description" content="Submit AI Code Review, Text Analysis API, and Developer Tools to web directories and search engines.">
  <style>
    body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:800px;margin:0 auto;padding:20px;line-height:1.6}
    h1{color:#2563eb}
    .engine{border:1px solid #e5e7eb;border-radius:8px;padding:15px;margin:10px 0}
    .engine h3{margin:0 0 5px}
    .status{color:#059669;font-weight:bold}
    a{color:#2563eb;text-decoration:none}
    a:hover{text-decoration:underline}
  </style>
</head>
<body>
  <h1>📡 SEO Submission Status</h1>
  <p>Last auto-submitted: <strong id="date">${new Date().toISOString()}</strong></p>
  
  <h2>Search Engines</h2>
  ${results.map(r => {
    const v = r.value || {};
    const ok = v.status >= 200 && v.status < 400;
    return `<div class="engine">
      <h3>${v.engine || '?'}</h3>
      <p class="status">${ok ? '✅ Submitted' : '❌ Failed'} ${v.status ? '(HTTP '+v.status+')' : ''}</p>
      ${v.error ? '<p style="color:#dc2626">'+v.error+'</p>' : ''}
    </div>`;
  }).join('\n  ')}
  
  <h2>Directories to Submit To</h2>
  <ul>
    ${dirHtml}
  </ul>
  
  <h2>Site Info</h2>
  <ul>
    <li>URL: <a href="${SITE.url}">${SITE.url}</a></li>
    <li>Sitemap: <a href="${SITE.url}/sitemap.xml">sitemap.xml</a></li>
    <li>robots.txt: <a href="${SITE.url}/robots.txt">robots.txt</a></li>
    <li>Pages Indexed: <span id="pages">~80+</span></li>
  </ul>
</body>
</html>`;

  fs.writeFileSync('/root/automaton/content/seo-status.html', submissionPage);
  console.log('  ✓ SEO status page written to /seo-status\n');
  
  // 5. Log results
  const log = {
    timestamp: new Date().toISOString(),
    site: SITE.url,
    searchEngines: results.map(r => r.value || {error: r.reason?.message}),
    directories: directories,
    indexed: false
  };
  
  const dir = '/root/automaton/data';
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, {recursive: true});
  fs.writeFileSync(`${dir}/seo-submission-log.json`, JSON.stringify(log, null, 2));
  console.log('  ✓ Log written to data/seo-submission-log.json\n');
  
  console.log('--- Summary ---');
  const successCount = results.filter(r => r.value?.status >= 200 && r.value?.status < 400).length;
  console.log(`  Search engines submitted: ${successCount}/${results.length}`);
  console.log(`  Directories listed: ${directories.length}`);
  console.log(`  SEO status page: ${SITE.url}/seo-status`);
  console.log('========================================');
}

main().catch(console.error);
