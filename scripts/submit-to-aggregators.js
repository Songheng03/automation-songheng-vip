#!/usr/bin/env node
// submit-to-aggregators.js — Submit my-automaton API to directories and search engines
// Run: node submit-to-aggregators.js

const https = require('https');
const http = require('http');

const SITE = 'https://automation.songheng.vip';
const WALLET = '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113';
const EMAIL = 'automaton@songheng.vip';
const NAME = 'my-automaton AI API';
const DESC = 'AI-powered code review, security scanning, text analysis, and summarization APIs with x402 USDC micropayments on Base chain. No signup. Pay per request.';

function fetch(url, method='GET', body=null, contentType='application/json') {
  return new Promise((resolve, reject) => {
    const opts = { method, headers: {} };
    if (body) { opts.headers['Content-Type'] = contentType; }
    const proto = url.startsWith('https') ? https : http;
    const req = proto.request(url, opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function main() {
  console.log(`=== my-automaton API Aggregator Submission ===`);
  console.log(`Site: ${SITE}`);
  console.log(`Wallet: ${WALLET}\n`);

  const results = [];

  // 1. Google Indexing API
  console.log('[1/8] Google Indexing API...');
  try {
    // Google's Indexing API requires OAuth. We'll use the faster method:
    // Just ping the update URL
    const r = await fetch(`https://www.google.com/ping?sitemap=${SITE}/sitemap.xml`);
    results.push({ name: 'Google Ping', status: r.status, note: r.status === 200 ? 'OK' : 'Fallback: use Search Console' });
    console.log(`  → ${r.status}`);
  } catch(e) { console.log(`  → Error: ${e.message}`); }

  // 2. Bing IndexNow
  console.log('[2/8] Bing IndexNow...');
  try {
    const r = await fetch('https://api.indexnow.org/indexnow', 'POST', JSON.stringify({
      host: 'automation.songheng.vip',
      key: 'automaton-indexnow-key',
      keyLocation: `${SITE}/indexnow-key.txt`,
      urlList: [`${SITE}/`, `${SITE}/developers`, `${SITE}/blog`, `${SITE}/playground`, `${SITE}/api-docs`]
    }));
    results.push({ name: 'Bing IndexNow', status: r.status, note: r.status === 200 ? 'Submitted' : r.data.slice(0,100) });
    console.log(`  → ${r.status}: ${r.data.slice(0,80)}`);
  } catch(e) { console.log(`  → Error: ${e.message}`); }

  // 3. api.gov.au / Australian OpenAPI register (test)
  console.log('[3/8] API Directories (ping)...');

  // 4. ProgrammableWeb (now owned by MuleSoft)
  try {
    const r = await fetch('https://www.programmableweb.com/api-registration');
    results.push({ name: 'ProgrammableWeb', status: 'manual', note: 'Requires manual submission' });
    console.log(`  → Manual submission required`);
  } catch(e) {}

  // 5. RapidAPI — requires manual publisher setup
  results.push({ name: 'RapidAPI', status: 'manual', note: 'Register as provider at https://rapidapi.com/publisher' });

  // 6. APILayer
  results.push({ name: 'APILayer', status: 'manual', note: 'Register at https://apilayer.com' });

  // 7. OpenAPI Hub (SwaggerHub)
  try {
    const spec = {
      openapi: '3.0.3',
      info: { title: NAME, description: DESC, version: '1.0.0', contact: { email: EMAIL } },
      servers: [{ url: SITE }],
      paths: {
        '/v1/analyze': { post: { summary: 'Deep text analysis', parameters: [{in:'query',name:'text',schema:{type:'string'}}], responses: { '200': { description: 'Analysis result' } } } },
        '/v1/summarize': { post: { summary: 'Text summarization' } },
        '/v1/review': { post: { summary: 'Code review' } },
        '/v1/security': { post: { summary: 'Security scan' } },
        '/v1/explain': { post: { summary: 'Code explanation' } },
        '/v1/refactor': { post: { summary: 'Refactoring suggestions' } },
        '/v1/complexity': { post: { summary: 'Complexity analysis' } }
      }
    };
    // Write spec locally for now — SwaggerHub also manual
    require('fs').writeFileSync('/root/automaton/content/openapi.json', JSON.stringify(spec, null, 2));
    results.push({ name: 'OpenAPI Spec', status: 'saved', note: 'openapi.json written to /content/' });
    console.log(`  → OpenAPI spec written to /content/openapi.json`);
  } catch(e) { console.log(`  → Error: ${e.message}`); }

  // 8. Social Media sharing links (generate share URLs)
  console.log('[4/8] Social Media Share Links...');
  const shareLinks = {
    twitter: `https://twitter.com/intent/tweet?text=AI+APIs+with+%24USDC+micropayments+on+%23Base+-+no+signup,+pay+per+request!&url=${encodeURIComponent(SITE)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(SITE)}`,
    hackernews: `https://news.ycombinator.com/submitlink?u=${encodeURIComponent(SITE)}&t=${encodeURIComponent('AI APIs with USDC Micropayments')}`,
    reddit: `https://www.reddit.com/submit?url=${encodeURIComponent(SITE)}&title=${encodeURIComponent('AI APIs with USDC micropayments - no signup, pay per request')}`
  };
  require('fs').writeFileSync('/root/automaton/content/share-links.json', JSON.stringify(shareLinks, null, 2));
  results.push({ name: 'Share Links', status: 'saved', note: 'share-links.json with Twitter/LinkedIn/HN/Reddit URLs' });
  console.log(`  → Share links written to /content/share-links.json`);

  // Write results summary
  const report = {
    timestamp: new Date().toISOString(),
    site: SITE,
    wallet: WALLET,
    results
  };
  require('fs').writeFileSync('/root/automaton/data/aggregator-submissions.json', JSON.stringify(report, null, 2));
  console.log(`\n✅ Report written to /root/automaton/data/aggregator-submissions.json`);
  console.log(`\nMANUAL ACTIONS NEEDED:`);
  console.log(`  1. Google Search Console: https://search.google.com/search-console`);

  console.log(`  2. Submit to RapidAPI: https://rapidapi.com/publisher`);

  console.log(`  3. Share on Twitter: ${shareLinks.twitter.slice(0,80)}...`);
  console.log(`  4. Share on HN: ${shareLinks.hackernews.slice(0,80)}...`);
  console.log(`  5. Register on APILayer, ProgrammableWeb`);
  console.log(`  6. Create accounts on API directories`);
}

main().catch(console.error);
