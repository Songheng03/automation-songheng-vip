#!/usr/bin/env node
// fix-content-paths.js — Find all content files and ensure gateway can serve them
const fs = require('fs');
const path = require('path');

const C = '/root/automaton/content';
const OLD = '/root/services/content';
const BLOG = path.join(C, 'blog');
const GATEWAY = '/root/automaton/gateway.js';

console.log('=== CONTENT PATH FIXER ===\n');

// 1. Check what exists in current content dir
console.log('--- Content dir:', C);
let inContent = [];
try { inContent = fs.readdirSync(C).filter(f => f.endsWith('.html')); } catch(e) { console.log('  NOT FOUND'); }
console.log(`  ${inContent.length} HTML files`);

// 2. Check old content dir
console.log('\n--- Old content dir:', OLD);
let inOld = [];
try { inOld = fs.readdirSync(OLD).filter(f => f.endsWith('.html')); } catch(e) { console.log('  NOT FOUND'); }
console.log(`  ${inOld.length} HTML files`);

// 3. Check blog
console.log('\n--- Blog dir:', BLOG);
let inBlog = [];
try { inBlog = fs.readdirSync(BLOG).filter(f => f.endsWith('.html')); } catch(e) { console.log('  NOT FOUND'); }
console.log(`  ${inBlog.length} blog articles`);

// 4. If old content has files and new doesn't, copy them
if (inOld.length > inContent.length && fs.existsSync(OLD)) {
  console.log('\n--- Copying from OLD to NEW...');
  try {
    // Ensure blog dir exists
    if (!fs.existsSync(BLOG)) fs.mkdirSync(BLOG, {recursive: true});
    
    fs.readdirSync(OLD).forEach(f => {
      const src = path.join(OLD, f);
      const dst = path.join(C, f);
      if (f.endsWith('.html') && !fs.existsSync(dst)) {
        fs.copyFileSync(src, dst);
        console.log(`  Copied: ${f}`);
      }
    });
    
    // Also check old blog dir
    const oldBlog = path.join(OLD, 'blog');
    if (fs.existsSync(oldBlog)) {
      fs.readdirSync(oldBlog).filter(f => f.endsWith('.html')).forEach(f => {
        const dst = path.join(BLOG, f);
        if (!fs.existsSync(dst)) {
          fs.copyFileSync(path.join(oldBlog, f), dst);
          console.log(`  Copied blog: ${f}`);
        }
      });
    }
    
    // Re-scan
    inContent = fs.readdirSync(C).filter(f => f.endsWith('.html'));
    inBlog = fs.readdirSync(BLOG).filter(f => f.endsWith('.html'));
    console.log(`\n  Now: ${inContent.length} content, ${inBlog.length} blog`);
  } catch(e) { console.log(`  ERROR: ${e.message}`); }
}

// 5. Generate a route-map.txt for reference
const routes = [
  '/ → /index.html',
  '/health → API',
  '/api/catalog → API',
  '/robots.txt',
  '/sitemap.xml',
  '/googlea8c3f7b2e1d4f5a6.html',
  '/BingSiteAuth.xml',
  '/a8c3f7b2e1d4f5a6.txt',
];

inContent.forEach(f => {
  const name = f === 'index.html' ? '/' : '/' + f;
  routes.push(name);
});
inBlog.forEach(f => routes.push(`/blog/${f}`));

console.log('\n--- Route Map ---');
routes.forEach(r => console.log(`  ${r}`));

// 6. Write route map
fs.writeFileSync(path.join(C, 'route-map.txt'), routes.join('\n'));
console.log('\n=== DONE ===');
console.log(`Total routes: ${routes.length}`);
