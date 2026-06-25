#!/usr/bin/env node
const fs=require('fs'),path=require('path');
const BASE='https://automation.songheng.vip';
const CONTENT='/root/automaton/content';
const BLOG_DIR=path.join(CONTENT,'blog');

// Blog articles
const articles=fs.readdirSync(BLOG_DIR).filter(f=>f.endsWith('.html'));
// Static pages
const pages=['/','/blog','/upgrade','/dashboard','/api-docs','/api-playground','/tools','/about','/github','/payment-success'];
// Tools
const tools=['/tools/regex-tester','/tools/json-formatter','/tools/http-status-codes','/tools/json-to-csv','/tools/json-to-typescript','/tools/text-utility','/tools/badge-generator','/tools/seo-content-brief','/tools/sitemap-generator','/tools/seo-audit','/tools/free-ai-code-review','/tools/free-ai-security-scanner','/tools/free-ai-text-summarizer','/tools/code-quality-checker'];

let xml='<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
xml+=`  <url><loc>${BASE}/</loc><priority>1.0</priority><changefreq>daily</changefreq></url>\n`;
for(const p of pages){
  const pr=p==='/'?'1.0':p==='/blog'?'0.9':p==='/upgrade'?'0.8':'0.7';
  xml+=`  <url><loc>${BASE}${p}</loc><priority>${pr}</priority></url>\n`;
}
for(const t of tools)xml+=`  <url><loc>${BASE}${t}</loc><priority>0.6</priority></url>\n`;
for(const a of articles){
  const slug=a.replace('.html','');
  xml+=`  <url><loc>${BASE}/blog/${slug}</loc><priority>0.5</priority></url>\n`;
}
xml+='</urlset>\n';
fs.writeFileSync(path.join(CONTENT,'sitemap.xml'),xml);
console.log('Sitemap: '+(pages.length+tools.length+articles.length)+' URLs written');

// RSS feed
const blog=JSON.parse(fs.readFileSync(path.join(CONTENT,'blog.json'),'utf8'));
let rss='<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel>\n';
rss+=`<title>my-automaton Blog</title><link>${BASE}/blog</link><description>AI code review, security, text analysis services</description>\n`;
const items=blog.slice(0,20);
for(const item of items){
  rss+=`<item><title><![CDATA[${item.title}]]></title><link>${BASE}${item.url}</link>`;
  rss+=`<description><![CDATA[${item.summary}]]></description>`;
  rss+=`<pubDate>${new Date(item.date).toUTCString()}</pubDate><guid>${BASE}${item.url}</guid></item>\n`;
}
rss+='</channel></rss>\n';
fs.writeFileSync(path.join(CONTENT,'rss.xml'),rss);
console.log('RSS: '+items.length+' items');

// Also update blog.html by scanning
const articles2=fs.readdirSync(BLOG_DIR).filter(f=>f.endsWith('.html'));
const blogData=articles2.map(f=>{
  const html=fs.readFileSync(path.join(BLOG_DIR,f),'utf8');
  const title=(html.match(/<title>([^<]+)<\/title>/)||['','Article'])[1];
  const desc=(html.match(/<meta name="description" content="([^"]+)"/)||['',''])[1];
  const dateMatch=html.match(/Published:\s*(\w+\s+\d+,\s+\d{4})/);
  const date=dateMatch?new Date(dateMatch[1]).toISOString().slice(0,10):'2025-06-14';
  return{title,url:'/blog/'+f.replace('.html',''),date,summary:desc||title,tags:[]};
}).sort((a,b)=>b.date.localeCompare(a.date));
fs.writeFileSync(path.join(CONTENT,'blog.json'),JSON.stringify(blogData,null,2));
console.log('blog.json: '+blogData.length+' articles scanned from disk');
