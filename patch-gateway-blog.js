#!/usr/bin/env node
/**
 * Patch gateway.cjs to add /blog route serving from blog/ directory.
 * Run this script, then restart the server.
 */
const fs = require('fs');
const path = require('path');

const GATEWAY = '/root/automaton/gateway.cjs';
let code = fs.readFileSync(GATEWAY, 'utf-8');

// 1. Add BLOG_DIR constant after CONTENT constant
const blogDirLine = "const BLOG_DIR = '/root/automaton/blog';";
if (!code.includes('BLOG_DIR')) {
  // Find the CONTENT line and add BLOG_DIR after it
  code = code.replace(
    "const CONTENT = '/root/automaton/content';",
    "const CONTENT = '/root/automaton/content';\n" + blogDirLine
  );
  console.log('Added BLOG_DIR constant');
} else {
  console.log('BLOG_DIR already exists');
}

// 2. Add handleBlog function before the // ── HTTP Server ── section
const blogHandler = `
// Blog handler — serves static HTML from blog/ directory
async function handleBlog(req, res) {
  let p = url.parse(req.url).pathname;
  // Strip /blog prefix
  p = p.replace(/^\\/blog(?:\\/|$)/, '/');
  if (p === '/' || p === '') p = '/index.html';
  const ext = path.extname(p);
  let filePath;
  if (!ext) {
    filePath = path.join(BLOG_DIR, p + '.html');
    if (!fs.existsSync(filePath)) {
      filePath = path.join(BLOG_DIR, p);
    }
  } else {
    filePath = path.join(BLOG_DIR, p);
  }
  // Security: prevent directory traversal
  if (!filePath.startsWith(BLOG_DIR)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }
  try {
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      res.writeHead(404); res.end('Not found'); return;
    }
    const content = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'public, max-age=3600' });
    res.end(content);
  } catch (e) {
    res.writeHead(500); res.end('Error');
  }
}

`;

if (!code.includes('handleBlog')) {
  // Insert before HTTP Server section
  code = code.replace(
    '// ── HTTP Server ───────────────────────────────────────────',
    blogHandler + '// ── HTTP Server ───────────────────────────────────────────'
  );
  console.log('Added handleBlog function');
} else {
  console.log('handleBlog already exists');
}

// 3. Add route matching for /blog in the server handler
const blogRoute = `    if (p === "/blog" || p.startsWith("/blog/")) { await handleBlog(req, res); return; }`;

if (!code.includes('p.startsWith("/blog/")')) {
  // Insert the blog route before the default static file fallback
  code = code.replace(
    '    // Default: static files',
    blogRoute + '\n    // Default: static files'
  );
  console.log('Added blog route');
} else {
  console.log('Blog route already exists');
}

fs.writeFileSync(GATEWAY, code);
console.log('Gateway patched successfully!');
