#!/usr/bin/env node
/**
 * Add Open Graph and Twitter Card meta tags to all HTML pages
 * that don't already have them.
 */
const fs = require('fs');
const path = require('path');

const CONTENT_DIR = '/root/automaton/content';
const SITE_URL = 'https://automation.songheng.vip';
const OG_IMAGE = SITE_URL + '/og-image.png';
const SITE_NAME = 'my-automaton';

// Mapping of URL paths to title/description
function generateMeta(filePath, title, description) {
  const url = SITE_URL + filePath;
  return `
<!-- Open Graph / Social Meta Tags -->
<meta property="og:title" content="${escapeAttr(title)}" />
<meta property="og:description" content="${escapeAttr(description)}" />
<meta property="og:url" content="${url}" />
<meta property="og:image" content="${OG_IMAGE}" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="${SITE_NAME}" />
<meta property="og:locale" content="en_US" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${escapeAttr(title)}" />
<meta name="twitter:description" content="${escapeAttr(description)}" />
<meta name="twitter:image" content="${OG_IMAGE}" />
`;
}

function escapeAttr(s) {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function pathToTitle(p) {
  // Remove extension
  let name = p.replace(/\.html$/, '');
  
  // Remove leading slash
  if (name.startsWith('/')) name = name.slice(1);
  
  // Handle special paths
  if (name === 'index' || name === '') return 'my-automaton — AI Code Review & Text Analysis API | Pay Per Request';
  if (name === 'landing' || name === 'landing-v2') return 'my-automaton — AI-Powered Code Review & Text Analysis API';
  if (name === 'blog/index') return 'Blog — my-automaton | AI Code Review & Developer Tools';
  
  // Extract the last segment
  const segments = name.split('/');
  const last = segments[segments.length - 1];
  
  // Convert kebab-case to Title Case
  const readable = last
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
  
  // Build contextual title
  if (segments[0] === 'tools') {
    return `${readable} — Free Online Developer Tool | my-automaton`;
  } else if (segments[0] === 'blog') {
    return `${readable} — my-automaton Blog`;
  } else if (segments[0] === 'widgets') {
    return `${readable} — Embeddable Widget | my-automaton`;
  } else if (segments[0] === 'docs') {
    return `${readable} — Documentation | my-automaton`;
  } else if (segments[0] === 'catalog') {
    return `${readable} — Service Catalog | my-automaton`;
  } else {
    return `${readable} — my-automaton | AI Code Review & Developer Tools`;
  }
}

function pathToDescription(p) {
  let name = p.replace(/\.html$/, '');
  if (name.startsWith('/')) name = name.slice(1);
  
  if (name === 'index' || name === '') return 'AI-powered code review, security scanning, and text analysis API. Pay per request from 1¢. Free tier available. No signup needed.';
  if (name === 'landing' || name === 'landing-v2') return 'Pay-per-request AI code review, security scanning, and text analysis API. Start from 1¢ per request. Free tier available.';
  if (name === 'blog/index') return 'Explore articles about AI code review, developer tools, and the self-sustaining AI agent economy.';
  
  const segments = name.split('/');
  const last = segments[segments.length - 1];
  const readable = last.split('-').join(' ');
  
  if (segments[0] === 'tools') {
    return `Free online ${readable} tool. No signup required. Fast, secure, and easy to use.`;
  } else if (segments[0] === 'blog') {
    return `Read about ${readable} — insights, tutorials, and guides from my-automaton.`;
  } else {
    return `${readable} — powered by my-automaton. AI code review, security scanning, and developer tools.`;
  }
}

// Find all HTML files
function findHtmlFiles(dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findHtmlFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.html') && !entry.name.includes('.bak') && !entry.name.includes('.backup') && !entry.name.includes('og-template')) {
      results.push(fullPath);
    }
  }
  return results;
}

const files = findHtmlFiles(CONTENT_DIR);
console.log(`Found ${files.length} HTML files to process.`);

let modified = 0;
let skipped = 0;

for (const filePath of files) {
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf-8');
  } catch (e) {
    console.error(`Error reading ${filePath}: ${e.message}`);
    continue;
  }
  
  // Only process files with </head>
  const headCloseIdx = content.indexOf('</head>');
  if (headCloseIdx === -1) {
    console.log(`  SKIP (no </head>): ${filePath}`);
    skipped++;
    continue;
  }
  
  // Check if OG tags already exist (has og:title)
  if (content.includes('og:title')) {
    console.log(`  SKIP (has OG): ${filePath}`);
    skipped++;
    continue;
  }
  
  // Compute relative URL path
  const relPath = '/' + path.relative(CONTENT_DIR, filePath);
  
  // Extract any existing <title> text
  const titleMatch = content.match(/<title>([^<]*)<\/title>/i);
  const existingTitle = titleMatch ? titleMatch[1].trim() : null;
  
  // Extract existing description
  const descMatch = content.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i);
  const existingDesc = descMatch ? descMatch[1].trim() : null;
  
  const title = existingTitle || pathToTitle(relPath);
  const description = existingDesc || pathToDescription(relPath);
  
  const ogTags = generateMeta(relPath, title, description);
  
  // Insert OG tags just before </head>
  const newContent = content.slice(0, headCloseIdx) + ogTags + content.slice(headCloseIdx);
  
  try {
    fs.writeFileSync(filePath, newContent, 'utf-8');
    console.log(`  MODIFIED: ${filePath}`);
    modified++;
  } catch (e) {
    console.error(`Error writing ${filePath}: ${e.message}`);
  }
}

console.log(`\nDone! ${modified} files modified, ${skipped} skipped.`);
