const fs = require('fs');
let c = fs.readFileSync('gateway.js','utf8');

// Add github-webhook-guide to staticPages
const searchStr = "'/tools': 'content/tools.html',";
const replaceStr = "'/tools': 'content/tools.html',\n    '/github-webhook-guide': 'content/github-webhook-guide.html',";
if (!c.includes('/github-webhook-guide')) {
  c = c.replace(searchStr, replaceStr);
  console.log('Added route');
}

// Fix nav
const navSearch = '<a href="/tools">Dev Tools</a>';
const navReplace = '<a href="/tools">Dev Tools</a><a href="/github-webhook-guide">GitHub Bot</a>';
if (!c.includes('GitHub Bot')) {
  c = c.replace(navSearch, navReplace);
  console.log('Added nav link');
}

// Add to free_endpoints in catalog
const freeEps = "free_endpoints: ['/', '/playground', '/tools', '/blog', '/api/catalog', '/health']";
const freeEpsNew = "free_endpoints: ['/', '/playground', '/tools', '/github-webhook-guide', '/blog', '/api/catalog', '/health']";
c = c.replace(freeEps, freeEpsNew);
console.log('Updated free endpoints');

fs.writeFileSync('gateway.js',c);
console.log('Gateway patched successfully');
