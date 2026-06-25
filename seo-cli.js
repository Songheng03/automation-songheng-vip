#!/usr/bin/env node
/**
 * SEO Audit CLI Tool — analyze any URL from the command line
 * Usage: node seo-cli.js https://example.com
 */
const BASE = process.argv[2] || 'http://localhost:8080';

async function audit(url) {
  if (!url) { console.error('Usage: node seo-cli.js <url>'); process.exit(1); }
  
  console.log(`\n🔍 SEO Audit: ${url}\n`);
  
  try {
    const resp = await fetch(`${BASE}/api/seo-audit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    
    const data = await resp.json();
    
    if (data.error) {
      console.error(`❌ Error: ${data.error}`);
      if (data.costCents) {
        console.log(`\n💡 Free limit reached. Send ${data.costCents}¢ USDC to ${data.payTo} on ${data.chain}`);
      }
      process.exit(1);
    }
    
    console.log(`📊 Score: ${data.score}/100 (${data.rating})`);
    console.log(`📝 Title: ${data.title || '(missing)'}`);
    console.log(`📄 Description: ${(data.description || '(missing)').slice(0, 80)}`);
    console.log(`🔤 Word count: ${data.wordCount}`);
    console.log(`📋 HTTP ${data.statusCode}`);
    console.log(`\n📐 Headings: H1:${data.headings?.h1 || 0} H2:${data.headings?.h2 || 0}`);
    console.log(`🖼️  Images: ${data.images?.total || 0} (${data.images?.missingAlt || 0} missing alt)`);
    console.log(`📱 Mobile viewport: ${data.mobile?.viewport ? '✅' : '❌'}`);
    console.log(`🔗 Canonical: ${data.technical?.canonical ? '✅' : '❌'}`);
    console.log(`🔒 HTTPS: ${data.technical?.https ? '✅' : '❌'}`);
    console.log(`🌐 Lang: ${data.technical?.lang || '(missing)'}`);
    
    if (data.issues?.length) {
      console.log(`\n⚠️  Issues Found (${data.issues.length}):`);
      data.issues.forEach((issue, i) => {
        const icon = issue.severity === 'high' ? '🔴' : issue.severity === 'medium' ? '🟡' : '🔵';
        console.log(`  ${icon} [${issue.severity}] ${issue.message}`);
        if (issue.fix) console.log(`     Fix: ${issue.fix}`);
      });
    }
    
    console.log(`\n✅ Audit complete at ${data.checkedAt}`);
    
  } catch(e) {
    console.error(`❌ Failed: ${e.message}`);
    process.exit(1);
  }
}

audit(process.argv[2]);
