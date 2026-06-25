#!/usr/bin/env node
/**
 * Schema.org Injector — Pass 2 of SEO optimization
 * Adds appropriate JSON-LD structured data to ALL pages.
 * 
 * Usage: node /root/automaton/services/schema-injector.mjs [--dry-run] [--fix]
 */

import fs from 'fs';
import path from 'path';

const CONTENT_DIR = '/root/automaton/content';
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const APPLY_FIX = args.includes('--fix');

if (!APPLY_FIX && !DRY_RUN) {
  console.log('Usage: node schema-injector.mjs [--dry-run] [--fix]');
  process.exit(0);
}

const BASE_URL = 'https://automation.automation.songheng.vip';

function getAllHTMLFiles(dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...getAllHTMLFiles(full));
    else if (entry.name.endsWith('.html')) results.push(full);
  }
  return results;
}

function extractTitle(content) {
  const match = content.match(/<title>([^<]*)<\/title>/i);
  return match ? match[1].trim() : null;
}

function extractMetaDesc(content) {
  const match = content.match(/<meta\s+name=["']description["'][^>]*content=["']([^"']*)["']/i);
  return match ? match[1].trim() : null;
}

function hasSchemaOrg(content) {
  return /<script[^>]*type=["']application\/ld\+json["']/i.test(content);
}

function detectPageType(filePath) {
  const relPath = path.relative(CONTENT_DIR, filePath);
  const name = path.basename(filePath, '.html');
  const dir = path.dirname(filePath);

  if (relPath.startsWith('blog')) return 'BlogPosting';
  if (relPath.startsWith('tools')) return 'WebApplication';
  if (name.includes('tool') || name.includes('generator') || name.includes('converter') || name.includes('checker')) return 'WebApplication';
  if (name.includes('playground') || name.includes('demo')) return 'WebApplication';
  if (relPath === 'index.html' || relPath === '' || name === 'index') return 'WebSite';
  if (name.includes('pricing') || name.includes('upgrade')) return 'Product';
  if (name.includes('docs') || name.includes('api')) return 'TechArticle';
  if (name.includes('about') || name.includes('contact')) return 'AboutPage';
  if (name.includes('dashboard') || name.includes('analytics')) return 'WebApplication';
  if (name.includes('badge')) return 'WebApplication';
  return 'WebPage';
}

function generateSchema(filePath, contentType, title, description) {
  const relPath = path.relative(CONTENT_DIR, filePath);
  const pageUrl = BASE_URL + '/' + relPath;
  const pageTitle = title || 'my-automaton — AI Developer Tools';
  const pageDesc = description || 'AI-powered developer tools and API services. Text analysis, code review, security scanning, summarization, and more.';

  switch (contentType) {
    case 'BlogPosting':
      return {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        'headline': pageTitle,
        'description': pageDesc.slice(0, 200),
        'url': pageUrl,
        'author': { '@type': 'Person', 'name': 'my-automaton' },
        'publisher': { '@type': 'Organization', 'name': 'my-automaton', 'url': BASE_URL },
        'mainEntityOfPage': pageUrl,
        'datePublished': '2026-06-01'
      };
    case 'WebApplication':
      return {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        'name': pageTitle,
        'description': pageDesc.slice(0, 200),
        'url': pageUrl,
        'applicationCategory': 'DeveloperApplication',
        'operatingSystem': 'Web',
        'author': { '@type': 'Organization', 'name': 'my-automaton', 'url': BASE_URL },
        'offers': { '@type': 'Offer', 'price': '0', 'priceCurrency': 'USD' }
      };
    case 'Product':
      return {
        '@context': 'https://schema.org',
        '@type': 'Product',
        'name': pageTitle,
        'description': pageDesc.slice(0, 200),
        'url': pageUrl,
        'brand': { '@type': 'Brand', 'name': 'my-automaton' },
        'offers': { '@type': 'AggregateOffer', 'lowPrice': '4.85', 'highPrice': '49.50', 'priceCurrency': 'USD', 'offerCount': '4' }
      };
    case 'WebSite':
      return {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        'name': 'my-automaton',
        'url': BASE_URL,
        'description': pageDesc.slice(0, 200),
        'potentialAction': {
          '@type': 'SearchAction',
          'target': BASE_URL + '/?q={search_term_string}',
          'query-input': 'required name=search_term_string'
        }
      };
    case 'AboutPage':
      return {
        '@context': 'https://schema.org',
        '@type': 'AboutPage',
        'name': pageTitle,
        'description': pageDesc.slice(0, 200),
        'url': pageUrl,
        'mainEntity': { '@type': 'Organization', 'name': 'my-automaton', 'url': BASE_URL }
      };
    case 'TechArticle':
      return {
        '@context': 'https://schema.org',
        '@type': 'TechArticle',
        'headline': pageTitle,
        'description': pageDesc.slice(0, 200),
        'url': pageUrl,
        'author': { '@type': 'Person', 'name': 'my-automaton' },
        'publisher': { '@type': 'Organization', 'name': 'my-automaton', 'url': BASE_URL },
        'proficiencyLevel': 'Beginner'
      };
    default:
      return {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        'name': pageTitle,
        'description': pageDesc.slice(0, 200),
        'url': pageUrl
      };
  }
}

// Main
const files = getAllHTMLFiles(CONTENT_DIR);
console.log('\n\uD83E\uDDE0 Schema.org Injector');
console.log('   Mode: ' + (DRY_RUN ? '\uD83D\uDD0E DRY RUN' : APPLY_FIX ? '\uD83D\uDD27 FIX MODE' : '?'));
console.log('   Scanning ' + files.length + ' files...\n');

let added = 0;
let skipped = 0;
let byType = {};

for (const file of files) {
  const content = fs.readFileSync(file, 'utf-8');
  
  if (hasSchemaOrg(content)) {
    skipped++;
    continue;
  }
  
  const title = extractTitle(content);
  const description = extractMetaDesc(content);
  const type = detectPageType(file);
  byType[type] = (byType[type] || 0) + 1;
  
  const schema = generateSchema(file, type, title, description);
  const json = JSON.stringify(schema, null, 2);
  const snippet = '\n<script type="application/ld+json">\n' + json + '\n</script>\n';
  
  if (DRY_RUN) {
    const relPath = path.relative(CONTENT_DIR, file);
    console.log('  [' + type + '] ' + relPath);
    added++;
    continue;
  }
  
  if (APPLY_FIX) {
    // Inject before </head>
    const newContent = content.replace('</head>', snippet + '</head>');
    if (newContent !== content) {
      const backup = file + '.schema.bak';
      if (!fs.existsSync(backup)) fs.copyFileSync(file, backup);
      fs.writeFileSync(file, newContent, 'utf-8');
      const relPath = path.relative(CONTENT_DIR, file);
      console.log('  \u2705 [' + type + '] ' + relPath);
      added++;
    } else {
      console.log('  \u26A0\uFE0F Cannot inject: ' + path.relative(CONTENT_DIR, file));
    }
  }
}

console.log('\n\uD83D\uDCCA RESULTS');
console.log('   Pages scanned:      ' + files.length);
console.log('   Already had schema: ' + skipped);
console.log('   Schema added:       ' + added);
console.log('\n\uD83D\uDCCA By type:');
for (const [type, count] of Object.entries(byType).sort((a,b) => b[1]-a[1])) {
  console.log('   ' + type + ': ' + count);
}
