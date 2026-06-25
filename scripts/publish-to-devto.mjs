#!/usr/bin/env node
/**
 * Publish syndicated content to dev.to
 * 
 * Usage:
 *   DEVTO_API_KEY=xxx node scripts/publish-to-devto.mjs
 *   DEVTO_API_KEY=xxx node scripts/publish-to-devto.mjs --dry-run
 * 
 * Get your API key: https://dev.to/settings/extensions
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const SYNDICATION_DIR = '/root/automaton/content/syndication';
const API_BASE = 'https://dev.to/api';
const DRY_RUN = process.argv.includes('--dry-run');
const API_KEY = process.env.DEVTO_API_KEY;

if (!API_KEY) {
  console.error('❌ DEVTO_API_KEY environment variable required');
  console.error('   Get it at https://dev.to/settings/extensions');
  process.exit(1);
}

async function publishArticle(article) {
  const body = JSON.stringify({
    article: {
      title: article.title,
      body_markdown: article.body_markdown,
      published: false, // draft first, review then publish
      tags: article.tags || ['ai', 'programming', 'devtools'],
      series: 'AI Code Review & Dev Tools',
      description: article.description || article.title
    }
  });

  if (DRY_RUN) {
    console.log(`\n📝 [DRY RUN] Would publish: ${article.title}`);
    console.log(`   Tags: ${(article.tags || ['ai', 'programming', 'devtools']).join(', ')}`);
    console.log(`   Length: ${(article.body_markdown || '').length} chars`);
    return { id: 'dry-run', url: 'https://dev.to/settings/extensions' };
  }

  try {
    const response = await fetch(`${API_BASE}/articles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': API_KEY
      },
      body
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error(`❌ HTTP ${response.status}: ${data.error || JSON.stringify(data)}`);
      return null;
    }
    
    console.log(`✅ Published: ${data.title}`);
    console.log(`   URL: ${data.url}`);
    console.log(`   ID: ${data.id}`);
    
    return data;
  } catch (err) {
    console.error(`❌ Network error: ${err.message}`);
    return null;
  }
}

async function main() {
  console.log(DRY_RUN ? '=== Dev.to Publisher (DRY RUN) ===' : '=== Dev.to Publisher ===');
  
  // Find all dev.to syndication files
  const files = readdirSync(SYNDICATION_DIR)
    .filter(f => f.startsWith('devto-') && f.endsWith('.json'))
    .sort();
  
  if (files.length === 0) {
    console.error('❌ No dev.to syndication files found');
    console.error(`   Run scripts/syndicate-content.mjs first`);
    process.exit(1);
  }

  console.log(`Found ${files.length} posts to publish\n`);

  const results = [];
  for (const file of files) {
    try {
      const content = JSON.parse(readFileSync(join(SYNDICATION_DIR, file), 'utf-8'));
      const result = await publishArticle(content);
      if (result) results.push(result);
      
      // Rate limit: 1 post every 2 seconds
      if (!DRY_RUN) await new Promise(r => setTimeout(r, 2000));
    } catch (err) {
      console.error(`❌ Error processing ${file}: ${err.message}`);
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Published: ${results.length}/${files.length}`);
  
  if (results.length > 0) {
    console.log('\n📊 Published URLs:');
    for (const r of results) {
      console.log(`   ${r.url}`);
    }
  }
  
  if (DRY_RUN) {
    console.log('\n💡 Run without --dry-run to actually publish');
    console.log(`   DEVTO_API_KEY=xxx node scripts/publish-to-devto.mjs`);
  }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
