#!/usr/bin/env node
// seo-cli.js - Command line SEO audit tool
// Usage: node seo-cli.js <url>
// Checks: meta tags, headers, page speed hints, content quality

const https = require('https');
const http = require('http');

const WALLET = '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113';
const CHAIN = 'base';

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, {timeout: 15000}, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({status: res.statusCode, headers: res.headers, body: data}));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

function analyzeMeta(body) {
  const results = [];
  
  // Title
  const titleMatch = body.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) {
    const t = titleMatch[1].trim();
    results.push({check: 'Title Tag', status: t.length >= 30 && t.length <= 60 ? '✓' : '⚠', detail: `${t.length} chars: "${t.substring(0,60)}"`, suggestion: t.length < 30 ? 'Title too short (<30 chars)' : t.length > 60 ? 'Title too long (>60 chars)' : 'Good length'});
  } else {
    results.push({check: 'Title Tag', status: '✗', detail: 'Missing', suggestion: 'Add a <title> tag (50-60 chars recommended)'});
  }

  // Meta description
  const descMatch = body.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
  if (descMatch) {
    const d = descMatch[1].trim();
    results.push({check: 'Meta Description', status: d.length >= 50 && d.length <= 160 ? '✓' : '⚠', detail: `${d.length} chars`, suggestion: d.length < 50 ? 'Description too short' : d.length > 160 ? 'Description too long' : 'Good length'});
  } else {
    results.push({check: 'Meta Description', status: '✗', detail: 'Missing', suggestion: 'Add meta description (120-160 chars recommended)'});
  }

  // Viewport
  if (body.match(/<meta[^>]+name=["']viewport["']/i)) {
    results.push({check: 'Viewport Meta', status: '✓', detail: 'Present'});
  } else {
    results.push({check: 'Viewport Meta', status: '✗', detail: 'Missing', suggestion: 'Add viewport meta tag for mobile responsiveness'});
  }

  // Open Graph
  const ogTitle = body.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  results.push({check: 'OG Title', status: ogTitle ? '✓' : '✗', detail: ogTitle ? 'Present' : 'Missing', suggestion: ogTitle ? '' : 'Add og:title for social sharing'});

  // Canonical
  const canonical = body.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i);
  results.push({check: 'Canonical URL', status: canonical ? '✓' : '⚠', detail: canonical ? canonical[1] : 'Missing', suggestion: canonical ? '' : 'Add canonical URL to prevent duplicate content issues'});

  // JSON-LD structured data
  if (body.match(/<script[^>]+type=["']application\/ld\+json["']/i)) {
    results.push({check: 'JSON-LD', status: '✓', detail: 'Structured data present'});
  } else {
    results.push({check: 'JSON-LD', status: '⚠', detail: 'Missing', suggestion: 'Add JSON-LD structured data for rich snippets'});
  }

  // H1
  const h1Match = body.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  if (h1Match) {
    results.push({check: 'H1 Heading', status: '✓', detail: h1Match[1].trim().substring(0,60)});
  } else {
    results.push({check: 'H1 Heading', status: '✗', detail: 'Missing', suggestion: 'Add exactly one H1 tag'});
  }

  // Images alt text
  const imgs = body.match(/<img[^>]+>/gi) || [];
  const noAlt = imgs.filter(i => !/alt=/i.test(i)).length;
  results.push({check: 'Image Alt Text', status: noAlt === 0 ? '✓' : `⚠`, detail: `${noAlt}/${imgs.length} images missing alt text`, suggestion: noAlt > 0 ? 'Add descriptive alt text to all images' : 'All good'});

  // Word count estimate
  const text = body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const words = text.split(/\s+/).length;
  results.push({check: 'Content Length', status: words >= 300 ? '✓' : '⚠', detail: `~${words} words`, suggestion: words < 300 ? 'Low content - aim for 300+ words' : 'Adequate content'});

  return results;
}

function analyzeHeaders(headers) {
  const results = [];
  
  const ct = headers['content-type'] || 'unknown';
  results.push({check: 'Content-Type', status: ct.includes('text/html') ? '✓' : '⚠', detail: ct});
  
  if (headers['x-robots-tag']) {
    results.push({check: 'X-Robots-Tag', status: '✓', detail: headers['x-robots-tag']});
  }
  
  if (headers['content-encoding']) {
    results.push({check: 'Compression', status: '✓', detail: `Using ${headers['content-encoding']}`});
  } else {
    results.push({check: 'Compression', status: '⚠', detail: 'No compression detected', suggestion: 'Enable gzip/brotli compression'});
  }

  return results;
}

function score(results) {
  const total = results.length;
  const passed = results.filter(r => r.status === '✓').length;
  const warned = results.filter(r => r.status === '⚠').length;
  const failed = results.filter(r => r.status === '✗').length;
  const score = Math.round((passed / total) * 100);
  return {score, passed, warned, failed, total};
}

async function main() {
  const url = process.argv[2];
  if (!url) {
    console.log('SEO Audit CLI Tool');
    console.log('Usage: node seo-cli.js <url>');
    console.log('Example: node seo-cli.js https://example.com');
    console.log('\nFree audit available or pay with USDC for detailed report');
    process.exit(1);
  }

  console.log(`\n🔍 SEO Audit: ${url}`);
  console.log('═'.repeat(50));

  try {
    const {status, headers, body} = await fetchUrl(url);
    
    if (status >= 400) {
      console.log(`❌ Error: HTTP ${status}`);
      process.exit(1);
    }

    console.log(`Status: HTTP ${status} ✓`);
    
    const metaResults = analyzeMeta(body);
    const headerResults = analyzeHeaders(headers);
    const all = [...metaResults, ...headerResults];
    const s = score(all);

    console.log(`\nSEO Score: ${s.score}/100 (${s.passed} passed, ${s.warned} warnings, ${s.failed} failed)`);
    console.log('═'.repeat(50));
    
    all.forEach(r => {
      const icon = r.status === '✓' ? '✅' : r.status === '⚠' ? '⚠️' : '❌';
      console.log(`${icon} ${r.check}`);
      console.log(`   ${r.detail}`);
      if (r.suggestion) console.log(`   💡 ${r.suggestion}`);
    });

    console.log('\n📊 Summary');
    console.log(`   Score: ${s.score}/100`);
    console.log(`   Passed: ${s.passed} | Warnings: ${s.warned} | Failed: ${s.failed}`);
    
    if (s.score < 50) {
      console.log('\n⚠️  Critical issues found. Consider a full professional audit.');
      console.log(`   Pay with USDC on ${CHAIN} to ${WALLET} for detailed recommendations.`);
    } else if (s.score < 80) {
      console.log('\n📈 Room for improvement. Address warnings for better SEO.');
    } else {
      console.log('\n✅ Good SEO foundation!');
    }

  } catch(e) {
    console.log(`❌ Error: ${e.message}`);
    process.exit(1);
  }
}

main();
