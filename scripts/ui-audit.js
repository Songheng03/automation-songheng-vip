#!/usr/bin/env node
// UI Quality Audit - Check all HTML pages for common issues
const fs = require('fs');
const path = require('path');

const CONTENT_DIR = '/root/automaton/content';
const results = {
  total: 0,
  checked: 0,
  issues: [],
  critical: [],
  warnings: []
};

function checkFile(filePath) {
  const relPath = path.relative(CONTENT_DIR, filePath);
  const content = fs.readFileSync(filePath, 'utf8');
  const issues = [];

  // Check for common issues
  const checks = [
    {
      name: 'Missing DOCTYPE',
      test: !content.includes('<!DOCTYPE html>'),
      severity: 'critical'
    },
    {
      name: 'Missing viewport meta',
      test: !content.includes('viewport'),
      severity: 'critical'
    },
    {
      name: 'Missing title',
      test: !content.match(/<title>[^<]+<\/title>/i),
      severity: 'critical'
    },
    {
      name: 'Broken internal links',
      test: content.match(/href="(?!http|#|mailto|tel|data:|javascript:)[^"]*"/g),
      check: (matches) => {
        if (!matches) return false;
        return matches.some(link => {
          const href = link.match(/href="([^"]*)"/)[1];
          if (href.startsWith('/') || href === '') return false;
          // Check if file exists relative to current file
          const linkPath = path.join(path.dirname(filePath), href);
          return !fs.existsSync(linkPath) && !fs.existsSync(linkPath + '.html');
        });
      },
      severity: 'critical'
    },
    {
      name: 'Empty alt attributes',
      test: content.match(/<img[^>]*alt=""[^>]*>/g),
      severity: 'warning'
    },
    {
      name: 'Missing alt on images',
      test: content.match(/<img(?![^>]*alt=)[^>]*>/g),
      severity: 'warning'
    },
    {
      name: 'Console.log statements',
      test: content.includes('console.log'),
      severity: 'warning'
    },
    {
      name: 'TODO comments',
      test: content.match(/<!--\s*TODO/i) || content.match(/\/\/\s*TODO/i),
      severity: 'info'
    }
  ];

  checks.forEach(check => {
    let hasIssue = false;
    if (typeof check.test === 'boolean') {
      hasIssue = check.test;
    } else if (check.check) {
      hasIssue = check.check(check.test);
    } else if (check.test) {
      hasIssue = true;
    }

    if (hasIssue) {
      const issue = { file: relPath, issue: check.name, severity: check.severity };
      issues.push(issue);
      if (check.severity === 'critical') results.critical.push(issue);
      else if (check.severity === 'warning') results.warnings.push(issue);
    }
  });

  return issues;
}

function scanDir(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      scanDir(filePath);
    } else if (file.endsWith('.html')) {
      results.total++;
      const issues = checkFile(filePath);
      if (issues.length > 0) {
        results.issues.push(...issues);
      }
      results.checked++;
      if (results.checked % 50 === 0) {
        console.log(`Checked ${results.checked} files...`);
      }
    }
  });
}

console.log('Starting UI audit...\n');
scanDir(CONTENT_DIR);

console.log(`\n=== AUDIT COMPLETE ===`);
console.log(`Total HTML files: ${results.total}`);
console.log(`Files checked: ${results.checked}`);
console.log(`Critical issues: ${results.critical.length}`);
console.log(`Warnings: ${results.warnings.length}`);

if (results.critical.length > 0) {
  console.log('\n=== CRITICAL ISSUES ===');
  results.critical.slice(0, 20).forEach(i => {
    console.log(`  [${i.severity}] ${i.file}: ${i.issue}`);
  });
  if (results.critical.length > 20) {
    console.log(`  ... and ${results.critical.length - 20} more`);
  }
}

if (results.warnings.length > 0) {
  console.log('\n=== WARNINGS ===');
  results.warnings.slice(0, 10).forEach(i => {
    console.log(`  [${i.severity}] ${i.file}: ${i.issue}`);
  });
  if (results.warnings.length > 10) {
    console.log(`  ... and ${results.warnings.length - 10} more`);
  }
}

// Save full report
const report = {
  timestamp: new Date().toISOString(),
  summary: {
    total: results.total,
    checked: results.checked,
    critical: results.critical.length,
    warnings: results.warnings.length
  },
  critical: results.critical,
  warnings: results.warnings
};

fs.writeFileSync('/root/automaton/content/ui-audit-report.json', JSON.stringify(report, null, 2));
console.log('\nFull report saved to /content/ui-audit-report.json');
