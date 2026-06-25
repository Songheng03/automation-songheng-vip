#!/usr/bin/env node
/**
 * auto-submit.mjs — Auto-Submit to AI Directories & SEO Tools
 * 
 * Submits my-automaton's services to:
 * - AI tool directories (Smithery, Glama, MCP.so)
 * - API aggregators (OpenAI-compatible catalogs)
 * - SEO tools (Google, Bing, IndexNow)
 * 
 * Run: node scripts/auto-submit.mjs
 */

const BASE = 'https://automation.songheng.vip';
const OUTPUT_DIR = '/root/automaton/content/link-assets';

// Generate submissions for each directory
const directories = [
  // AI Tool Directories
  {
    name: 'Smithery MCP Registry',
    url: 'https://smithery.ai/api/packages',
    type: 'auto',
    data: {
      name: 'my-automaton',
      description: 'AI-powered code review, security scanning, text analysis via MCP tools',
      homepage: BASE,
      repository: 'https://github.com/my-automaton/mcp-server',
      mcp_endpoint: `${BASE}/api/catalog/mcp`,
      tools: ['analyze', 'summarize', 'review', 'security', 'explain', 'refactor', 'complexity']
    }
  },
  {
    name: 'Glama MCP Registry',
    url: 'https://glama.ai/api/mcp/register',
    type: 'auto',
    data: {
      name: 'my-automaton',
      description: '7 AI-powered MCP tools for code review, security scanning, and text analysis',
      homepage: BASE,
      endpoint: `${BASE}/api/catalog`
    }
  },
  {
    name: 'MCP.so Directory',
    url: 'https://mcp.so/submit',
    type: 'manual',
    notes: 'Manual submission form at https://mcp.so/register'
  },
  // API Aggregators
  {
    name: 'OpenAI Compatible Tools',
    url: `${BASE}/api/catalog/openai`,
    type: 'auto',
    notes: 'My endpoint serves OpenAI tool definitions already'
  },
  {
    name: 'APIs.guru',
    url: 'https://apis.guru/add',
    type: 'manual',
    notes: 'Submit OpenAPI spec from /openapi.json'
  },
  {
    name: 'RapidAPI',
    url: 'https://rapidapi.com/submit',
    type: 'manual',
    notes: 'Create API provider account, submit my-automaton'
  },
  // Developer Communities
  {
    name: 'dev.to',
    url: 'https://dev.to/new',
    type: 'manual',
    notes: 'Post dev.to articles from content/syndication/ directory'
  },
  {
    name: 'Product Hunt',
    url: 'https://producthunt.com/posts/new',
    type: 'manual',
    notes: 'Launch my-automaton as a product'
  },
  // SEO
  {
    name: 'Google Search Console',
    url: 'https://search.google.com/search-console',
    type: 'manual',
    notes: `Verify site at ${BASE}, submit sitemap.xml`
  },
  {
    name: 'Bing Webmaster Tools',
    url: 'https://www.bing.com/webmasters',
    type: 'manual',
    notes: 'Add site, submit sitemap.xml'
  },
  {
    name: 'Hacker News',
    url: 'https://news.ycombinator.com/show',
    type: 'manual',
    notes: 'Post Show HN: my-automaton - AI code review API'
  },
  {
    name: 'Reddit r/programming',
    url: 'https://reddit.com/r/programming/submit',
    type: 'manual',
    notes: 'Post about my-automaton free tier'
  },
  {
    name: 'Reddit r/devops',
    url: 'https://reddit.com/r/devops/submit',
    type: 'manual',
    notes: 'Post about CI/CD integration with AI code review'
  },
  {
    name: 'Reddit r/webdev',
    url: 'https://reddit.com/r/webdev/submit',
    type: 'manual',
    notes: 'Post about free AI text analysis API'
  },
  {
    name: 'Indie Hackers',
    url: 'https://indiehackers.com/products/new',
    type: 'manual',
    notes: 'Share revenue model: pay-as-you-go AI API service'
  },
  {
    name: 'GitHub Marketplace',
    url: 'https://github.com/marketplace/new',
    type: 'manual',
    notes: 'Submit GitHub Action for AI code review'
  }
];

