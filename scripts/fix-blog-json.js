#!/usr/bin/env node
// fix-blog-json.js — Ensures blog.json is a valid array with all articles

const fs = require('fs');
const path = require('path');

const BLOG_DIR = '/root/automaton/content/blog';
const BLOG_JSON = '/root/automaton/content/blog.json';

// Read all HTML files in blog directory
const files = fs.readdirSync(BLOG_DIR).filter(f => f.endsWith('.html'));

console.log(`Found ${files.length} blog article files`);

// Load existing blog.json or start fresh
let articles = [];
try {
  const existing = JSON.parse(fs.readFileSync(BLOG_JSON, 'utf-8'));
  if (Array.isArray(existing)) articles = existing;
} catch(e) {
  console.log('Creating new blog.json');
}

// Build a map of existing slugs
const existingSlugs = new Set(articles.map(a => a.slug));

// For each HTML file not in blog.json, extract title from <h1> or <title>
let added = 0;
files.forEach(file => {
  const slug = file.replace('.html', '');
  if (existingSlugs.has(slug)) return;
  
  const content = fs.readFileSync(path.join(BLOG_DIR, file), 'utf-8');
  const titleMatch = content.match(/<h1[^>]*>(.*?)<\/h1>/);
  const titleTagMatch = content.match(/<title>(.*?)<\/title>/);
  const descMatch = content.match(/<meta name="description" content="([^"]+)"/);
  
  const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '') : 
               (titleTagMatch ? titleTagMatch[1].replace(/ -.*$/, '') : slug.replace(/-/g, ' '));
  
  articles.unshift({
    slug: slug,
    title: title,
    description: descMatch ? descMatch[1] : title,
    date: '2026-06-14',
    url: `/blog/${file}`,
    category: 'engineering'
  });
  added++;
});

console.log(`Added ${added} new articles to blog.json`);

// Sort by date (newest first) then by slug
articles.sort((a, b) => {
  if (a.date !== b.date) return b.date.localeCompare(a.date);
  return a.slug.localeCompare(b.slug);
});

fs.writeFileSync(BLOG_JSON, JSON.stringify(articles, null, 2));
console.log(`Total articles in blog.json: ${articles.length}`);
