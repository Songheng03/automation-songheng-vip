#!/usr/bin/env node
/**
 * Search Engine Submission Script
 * Submits sitemap to Google, Bing, and other search engines
 */
const SUBMISSION_URLS = {
  google: 'https://www.google.com/ping?sitemap=http://automation.songheng.vip:8080/sitemap.xml',
  bing: 'https://www.bing.com/ping?sitemap=http://automation.songheng.vip:8080/sitemap.xml',
};

async function submit() {
  console.log('Submitting sitemap to search engines...\n');
  
  for (const [engine, url] of Object.entries(SUBMISSION_URLS)) {
    try {
      const res = await fetch(url, { method: 'GET' });
      console.log(`${engine}: ${res.status} ${res.statusText}`);
    } catch (e) {
      console.log(`${engine}: Failed - ${e.message}`);
    }
  }
  
  // Also try Google Indexing API via simple ping
  console.log('\nSubmitting individual pages to Google...');
  const pages = [
    'http://automation.songheng.vip:8080/',
    'http://automation.songheng.vip:8080/playground.html',
    'http://automation.songheng.vip:8080/code-quality-checker',
    'http://automation.songheng.vip:8080/blog.html',
    'http://automation.songheng.vip:8080/api-docs.html',
    'http://automation.songheng.vip:8080/free-ai-code-review-tool',
    'http://automation.songheng.vip:8080/free-ai-security-scanner',
    'http://automation.songheng.vip:8080/free-ai-text-summarizer',
    'http://automation.songheng.vip:8080/free-ai-code-explainer',
    'http://automation.songheng.vip:8080/ai-code-refactoring-tool',
    'http://automation.songheng.vip:8080/free-agent-to-agent-api',
    'http://automation.songheng.vip:8080/blog/pay-per-use-vs-subscription-ai-code-review.html',
    'http://automation.songheng.vip:8080/blog/the-ultimate-guide-to-free-ai-code-review.html',
    'http://automation.songheng.vip:8080/blog/how-to-automate-code-review-with-ai-github-webhooks.html',
  ];
  
  for (const page of pages) {
    try {
      // Google ping for individual URLs
      const pingUrl = `https://www.google.com/ping?sitemap=${encodeURIComponent(page)}`;
      await fetch(pingUrl, { method: 'GET' });
      console.log(`  ✓ Submitted: ${page}`);
    } catch (e) {
      console.log(`  ✗ Failed: ${page} - ${e.message}`);
    }
  }
  
  console.log('\n✅ Search engine submission complete!');
  console.log('Note: Indexing takes 24-72 hours for Google.');
  console.log('Bing/Worst typically indexes within 1-2 weeks.');
}

submit().catch(console.error);