// Generate auto-submit URLs for direct pings
function generateSourceLinks() {
  const links = [
    { name: 'Interactive Demo', url: `${BASE}/demo.html`, type: 'demo' },
    { name: 'API Documentation', url: `${BASE}/api-docs.html`, type: 'docs' },
    { name: 'Upgrade / Get API Key', url: `${BASE}/upgrade.html`, type: 'commerce' },
    { name: 'Blog Index', url: `${BASE}/blog.html`, type: 'content' },
    { name: 'Sitemap', url: `${BASE}/sitemap.xml`, type: 'seo' },
    { name: 'Agent Card', url: `${BASE}/agent.json`, type: 'api' },
    { name: 'Health Check', url: `${BASE}/health`, type: 'api' },
    { name: 'MCP Catalog', url: `${BASE}/api/catalog`, type: 'api' },
    { name: 'API Playground', url: `${BASE}/api-playground.html`, type: 'demo' },
    { name: 'OpenAI Compatible', url: `${BASE}/api/catalog/openai`, type: 'api' },
    { name: 'MCP Config Generator', url: `${BASE}/mcp-config-generator.html`, type: 'tools' },
  ];
  return links;
}

// Generate <link> tags for SEO
function generateLinkTags() {
  const links = generateSourceLinks();
  let html = '<!-- Auto-generated source links -->\n';
  for (const link of links) {
    html += `<link rel="alternate" href="${link.url}" type="${link.type === 'api' ? 'application/json' : 'text/html'}" title="${link.name}" />\n`;
  }
  return html;
}

// Generate OG tags for social media
function generateOGTags() {
  return `<!-- Open Graph Tags -->
<meta property="og:title" content="my-automaton — AI Code Review & Analysis API" />
<meta property="og:description" content="Free AI-powered code review, security scanning, and text analysis API. 3 requests/day free. Plans start at $5." />
<meta property="og:url" content="${BASE}" />
<meta property="og:type" content="website" />
<meta property="og:image" content="${BASE}/link-assets/og-image.png" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="my-automaton — AI Code Review API" />
<meta name="twitter:description" content="Free AI code review, security scanning, and text analysis. Try it now." />`;
}

function main() {
  console.log('=== Auto-Submit Engine ===\n');
  
  // Generate submission checklist
  console.log('📋 Submission Checklist:');
  console.log('='.repeat(60));
  
  let autoCount = 0, manualCount = 0;
  for (const dir of directories) {
    const status = dir.type === 'auto' ? '🤖 AUTO' : '✋ MANUAL';
    if (dir.type === 'auto') autoCount++;
    else manualCount++;
    console.log(`  ${status} ${dir.name}`);
    if (dir.notes) console.log(`         ${dir.notes}`);
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`  Total directories: ${directories.length}`);
  console.log(`  Auto-submit: ${autoCount}`);
  console.log(`  Manual: ${manualCount}`);
  
  // Generate link-assets directory
  if (!require('fs').existsSync(OUTPUT_DIR)) {
    require('fs').mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  // Write SEO link tags
  const linkTags = generateLinkTags();
  const ogTags = generateOGTags();
  
  require('fs').writeFileSync(`${OUTPUT_DIR}/head-tags.html`, linkTags + '\n' + ogTags);
  console.log(`\n✅ Head tags written to ${OUTPUT_DIR}/head-tags.html`);
  
  // Write submission data
  const submissionData = {
    generated: new Date().toISOString(),
    site: BASE,
    directories,
    sourceLinks: generateSourceLinks()
  };
  require('fs').writeFileSync(`${OUTPUT_DIR}/submission-data.json`, JSON.stringify(submissionData, null, 2));
  console.log(`✅ Submission data written to ${OUTPUT_DIR}/submission-data.json`);
  
  console.log('\n🎯 Next actions:');
  console.log('  1. Add head-tags.html content to each page <head>');
  console.log('  2. Submit manual directory entries (✋ items)');
  console.log('  3. Wait 48h for SEO indexing');
  console.log('  4. Monitor traffic at /dashboard');
}

main();
