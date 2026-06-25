#!/usr/bin/env node
// traffic-driver.js — Actively drives traffic to the gateway
// Refreshes sitemap, pings search engines, and logs results
const F=require('fs'),P=require('path');
const CT='/root/automaton/content',D='/root/automaton/data';
const B='https://automation.songheng.vip';
const W='0x76eADdEBFfb6a61DD071f97F4508467fc55dd113';
F.mkdirSync(D,{recursive:true});

// Collect all URLs
const urls=[];
// Base pages
['/','/blog','/tools','/upgrade','/dashboard','/api-docs','/api-playground','/backlinks','/ai-code-reviewer'].forEach(u=>urls.push(B+u));
// Blog articles
const blogDir=P.join(CT,'blog');
if(F.existsSync(blogDir)){
  F.readdirSync(blogDir).filter(f=>f.endsWith('.html')).forEach(f=>{
    const slug=f.replace('.html','');
    urls.push(B+'/blog/'+slug);
  });
}
// Tool pages
const toolsDir=P.join(CT,'tools');
if(F.existsSync(toolsDir)){
  F.readdirSync(toolsDir).filter(f=>f.endsWith('.html')).forEach(f=>{
    const slug=f.replace('.html','');
    urls.push(B+'/tools/'+slug);
  });
}
const unique=[...new Set(urls)];

// Update sitemap
const xml='<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+
  unique.map(u=>'  <url><loc>'+u+'</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>').join('\n')+'\n</urlset>';
F.writeFileSync(P.join(CT,'sitemap.xml'),xml);

// Update blog.json (for blog list)
const blogItems=F.readdirSync(blogDir||'/tmp').filter(f=>f.endsWith('.html')).map(f=>{
  const slug=f.replace('.html','');
  const html=F.readFileSync(P.join(blogDir,f),'utf8');
  const title=(html.match(/<title>([^<]+)<\/title>/)||['','Blog'])[1];
  const desc=(html.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"/)||['',''])[1];
  const date=(html.match(/Updated (?:January|February|March|April|May|June|July|August|September|October|November|December) \d+, 202\d/)||[''])[0]||(html.match(/(?:Published|Updated) (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w* \d+,? 202\d/)||[''])[0];
  return{url:'/blog/'+slug,title:title,desc:desc||title,date:date||'2025-06-14',tags:[]};
});
F.writeFileSync(P.join(CT,'blog.json'),JSON.stringify(blogItems,null,2));

// Ping IndexNow (top 10 URLs)
const top10=unique.slice(0,10);
fetch('https://api.indexnow.org/indexnow',{
  method:'POST',
  headers:{'Content-Type':'application/json'},
  body:JSON.stringify({
    host:'automation.songheng.vip',
    key:'61cd3a4a32564707b40b3a86c671cb14',
    keyLocation:B+'/61cd3a4a32564707b40b3a86c671cb14.txt',
    urlList:top10
  })
}).then(r=>r.text()).then(b=>{
  console.log('IndexNow:',unique.length,'URLs in sitemap, submitted',top10.length,', response:',b);
}).catch(e=>console.error('IndexNow err:',e.message));

// Fetch gateway stats
fetch('http://localhost:8080/api/stats/overview').then(r=>r.json()).then(s=>{
  console.log('Gateway stats:',s.total,'requests,',s.premium,'premium,',s.payments,'payments');
}).catch(e=>console.log('Stats err:',e.message));

console.log('Traffic driver done:',unique.length,'URLs');
