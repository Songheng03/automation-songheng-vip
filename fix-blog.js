#!/usr/bin/env node
/**
 * fix-blog.js — Quick patch: adds /blog redirect before main routing
 * Run: node fix-blog.js
 * This replaces the blog route handling with a simple redirect to /blog.html
 */

const fs = require('fs');
const path = require('path');

const gatewayPath = '/root/automaton/gateway.cjs';
let code = fs.readFileSync(gatewayPath, 'utf-8');

// Find the section right after CORS and OPTIONS handling
// The current code has:
//
//   res.setHeader(...);
//   if (method === 'OPTIONS') { ... }
//
//   try {
//     // === BADGE SERVICE ===
//     if (pathname === '/api/badge' ...)
//
// We need to insert /blog redirect right after the try {

// Find the try { line with the badge service comment
const oldBlogSection = `  try {
    // === BADGE SERVICE ===`;

const newBlogSection = `  try {
    // === BLOG REDIRECT (before badge check) ===
    if (pathname === '/blog' || pathname === '/blog/' || pathname === '/blog') {
      res.writeHead(302, { Location: '/blog.html' });
      res.end();
      return;
    }

    // === BADGE SERVICE ===`;

if (code.includes(oldBlogSection)) {
  code = code.replace(oldBlogSection, newBlogSection);
  fs.writeFileSync(gatewayPath, code);
  console.log('✅ /blog redirect added to gateway.cjs');
} else {
  console.log('❌ Could not find insertion point in gateway.cjs');
  process.exit(1);
}
