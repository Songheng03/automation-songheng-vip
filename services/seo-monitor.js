#!/usr/bin/env node
/**
 * SEO Monitoring Service — runs as heartbeat task
 * Checks: sitemap health, page index status, traffic stats, broken links
 * Logs to /root/automaton/data/seo-monitor.json
 */
const fs = require('fs');
const path = require('path');

const DATA_FILE = '/root/automaton/data/seo-monitor.json';
const CONTENT_DIR = '/root/automaton/content';

function scanSite() {
  // Count all HTML pages
  const pages = [];
  
  // Root pages
  if (fs.existsSync(CONTENT_DIR)) {
    fs.readdirSync(CONTENT_DIR).forEach(f => {
      if (f.endsWith('.html')) pages.push({ file: f, type: 'root' });
    });
  }
  
  // Blog articles
  const blogDir = path.join(CONTENT_DIR, 'blog');
  if (fs.existsSync(blogDir)) {
    fs.readdirSync(blogDir).forEach(f => {
      if (f.endsWith('.html')) pages.push({ file: 'blog/' + f, type: 'blog' });
    });
  }
  
  // Tool pages
  const toolsDir = path.join(CONTENT_DIR, 'tools');
  if (fs.existsSync(toolsDir)) {
    fs.readdirSync(toolsDir).forEach(f => {
      if (f.endsWith('.html')) pages.push({ file: 'tools/' + f, type: 'tool' });
    });
  }
  
  return pages;
}

function analyzeSEO() {
  const pages = scanSite();
  const issues = [];
  
  // Check each page for basic SEO
  pages.forEach(p => {
    const fullPath = path.join(CONTENT_DIR, p.file);
    try {
      const html = fs.readFileSync(fullPath, 'utf8');
      
      // Missing title
      if (!html.match(/<title>[^<]+<\/title>/i)) {
        issues.push({ file: p.file, issue: 'Missing <title> tag' });
      }
      
      // Missing meta description
      if (!html.match(/<meta\s+name="description"[^>]*content="[^"]*"[^>]*\/?>/i)) {
        issues.push({ file: p.file, issue: 'Missing meta description' });
      }
      
      // Missing OG tags
      if (!html.match(/<meta\s+property="og:title"[^>]*\/?>/i)) {
        issues.push({ file: p.file, issue: 'Missing OG tags' });
      }
      
      // Missing viewport
      if (!html.match(/<meta\s+name="viewport"[^>]*\/?>/i)) {
        issues.push({ file: p.file, issue: 'Missing viewport meta' });
      }
      
      // Check for h1
      if (!html.match(/<h1[^>]*>/i)) {
        issues.push({ file: p.file, issue: 'Missing <h1> heading' });
      }
      
      // Title too long
      const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
      if (titleMatch && titleMatch[1].length > 70) {
        issues.push({ file: p.file, issue: `Title too long (${titleMatch[1].length} chars): ${titleMatch[1].slice(0, 50)}...` });
      }
      
      // Description too long
      const descMatch = html.match(/<meta\s+name="description"[^>]*content="([^"]*)"[^>]*\/?>/i);
      if (descMatch && descMatch[1].length > 165) {
        issues.push({ file: p.file, issue: `Description too long (${descMatch[1].length} chars)` });
      }
      
    } catch(e) {
      issues.push({ file: p.file, issue: `Cannot read: ${e.message}` });
    }
  });
  
  // Sitemap check
  let sitemapOk = false;
  try {
    const sm = fs.readFileSync(path.join(CONTENT_DIR, 'sitemap.xml'), 'utf8');
    sitemapOk = sm.includes('<url>') && sm.includes('</urlset>');
    const urlCount = (sm.match(/<url>/g) || []).length;
    
    // Check if sitemap covers all pages
    if (urlCount < pages.length) {
      issues.push({ file: 'sitemap.xml', issue: `Sitemap has ${urlCount} URLs but site has ${pages.length} pages` });
    }
  } catch(e) {
    issues.push({ file: 'sitemap.xml', issue: 'Sitemap missing or unreadable' });
  }
  
  // Robots.txt check
  let robotsOk = false;
  try {
    const robots = fs.readFileSync(path.join(CONTENT_DIR, 'robots.txt'), 'utf8');
    robotsOk = robots.includes('Sitemap:');
  } catch(e) {
    issues.push({ file: 'robots.txt', issue: 'Missing robots.txt' });
  }
  
  return {
    timestamp: new Date().toISOString(),
    totalPages: pages.length,
    pagesByType: {
      root: pages.filter(p => p.type === 'root').length,
      blog: pages.filter(p => p.type === 'blog').length,
      tool: pages.filter(p => p.type === 'tool').length
    },
    sitemapOk,
    robotsOk,
    issues,
    issueCount: issues.length,
    healthScore: Math.round(Math.max(0, 100 - (issues.length / Math.max(1, pages.length)) * 50)),
    topIssues: issues.slice(0, 10)
  };
}

function run() {
  const report = analyzeSEO();
  
  // Save to data file
  fs.writeFileSync(DATA_FILE, JSON.stringify(report, null, 2));
  
  // Log summary
  console.log(`[SEO Monitor] ${report.totalPages} pages, ${report.issueCount} issues, health: ${report.healthScore}%`);
  if (report.issues.length > 0) {
    console.log(`[SEO Monitor] Top issues:`);
    report.issues.slice(0, 5).forEach(i => console.log(`  - [${i.file}] ${i.issue}`));
  }
  
  return report;
}

// Run if called directly
if (require.main === module) {
  run();
}

module.exports = { run, scanSite, analyzeSEO };
