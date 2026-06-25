const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://automation.songheng.vip';
const AUTOMATON_DIR = '/root/automaton';
const SITEMAP_PATH = '/root/automaton/workspace/sitemap.xml';

// Find all .html files (skip big irrelevant dirs)
function findAllHtmlFiles(dir) {
  const results = [];
  const seen = new Set();
  const skipDirs = new Set([
    'node_modules', '.git', 'logs', 'output', 'outputs', 'outreach',
    'data', 'mcp-server', 'lib', 'config', 'cli', 'notebooks',
    'examples', '.codegraph', '.github', 'github-action', 'gh-action',
    'heartbeat_tasks', 'npm-cli', 'npm-package', 'npm-packages', '.well-known'
  ]);
  
  function walk(d) {
    try {
      const entries = fs.readdirSync(d, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(d, entry.name);
        if (skipDirs.has(entry.name)) continue;
        if (entry.isDirectory()) {
          walk(fullPath);
        } else if (entry.name.endsWith('.html')) {
          if (!seen.has(fullPath)) {
            seen.add(fullPath);
            results.push(fullPath);
          }
        }
      }
    } catch (e) {}
  }
  
  walk(dir);
  return results;
}

// Convert file path to relative URL path
function fileToUrl(filePath) {
  let rel = filePath.replace(AUTOMATON_DIR, '');
  if (rel.startsWith('/')) rel = rel.substring(1);
  return rel;
}

// Get canonical URL for a file
function getCanonicalUrl(filePath) {
  let rel = fileToUrl(filePath);
  
  // Homepage
  if (rel === 'index.html' || rel === 'content/index.html') return BASE_URL + '/';
  
  // Strip content/ prefix
  if (rel.startsWith('content/')) rel = rel.replace('content/', '');
  
  // Strip static/ 
  if (rel.startsWith('static/')) rel = rel.replace('static/', '');
  
  // Handle services/public/
  if (rel.startsWith('services/public/')) rel = rel.replace('services/public/', '');
  
  // Handle services/gateway/static/
  if (rel.startsWith('services/gateway/static/')) rel = rel.replace('services/gateway/static/', '');
  
  // Handle blog/ in content
  if (rel.startsWith('blog/')) {
    // keep as is
  }
  
  // Handle data/blog/
  if (rel.startsWith('data/blog/')) rel = rel.replace('data/', '');
  
  // Handle workspace/
  if (rel.startsWith('workspace/')) rel = rel.replace('workspace/', '');
  
  // Handle blog-post.html etc at root
  return BASE_URL + '/' + rel;
}

// Priority and changefreq
function getMeta(urlPath) {
  if (urlPath === '' || urlPath === '/' || urlPath === 'index.html') {
    return { changefreq: 'daily', priority: '1.0' };
  }
  
  const highPriority = [
    'api-docs.html', 'api-playground.html', 'pricing.html', 'blog.html',
    'about.html', 'free-ai-code-review-tool.html', 'free-ai-text-summarizer.html',
    'free-ai-security-scanner.html', 'free-api-playground.html', 'free-tools.html',
    'code-review-tool.html', 'security-scanner.html', 'ai-code-reviewer.html',
    'mcp-integration-guide.html', 'github-action.html', 'install-mcp.html',
    'developer-quickstart.html', 'dev-quickstart.html', 'getting-started.html',
    'get-started.html', 'dashboard.html', 'agent-commerce.html', 'comparison.html',
    'checkout.html', 'free-api-key.html'
  ];
  
  if (highPriority.includes(urlPath)) {
    return { changefreq: 'weekly', priority: '0.8' };
  }
  
  if (urlPath.startsWith('blog/') && urlPath !== 'blog/index.html') {
    return { changefreq: 'monthly', priority: '0.7' };
  }
  
  if (urlPath === 'blog.html' || urlPath === 'blog/index.html') {
    return { changefreq: 'weekly', priority: '0.9' };
  }
  
  return { changefreq: 'monthly', priority: '0.6' };
}

function getLastmod(filePath) {
  try {
    return fs.statSync(filePath).mtime.toISOString().split('T')[0];
  } catch (e) {
    return '2025-06-19';
  }
}

function extractExistingUrls(sitemapPath) {
  try {
    const content = fs.readFileSync(sitemapPath, 'utf8');
    const regex = /<loc>([^<]+)<\/loc>/g;
    const urls = [];
    let match;
    while ((match = regex.exec(content)) !== null) urls.push(match[1]);
    return urls;
  } catch (e) { return []; }
}

