#!/usr/bin/env node
/**
 * SEO Bulk Optimizer — Scans + fixes all HTML pages in content/
 * Improves: meta description, title, OG tags, schema.org, h1 presence
 * 
 * Usage: node /root/automaton/services/seo-bulk-optimizer.mjs [--dry-run] [--fix]
 */

import fs from 'fs';
import path from 'path';

const CONTENT_DIR = '/root/automaton/content';
const REPORT_FILE = '/root/automaton/data/seo-audit-report.json';

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const APPLY_FIX = args.includes('--fix');

if (!APPLY_FIX && !DRY_RUN) {
  console.log('Usage: node seo-bulk-optimizer.mjs [--dry-run] [--fix]');
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

function generateMetaDescription(filePath, content) {
  const bodyMatch = content.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (!bodyMatch) return 'AI-powered developer tools and API services. Text analysis, code review, security scanning, and more.';
  const text = bodyMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const sentences = text.match(/[^.!?]{30,}[.!?]/g);
  if (sentences) {
    for (const s of sentences) { const clean = s.trim(); if (clean.length > 50 && clean.length < 200) return clean; }
  }
  return 'AI-powered developer tools and API services. Text analysis, code review, security scanning, summarization, and more for developers.';
}

function extractTitle(content) {
  const match = content.match(/<title>([^<]*)<\/title>/i);
  return match ? match[1] : null;
}

function extractMetaDescription(content) {
  const match = content.match(/<meta\s+name=["']description["'][^>]*content=["']([^"']*)["']/i);
  return match ? match[1] : null;
}

function extractOGTags(content) {
  const tags = {};
  const ogRe = /<meta\s+property=["']og:([^"']+)["'][^>]*content=["']([^"']*)["']/gi;
  let m;
  while ((m = ogRe.exec(content)) !== null) tags[m[1]] = m[2];
  return tags;
}

function extractSchemaOrg(content) {
  const match = content.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
  if (!match) return null;
  try { return JSON.parse(match[1]); } catch(e) { return null; }
}

function containsH1(content) { return /<h1[^>]*>/i.test(content); }
function containsCanonical(content) { return /<link[^>]*rel=["']canonical["']/i.test(content); }

function analyzePage(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const relPath = path.relative(CONTENT_DIR, filePath);
  const issues = [];
  
  const title = extractTitle(content);
  if (!title) issues.push('MISSING_TITLE');
  else if (title.length < 10 || title.length > 70) issues.push('TITLE_LENGTH:' + title.length);
  
  const metaDesc = extractMetaDescription(content);
  if (!metaDesc) issues.push('MISSING_META_DESCRIPTION');
  else if (metaDesc.length < 50 || metaDesc.length > 160) issues.push('META_DESC_LENGTH:' + metaDesc.length);
  
  const ogTags = extractOGTags(content);
  if (!ogTags.title) issues.push('MISSING_OG_TITLE');
  if (!ogTags.description) issues.push('MISSING_OG_DESCRIPTION');
  if (!ogTags.url) issues.push('MISSING_OG_URL');
  
  if (!containsH1(content)) issues.push('MISSING_H1');
  if (!containsCanonical(content)) issues.push('MISSING_CANONICAL');
  
  const schema = extractSchemaOrg(content);
  if (!schema) issues.push('MISSING_SCHEMA_ORG');
  
  const pageName = filePath.replace(CONTENT_DIR, '').replace(/^\//, '').replace(/\.html$/, '').replace(/blog\//, '').replace(/[-_]/g, ' ');
  const niceName = pageName.charAt(0).toUpperCase() + pageName.slice(1);
  const pageUrl = BASE_URL + '/' + relPath;
  const autoDesc = generateMetaDescription(filePath, content);
  
  return {
    file: filePath, relPath, name: niceName, url: pageUrl, issues,
    hasTitle: !!title, hasMetaDesc: !!metaDesc,
    hasOG: Object.keys(ogTags).length, hasH1: containsH1(content),
    hasCanonical: containsCanonical(content), hasSchema: !!schema,
    title, metaDesc, ogTags, autoDesc: autoDesc.slice(0, 200)
  };
}

function fixPage(report) {
  if (report.issues.length === 0) return false;
  let content = fs.readFileSync(report.file, 'utf-8');
  let changed = false;
  const headClose = '</head>';
  const idx = headClose;

  // 1. Fix missing title
  if (!report.hasTitle) {
    const title = report.name + ' — my-automaton AI Developer Tools & API Services';
    content = content.replace('</head>', '  <title>' + title + '</title>\n</head>');
    changed = true;
  }

  // 2. Fix missing meta description
  if (!report.hasMetaDesc) {
    const desc = (report.autoDesc || 'AI-powered ' + report.name.toLowerCase() + ' tools and services. Code review, security scanning, text analysis, and more.').slice(0, 160);
    content = content.replace('</head>', '  <meta name="description" content="' + desc.replace(/"/g, '&quot;') + '">\n</head>');
    changed = true;
  }

  // 3. Fix missing OG tags
  if (!report.ogTags.description && report.autoDesc) {
    const desc = report.autoDesc.slice(0, 160);
    content = content.replace('</head>', '  <meta property="og:description" content="' + desc.replace(/"/g, '&quot;') + '">\n</head>');
    changed = true;
  }
  if (!report.ogTags.title) {
    const title = report.title || (report.name + ' — my-automaton AI Tools');
    content = content.replace('</head>', '  <meta property="og:title" content="' + title.replace(/"/g, '&quot;') + '">\n</head>');
    changed = true;
  }
  if (!report.ogTags.url) {
    content = content.replace('</head>', '  <meta property="og:url" content="' + report.url + '">\n</head>');
    changed = true;
  }
  if (!report.ogTags.type) {
    content = content.replace('</head>', '  <meta property="og:type" content="website">\n</head>');
    changed = true;
  }
  if (!report.ogTags.image) {
    content = content.replace('</head>', '  <meta property="og:image" content="' + BASE_URL + '/og-image.svg">\n</head>');
    changed = true;
  }

  // 4. Add canonical
  if (!report.hasCanonical) {
    content = content.replace('</head>', '  <link rel="canonical" href="' + report.url + '">\n</head>');
    changed = true;
  }

  if (changed) {
    const backup = report.file + '.bak';
    if (!fs.existsSync(backup)) fs.copyFileSync(report.file, backup);
    fs.writeFileSync(report.file, content, 'utf-8');
    return true;
  }
  return false;
}

// Main
const files = getAllHTMLFiles(CONTENT_DIR);
console.log('\n\uD83D\uDD0D SEO Bulk Optimizer');
console.log('   Mode: ' + (DRY_RUN ? '\uD83D\uDD0E DRY RUN (no changes)' : APPLY_FIX ? '\uD83D\uDD27 FIX MODE' : '?'));
console.log('   Scanning ' + files.length + ' HTML files...\n');

const reports = [];
let fixed = 0;
let totalIssues = 0;

for (const file of files) {
  const report = analyzePage(file);
  reports.push(report);
  totalIssues += report.issues.length;
  
  if (report.issues.length > 0) {
    console.log('\u26A0\uFE0F  ' + report.relPath + ' (' + report.issues.length + ' issues)');
    report.issues.forEach(i => console.log('     - ' + i));
    
    if (APPLY_FIX) {
      const wasFixed = fixPage(report);
      if (wasFixed) { fixed++; console.log('     \u2705 FIXED'); }
    }
  }
}

const cleanPages = reports.filter(r => r.issues.length === 0).length;
const hasTitleCount = reports.filter(r => r.hasTitle).length;
const hasMetaCount = reports.filter(r => r.hasMetaDesc).length;
const hasOGCount = reports.filter(r => r.hasOG >= 3).length;
const hasH1Count = reports.filter(r => r.hasH1).length;
const hasCanonCount = reports.filter(r => r.hasCanonical).length;
const hasSchemaCount = reports.filter(r => r.hasSchema).length;

console.log('\n\uD83D\uDCCA AUDIT SUMMARY');
console.log('   Total pages:     ' + files.length);
console.log('   Clean pages:     ' + cleanPages + ' (' + (cleanPages/files.length*100).toFixed(0) + '%)');
console.log('   Pages w/issues:  ' + (files.length - cleanPages));
console.log('   Total issues:    ' + totalIssues);
console.log('   Pages fixed:     ' + fixed);
console.log('\n\uD83D\uDCC8 COVERAGE');
console.log('   <title>:         ' + hasTitleCount + '/' + files.length + ' (' + (hasTitleCount/files.length*100).toFixed(0) + '%)');
console.log('   <meta desc>:     ' + hasMetaCount + '/' + files.length + ' (' + (hasMetaCount/files.length*100).toFixed(0) + '%)');
console.log('   OG tags (3+):    ' + hasOGCount + '/' + files.length + ' (' + (hasOGCount/files.length*100).toFixed(0) + '%)');
console.log('   <h1>:            ' + hasH1Count + '/' + files.length + ' (' + (hasH1Count/files.length*100).toFixed(0) + '%)');
console.log('   <canonical>:     ' + hasCanonCount + '/' + files.length + ' (' + (hasCanonCount/files.length*100).toFixed(0) + '%)');
console.log('   Schema.org:      ' + hasSchemaCount + '/' + files.length + ' (' + (hasSchemaCount/files.length*100).toFixed(0) + '%)');

const reportData = {
  scanned: new Date().toISOString(), totalFiles: files.length, cleanPages,
  pagesWithIssues: files.length - cleanPages, totalIssues, fixed,
  coverage: { title: hasTitleCount, metaDesc: hasMetaCount, og: hasOGCount, h1: hasH1Count, canonical: hasCanonCount, schema: hasSchemaCount },
  pagesWithIssues: reports.filter(r => r.issues.length > 0).map(r => ({
    file: r.relPath, issues: r.issues,
    title: r.title || 'MISSING',
    metaDesc: (r.metaDesc || 'MISSING').slice(0, 80)
  }))
};

fs.mkdirSync(path.dirname(REPORT_FILE), { recursive: true });
fs.writeFileSync(REPORT_FILE, JSON.stringify(reportData, null, 2));
console.log('\n\uD83D\uDCC4 Report saved: ' + REPORT_FILE);
