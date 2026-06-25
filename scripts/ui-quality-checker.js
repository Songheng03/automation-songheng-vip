#!/usr/bin/env node
/**
 * UI Quality Checker - Scans all HTML pages for common issues
 * Checks: broken links, missing alt tags, empty content, accessibility issues, design problems
 */

const fs = require('fs');
const path = require('path');

const CONTENT_DIR = '/root/automaton/content';
const RESULTS = [];
let totalScanned = 0;

function scanFile(filePath) {
  const relativePath = path.relative(CONTENT_DIR, filePath);
  const content = fs.readFileSync(filePath, 'utf8');
  const issues = [];

  // 1. Check for broken internal links
  const linkMatches = content.match(/href="\/[^"]*"/g) || [];
  linkMatches.forEach(link => {
    const href = link.match(/href="([^"]*)"/)[1];
    if (href.startsWith('/') && !href.startsWith('//') && !href.startsWith('/api/')) {
      const cleanHref = href.split('?')[0].split('#')[0];
      const targetPath = path.join(CONTENT_DIR, cleanHref);
      if (!fs.existsSync(targetPath) && !fs.existsSync(targetPath + '.html') && !fs.existsSync(path.join(targetPath, 'index.html'))) {
        issues.push({ type: 'broken-link', detail: `Broken link: ${href}`, severity: 'high' });
      }
    }
  });

  // 2. Check for missing alt tags on images
  const imgMatches = content.match(/<img[^>]*>/g) || [];
  imgMatches.forEach(img => {
    if (!img.includes('alt=')) {
      issues.push({ type: 'accessibility', detail: `Image missing alt: ${img.substring(0, 80)}`, severity: 'medium' });
    }
  });

  // 3. Check for empty/too-short pages (skip redirects and tiny utility pages)
  if (content.length < 300 && !content.includes('redirect')) {
    issues.push({ type: 'content', detail: `Page too short (${content.length} bytes)`, severity: 'medium' });
  }

  // 4. Check for missing viewport meta tag (mobile unfriendly)
  if (!content.includes('viewport')) {
    issues.push({ type: 'mobile', detail: 'Missing viewport meta tag', severity: 'high' });
  }

  // 5. Check for missing or empty title
  const titleMatch = content.match(/<title>(.*?)<\/title>/s);
  if (!titleMatch || !titleMatch[1].trim()) {
    issues.push({ type: 'seo', detail: 'Missing or empty <title>', severity: 'high' });
  }

  // 6. Check for old/wrong domain references
  if (content.includes('chaosong.dpdns.org')) {
    issues.push({ type: 'domain', detail: 'Contains old domain chaosong.dpdns.org', severity: 'high' });
  }

  // 7. Check for missing meta description
  if (!content.includes('name="description"') && !content.includes('property="og:description"')) {
    issues.push({ type: 'seo', detail: 'Missing meta description', severity: 'low' });
  }

  // 8. Check for JS errors patterns (undefined function calls, etc)
  if (content.includes('onclick="') && !content.match(/function\s+\w+/)) {
    // Has onclick but no function definitions - might reference external JS
    if (!content.includes('<script src=')) {
      issues.push({ type: 'bug', detail: 'onclick handlers without function definitions or external scripts', severity: 'medium' });
    }
  }

  // 9. Check for console.log in production
  const consoleLogCount = (content.match(/console\.(log|warn|error|debug)\(/g) || []).length;
  if (consoleLogCount > 3) {
    issues.push({ type: 'code-quality', detail: `${consoleLogCount} console.log statements in production`, severity: 'low' });
  }

  // 10. Check for mixed content (http in https page)
  if (content.match(/src="http:\/\//g) || content.match(/href="http:\/\//g)) {
    issues.push({ type: 'security', detail: 'Mixed content: HTTP resources on HTTPS page', severity: 'high' });
  }

  // 11. Check for duplicate IDs
  const idMatches = content.match(/\bid="[^"]*"/g) || [];
  const ids = idMatches.map(m => m.match(/id="([^"]*)"/)[1]);
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dupes.length > 0) {
    issues.push({ type: 'bug', detail: `Duplicate IDs: ${[...new Set(dupes)].join(', ')}`, severity: 'medium' });
  }

  // 12. Check for TODO/FIXME/HACK comments
  const todos = (content.match(/<!--.*?(TODO|FIXME|HACK|XXX).*?-->/gi) || []);
  if (todos.length > 0) {
    issues.push({ type: 'code-quality', detail: `${todos.length} TODO/FIXME comments`, severity: 'low' });
  }

  return { file: relativePath, issues, size: content.length };
}

function scanDirectory(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      scanDirectory(filePath);
    } else if (file.endsWith('.html')) {
      totalScanned++;
      const result = scanFile(filePath);
      RESULTS.push(result);
    }
  });
}

console.log('🔍 Scanning', CONTENT_DIR, 'for UI quality issues...\n');
scanDirectory(CONTENT_DIR);

// Calculate stats
const filesWithIssues = RESULTS.filter(r => r.issues.length > 0);
const totalIssues = RESULTS.reduce((sum, r) => sum + r.issues.length, 0);
const cleanFiles = totalScanned - filesWithIssues.length;

console.log(`📊 Scanned ${totalScanned} HTML files`);
console.log(`   ✅ ${cleanFiles} clean | ⚠️  ${filesWithIssues.length} with issues`);
console.log(`   🔴 ${totalIssues} total issues found\n`);

// Group by issue type
const byType = {};
RESULTS.forEach(result => {
  result.issues.forEach(issue => {
    if (!byType[issue.type]) byType[issue.type] = [];
    byType[issue.type].push({ file: result.file, detail: issue.detail, severity: issue.severity });
  });
});

// Print summary by type
const typeOrder = ['broken-link', 'bug', 'security', 'domain', 'mobile', 'accessibility', 'seo', 'content', 'code-quality'];
typeOrder.forEach(type => {
  if (!byType[type]) return;
  const icon = { 'broken-link': '🔗', 'bug': '🐛', 'security': '🔒', 'domain': '🌐', 'mobile': '📱', 'accessibility': '♿', 'seo': '🔍', 'content': '📝', 'code-quality': '🧹' }[type] || '❓';
  console.log(`\n${icon} ${type.toUpperCase()} (${byType[type].length} issues)`);
  console.log('-'.repeat(50));
  
  byType[type].slice(0, 15).forEach(item => {
    const sev = item.severity === 'high' ? '🔴' : item.severity === 'medium' ? '🟡' : '⚪';
    console.log(`  ${sev} ${item.file}: ${item.detail}`);
  });
  
  if (byType[type].length > 15) {
    console.log(`  ... and ${byType[type].length - 15} more`);
  }
});

// Top offenders (files with most issues)
console.log(`\n\n📋 TOP 10 WORST FILES:`);
console.log('-'.repeat(50));
RESULTS.sort((a, b) => b.issues.length - a.issues.length).slice(0, 10).forEach(r => {
  if (r.issues.length > 0) {
    console.log(`  ${r.file}: ${r.issues.length} issues`);
  }
});

// Save detailed report
const reportPath = '/root/automaton/data/ui-quality-report.json';
fs.writeFileSync(reportPath, JSON.stringify({
  timestamp: new Date().toISOString(),
  totalScanned,
  filesWithIssues: filesWithIssues.length,
  totalIssues,
  byType: Object.fromEntries(Object.entries(byType).map(([k, v]) => [k, v.length])),
  details: RESULTS.filter(r => r.issues.length > 0)
}, null, 2));

console.log(`\n✅ Detailed report saved to ${reportPath}`);
