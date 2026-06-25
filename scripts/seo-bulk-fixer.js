#!/usr/bin/env node
/**
 * Bulk SEO Fixer — adds OG tags, titles, meta descriptions to all HTML pages
 * Scans /root/automaton/content/ recursively and fixes any page missing them.
 * Also regenerates sitemap.xml after fixes.
 */
const fs = require('fs');
const path = require('path');

const CONTENT_DIR = '/root/automaton/content';
const SITE_URL = 'https://automation.songheng.vip';

function getAllHtmlFiles(dir) {
  const results = [];
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results.push(...getAllHtmlFiles(fullPath));
    } else if (item.endsWith('.html') && item !== 'index.html') {
      results.push(fullPath);
    } else if (item === 'index.html') {
      results.push(fullPath);
    }
  }
  return results;
}

function getRelativePath(filePath) {
  return path.relative(CONTENT_DIR, filePath).replace(/\\/g, '/');
}

function getDefaultTitle(relPath) {
  const name = path.basename(relPath, '.html');
  const dir = path.dirname(relPath);
  
  // Derive a title from the filename and directory
  const clean = name
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .replace(/Ai\b/g, 'AI')
    .replace(/Seo\b/g, 'SEO')
    .replace(/Og\b/g, 'OG')
    .replace(/Url\b/g, 'URL')
    .replace(/Http\b/g, 'HTTP')
    .replace(/Api\b/g, 'API')
    .replace(/Js\b/g, 'JS')
    .replace(/Json\b/g, 'JSON');
  
  if (dir === '.') {
    if (name === 'index') return 'Automaton AI — AI-Powered Code Analysis & Text Services';
    if (name === 'blog') return 'Blog — Automaton AI';
    if (name === 'tools') return 'Free Developer Tools — Automaton AI';
    if (name === 'dashboard') return 'Revenue Dashboard — Automaton AI';
    if (name === 'api-docs') return 'API Documentation — Automaton AI';
    if (name === 'api-playground') return 'API Playground — Automaton AI';
    if (name === 'agent-commerce') return 'Agent Commerce Network — Automaton AI';
    if (name === 'quickstart') return 'Quickstart Guide — Automaton AI';
    if (name === 'upgrade' || name === 'pricing') return 'Upgrade to Premium — Automaton AI';
    if (name === 'support') return 'Support — Automaton AI';
    if (name === 'referral') return 'Referral Program — Automaton AI';
    if (name === 'live-demo') return 'Live Demo — Automaton AI';
    if (name === 'traffic-stats') return 'Traffic Stats — Automaton AI';
    if (name === 'google-search-console') return 'Google Search Console — Automaton AI';
    return `${clean} — Automaton AI`;
  }
  
  // For tools pages
  if (dir === 'tools') return `${clean} — Free Developer Tool by Automaton AI`;
  
  // For blog pages
  if (dir === 'blog') {
    const title = name.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    return `${title} — Automaton AI Blog`;
  }
  
  return `${clean} — Automaton AI`;
}

function getDefaultDescription(relPath) {
  const name = path.basename(relPath, '.html');
  const dir = path.dirname(relPath);
  
  if (dir === 'blog') {
    const title = name.replace(/[-_]/g, ' ');
    return `Read "${title}" on the Automaton AI blog. Insights on AI-powered code analysis, text processing, and developer tools.`;
  }
  
  if (dir === 'tools') {
    const title = name.replace(/[-_]/g, ' ');
    return `Use our free ${title} tool online. No signup required. Powered by Automaton AI.`;
  }
  
  const nameClean = name.replace(/[-_]/g, ' ');
  return `${nameClean} — Automaton AI. AI-powered code analysis, text processing, and developer tools. Free and premium services available.`;
}

function injectSEOTags(html, title, description, relPath) {
  const url = `${SITE_URL}/${relPath}`;
  
  // Fix or add title
  let result = html;
  if (!result.match(/<title>[^<]*<\/title>/i)) {
    result = result.replace(/<head>/i, `<head>\n  <title>${title}</title>`);
  }
  
  // Fix or add meta description
  if (!result.match(/<meta\s+name="description"[^>]*\/?>/i)) {
    result = result.replace(/<head>/i, `<head>\n  <meta name="description" content="${description}">`);
  }
  
  // Fix or add OG tags
  if (!result.match(/<meta\s+property="og:title"[^>]*\/?>/i)) {
    const ogTags = `
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${SITE_URL}/og-image.png">`;
    result = result.replace(/<head>/i, `<head>${ogTags}`);
  }
  
  // Fix or add Twitter card
  if (!result.match(/<meta\s+name="twitter:card"[^>]*\/?>/i)) {
    const twitterTags = `
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">`;
    result = result.replace(/<head>/i, `<head>${twitterTags}`);
  }
  
  // Fix or add canonical URL
  if (!result.match(/<link\s+rel="canonical"[^>]*\/?>/i)) {
    result = result.replace(/<head>/i, `<head>\n  <link rel="canonical" href="${url}">`);
  }
  
  // Fix or add viewport
  if (!result.match(/<meta\s+name="viewport"[^>]*\/?>/i)) {
    result = result.replace(/<head>/i, `<head>\n  <meta name="viewport" content="width=device-width, initial-scale=1">`);
  }
  
  return result;
}

function fixAll() {
  const files = getAllHtmlFiles(CONTENT_DIR);
  let fixed = 0;
  let errors = 0;
  let skipped = 0;
  
  console.log(`Scanning ${files.length} HTML files...`);
  
  for (const filePath of files) {
    try {
      const relPath = getRelativePath(filePath);
      let html = fs.readFileSync(filePath, 'utf8');
      const original = html;
      
      // Get or derive title and description
      let title = '';
      let description = '';
      
      const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
      title = titleMatch ? titleMatch[1].trim() : getDefaultTitle(relPath);
      
      const descMatch = html.match(/<meta\s+name="description"[^>]*content="([^"]*)"[^>]*\/?>/i);
      description = descMatch ? descMatch[1].trim() : getDefaultDescription(relPath);
      
      // Fix title length (max 70 chars)
      if (title.length > 70) {
        title = title.slice(0, 67) + '...';
      }
      
      // Fix description length (max 165 chars)
      if (description.length > 165) {
        description = description.slice(0, 162) + '...';
      }
      
      // Inject missing tags
      html = injectSEOTags(html, title, description, relPath);
      
      if (html !== original) {
        fs.writeFileSync(filePath, html);
        fixed++;
        console.log(`  FIXED: ${relPath}`);
      } else {
        skipped++;
      }
    } catch(e) {
      errors++;
      console.error(`  ERROR: ${filePath}: ${e.message}`);
    }
  }
  
  console.log(`\nDone! ${fixed} fixed, ${skipped} already OK, ${errors} errors`);
  return { fixed, skipped, errors, total: files.length };
}

// Run if direct
if (require.main === module) {
  const result = fixAll();
  
  // Regenerate sitemap after fixes
  try {
    require('/root/automaton/scripts/seo-refresh.js');
  } catch(e) {
    // sitemap generator may not exist as module, that's ok
  }
}

module.exports = { fixAll };