console.log('Scanning for .html files...');
const allHtml = findAllHtmlFiles(AUTOMATON_DIR);
console.log(`Found ${allHtml.length} .html files total`);

// Build URL map
const urlMap = new Map();
for (const filePath of allHtml) {
  const canonicalUrl = getCanonicalUrl(filePath);
  if (!urlMap.has(canonicalUrl)) {
    const relPath = fileToUrl(filePath);
    urlMap.set(canonicalUrl, { filePath, meta: getMeta(relPath) });
  }
}

const existingUrls = extractExistingUrls(SITEMAP_PATH);
console.log(`Existing sitemap URLs: ${existingUrls.length}`);
console.log(`Canonical URLs from files: ${urlMap.size}`);

// Find missing
const existingSet = new Set(existingUrls);
const missing = [];
for (const [url, info] of urlMap) {
  if (!existingSet.has(url)) missing.push({ url, ...info });
}

// Find extra
const urlToFile = new Map();
for (const [url, info] of urlMap) urlToFile.set(url, info.filePath);
const noFile = [];
for (const url of existingUrls) {
  if (!urlToFile.has(url) && url !== BASE_URL + '/') noFile.push(url);
}

console.log(`\nMissing from sitemap: ${missing.length}`);
missing.slice(0, 30).forEach(m => console.log(`  MISS: ${m.url}`));
if (missing.length > 30) console.log(`  ... and ${missing.length - 30} more`);

console.log(`\nIn sitemap but no file: ${noFile.length}`);
noFile.slice(0, 20).forEach(u => console.log(`  EXTRA: ${u}`));
if (noFile.length > 20) console.log(`  ... and ${noFile.length - 20} more`);

// Build new sitemap
let sitemapEntries = [];

// Homepage
sitemapEntries.push({
  url: BASE_URL + '/',
  changefreq: 'daily', priority: '1.0',
  lastmod: getLastmod(path.join(AUTOMATON_DIR, 'index.html'))
});

for (const [url, info] of urlMap) {
  if (url === BASE_URL + '/') continue;
  sitemapEntries.push({
    url,
    changefreq: info.meta.changefreq,
    priority: info.meta.priority,
    lastmod: getLastmod(info.filePath)
  });
}

// Ensure blog index
for (const extra of [
  { url: BASE_URL + '/blog/', cf: 'weekly', pr: '0.9' },
  { url: BASE_URL + '/blog.html', cf: 'weekly', pr: '0.9' }
]) {
  if (!sitemapEntries.find(e => e.url === extra.url)) {
    sitemapEntries.push({
      url: extra.url,
      changefreq: extra.cf,
      priority: extra.pr,
      lastmod: '2025-06-19'
    });
  }
}

// Sort and dedup
sitemapEntries.sort((a, b) => {
  if (a.url === BASE_URL + '/') return -1;
  if (b.url === BASE_URL + '/') return 1;
  const pa = parseFloat(a.priority), pb = parseFloat(b.priority);
  if (pa !== pb) return pb - pa;
  return a.url.localeCompare(b.url);
});

const seen = new Set();
const unique = [];
for (const entry of sitemapEntries) {
  if (!seen.has(entry.url)) { seen.add(entry.url); unique.push(entry); }
}

console.log(`\nTotal unique entries: ${unique.length}`);

// Generate XML
let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
for (const entry of unique) {
  xml += '  <url>\n';
  xml += `    <loc>${entry.url}</loc>\n`;
  if (entry.lastmod) xml += `    <lastmod>${entry.lastmod}</lastmod>\n`;
  xml += `    <changefreq>${entry.changefreq}</changefreq>\n`;
  xml += `    <priority>${entry.priority}</priority>\n`;
  xml += '  </url>\n';
}
xml += '</urlset>\n';

fs.mkdirSync(path.dirname(SITEMAP_PATH), { recursive: true });
fs.writeFileSync(SITEMAP_PATH, xml);
console.log(`\nSaved to ${SITEMAP_PATH} (${xml.length} bytes)`);

// Stats
const blogCount = unique.filter(e => e.url.includes('/blog/') && !e.url.endsWith('/blog/') && e.url !== BASE_URL + '/blog.html').length;
console.log(`\n=== FINAL STATS ===`);
console.log(`Total URLs: ${unique.length}`);
console.log(`Blog articles: ${blogCount}`);
console.log(`Non-blog pages: ${unique.length - blogCount}`);
console.log(`Missing URLs added: ${missing.length}`);
