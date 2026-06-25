#!/usr/bin/env node
/**
 * CLI SEO Audit Tool — audit any URL from the command line
 * Usage: node seo-cli.js https://example.com
 * Output: Color-coded SEO audit report
 */
const https = require('https');
const http = require('http');

async function fetchUrl(url, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const mod = parsed.protocol === 'https:' ? https : http;
    const req = mod.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SEOAuditBot/1.0)' },
      timeout
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

function analyzeHtml(html, url) {
  const size = Buffer.byteLength(html, 'utf8');
  const text = html.replace(/<[^>]*>/g, ' ');
  const words = text.split(/\s+/).filter(w => w.length > 2);
  const wordCount = words.length;

  const title = (html.match(/<title[^>]*>([^<]*)<\/title>/i) || [])[1]?.trim();
  const desc = (html.match(/<meta\s+[^>]*name\s*=\s*["']description["'][^>]*content\s*=\s*["']([^"']*)["']/i) || [])[1]?.trim();
  const viewport = /<meta\s+[^>]*name\s*=\s*["']viewport["']/i.test(html);
  const charset = /<meta\s+[^>]*charset\s*=/i.test(html);
  const favicon = /<link[^>]*rel\s*=\s*["'](shortcut )?icon["']/i.test(html);
  const canonical = (html.match(/<link[^>]*rel\s*=\s*["']canonical["'][^>]*href\s*=\s*["']([^"']*)["']/i) || [])[1];
  const schema = /"@context"\s*:\s*"https?:\/\/schema\.org"/i.test(html) || /<script[^>]*type\s*=\s*["']application\/ld\+json["']/i.test(html);
  const og = /<meta\s+[^>]*property\s*=\s*["']og:/i.test(html);
  const robots = /<meta\s+[^>]*name\s*=\s*["']robots["']/i.test(html);

  const h1s = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map(h => h[1].replace(/<[^>]*>/g,'').trim()).filter(Boolean);
  const h2s = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)].map(h => h[1].replace(/<[^>]*>/g,'').trim()).filter(Boolean);

  const imgs = [...html.matchAll(/<img[^>]*src\s*=\s*["']([^"']*)["'][^>]*>/gi)];
  const noAlt = imgs.filter(i => !i[0].match(/alt\s*=\s*["']/i)).length;

  const links = [...html.matchAll(/<a[^>]*href\s*=\s*["'](https?:\/\/[^"']*)["']/gi)];
  const host = new URL(url).hostname;
  const internal = links.filter(l => l[1].includes(host)).length;
  const external = links.length - internal;

  let score = 50;
  if (title) score += 10;
  if (title && title.length >= 30 && title.length <= 60) score += 5;
  if (desc) score += 10;
  if (desc && desc.length >= 120 && desc.length <= 160) score += 5;
  if (viewport) score += 5;
  if (charset) score += 3;
  if (favicon) score += 3;
  if (canonical) score += 5;
  if (schema) score += 5;
  if (og) score += 4;
  if (h1s.length === 1) score += 5;
  if (h2s.length > 0) score += 3;
  if (noAlt === 0 && imgs.length > 0) score += 3;
  if (noAlt > 0) score -= 2;
  if (wordCount > 300) score += 5;
  if (size < 50000) score += 3;
  score = Math.min(100, Math.max(0, score));

  let grade = 'F';
  if (score >= 90) grade = 'A';
  else if (score >= 80) grade = 'B';
  else if (score >= 65) grade = 'C';
  else if (score >= 50) grade = 'D';

  const issues = [];
  const warnings = [];
  if (!title) issues.push('Missing <title>');
  if (!desc) issues.push('Missing meta description');
  if (h1s.length === 0) issues.push('No H1 heading');
  if (h1s.length > 1) warnings.push(`Multiple H1s (${h1s.length})`);
  if (!viewport) warnings.push('No viewport meta');
  if (!canonical) warnings.push('No canonical URL');
  if (!schema) warnings.push('No schema.org');
  if (!og) warnings.push('No Open Graph');
  if (noAlt > 0) warnings.push(`${noAlt} images missing alt`);
  if (wordCount < 300) warnings.push(`Low word count (${wordCount})`);

  return {
    url, title, metaDescription: desc, wordCount, h1Count: h1s.length, h2Count: h2s.length,
    imgCount: imgs.length, imgWithoutAlt: noAlt, internalLinks: internal, externalLinks: external,
    hasViewport: viewport, hasCharset: charset, hasFavicon: favicon,
    canonical, hasSchema: schema, hasOG: og, hasRobots: robots,
    score, grade, issues, warnings, pageSizeKB: (size / 1024).toFixed(1)
  };
}

async function main() {
  const url = process.argv[2];
  if (!url) {
    console.log('SEO Audit Tool — Usage: node seo-cli.js <url>');
    console.log('Example: node seo-cli.js https://example.com');
    process.exit(1);
  }

  console.log(`\n🔍 SEO Audit: ${url}\n${'─'.repeat(50)}`);

  try {
    const { body } = await fetchUrl(url);
    const result = analyzeHtml(body, url);

    console.log(`Grade: ${result.grade}   Score: ${result.score}/100`);
    console.log(`Title: ${result.title || '❌ MISSING'}`);
    console.log(`Description: ${(result.metaDescription || '❌ MISSING').substring(0, 100)}`);
    console.log(`Words: ${result.wordCount}  |  Size: ${result.pageSizeKB} KB`);
    console.log(`H1: ${result.h1Count}  |  H2: ${result.h2Count}`);
    console.log(`Images: ${result.imgCount} (${result.imgWithoutAlt} no alt)`);
    console.log(`Links: ${result.internalLinks} internal, ${result.externalLinks} external`);
    console.log(`Viewport: ${result.hasViewport ? '✅' : '❌'}  |  Schema: ${result.hasSchema ? '✅' : '❌'}  |  OG: ${result.hasOG ? '✅' : '❌'}`);

    if (result.issues.length) {
      console.log(`\n⚠ ISSUES:`);
      result.issues.forEach(i => console.log(`  • ${i}`));
    }
    if (result.warnings.length) {
      console.log(`\n📌 WARNINGS:`);
      result.warnings.forEach(w => console.log(`  • ${w}`));
    }

    // Output JSON for programmatic use
    if (process.argv.includes('--json')) {
      console.log('\n--- JSON ---');
      console.log(JSON.stringify(result, null, 2));
    }

  } catch(e) {
    console.error(`❌ Error: ${e.message}`);
    process.exit(1);
  }
}

main();
