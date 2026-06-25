#!/usr/bin/env node
// heartbeat-promote.js — Consolidated promotion script
// Runs every 4 hours. Does: sitemap rebuild, IndexNow ping, social posts, stats log.
const F=require('fs'),P=require('path'),C=require('crypto');

const CT='/root/automaton/content';
const LOGD='/root/automaton/data';
const SITE='https://automation.songheng.vip';
const IN_KEY='61cd3a4a32564707b40b3a86c671cb14';
const PROMO=P.join(CT,'promote');
F.mkdirSync(PROMO,{recursive:true});
F.mkdirSync(LOGD,{recursive:true});

function log(m){const t=new Date().toISOString();const s=`[${t}] ${m}`;console.log(s);F.appendFileSync(P.join(LOGD,'promote.log'),s+'\n');}

// 1. Rebuild sitemap from blog.json
function buildSitemap(){
  try{
    let items=[];
    try{items=JSON.parse(F.readFileSync(P.join(CT,'blog.json'),'utf8'));}catch(e){}
    
    const urls=[`${SITE}/`,`${SITE}/blog`,`${SITE}/tools`,`${SITE}/upgrade`,`${SITE}/dashboard`,`${SITE}/admin`,`${SITE}/api-docs`,`${SITE}/api-playground`];
    
    for(const a of items){
      if(a.url)urls.push(`${SITE}${a.url}`);
    }
    
    // Scan tools directory
    const toolsDir=P.join(CT,'tools');
    if(F.existsSync(toolsDir)){
      F.readdirSync(toolsDir).filter(f=>f.endsWith('.html')).forEach(f=>{
        urls.push(`${SITE}/tools/${f.replace('.html','')}`);
      });
    }
    
    const xml=`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...new Set(urls)].map(u=>`  <url><loc>${u}</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>`).join('\n')}
</urlset>`;
    
    F.writeFileSync(P.join(CT,'sitemap.xml'),xml);
    log(`Sitemap: ${new Set(urls).size} URLs`);
    return [...new Set(urls)];
  }catch(e){log(`Sitemap error: ${e.message}`);return [];}
}

// 2. Ping IndexNow
async function pingIndexNow(urls){
  const top10=urls.filter(u=>u.includes('/blog/')).slice(0,5).concat(urls.filter(u=>!u.includes('/blog/')).slice(0,5));
  try{
    const r=await fetch('https://api.indexnow.org/indexnow',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({host:'automation.songheng.vip',key:IN_KEY,keyLocation:`${SITE}/${IN_KEY}.txt`,urlList:top10.slice(0,10)})
    });
    log(`IndexNow: ${r.status} (${top10.slice(0,10).length} URLs)`);
  }catch(e){log(`IndexNow err: ${e.message}`);}
}

// 3. Generate social promo posts
function genPosts(){
  let items=[];
  try{items=JSON.parse(F.readFileSync(P.join(CT,'blog.json'),'utf8'));}catch(e){}
  const top3=items.sort((a,b)=>b.date.localeCompare(a.date)).slice(0,3);
  const date=new Date().toISOString().slice(0,10);
  
  const twitter=top3.map(a=>`${a.title}\n${SITE}${a.url}`).join('\n\n');
  const linkedin=top3.map(a=>`📝 ${a.title}\n${a.summary||a.title}\n${SITE}${a.url}`).join('\n\n');
  F.writeFileSync(P.join(PROMO,`twitter-${date}.md`),twitter);
  F.writeFileSync(P.join(PROMO,`linkedin-${date}.md`),linkedin);
  log(`Social posts: twitter, linkedin for ${date}`);
}

// 4. Fetch stats from gateway
async function getStats(){
  try{
    const r=await fetch('http://localhost:8080/api/stats/overview');
    if(r.ok){const d=await r.json();log(`Stats: ${d.t} total, ${d.p} paid, ${d.f} free, ${d.pmt} payments`);}
  }catch(e){log(`Stats unavailable`);}
}

async function run(){
  log('=== PROMOTE RUN ===');
  const urls=buildSitemap();
  genPosts();
  await pingIndexNow(urls);
  await getStats();
  log('=== PROMOTE DONE ===');
}

run().catch(e=>log(`Fatal: ${e.message}`));
