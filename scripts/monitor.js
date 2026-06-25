#!/usr/bin/env node
// monitor.js — Real-time traffic monitor + auto-promotion
// Runs as heartbeat: checks stats, promotes to search engines, logs trends
const F=require('fs'),P=require('path');
const D='/root/automaton/data';
const CT='/root/automaton/content';
const B='https://automation.songheng.vip';
const W='0x76eADdEBFfb6a61DD071f97F4508467fc55dd113';
F.mkdirSync(D,{recursive:true});

const logFile=P.join(D,'monitor.log');
function log(m){
  const t=new Date().toISOString();
  const line=`[${t}] ${m}`;
  F.appendFileSync(logFile,line+'\n');
  console.log(line);
}

const trendsFile=P.join(D,'trends.json');
let trends={daily:{}};
try{trends=JSON.parse(F.readFileSync(trendsFile,'utf8'))}catch(e){}

function saveTrends(){F.writeFileSync(trendsFile,JSON.stringify(trends,null,2));}

// Track daily trend
function trackDay(stats){
  const day=new Date().toISOString().slice(0,10);
  if(!trends.daily[day])trends.daily[day]={total:0,premium:0,free:0,payments:0,uniquePaths:0};
  trends.daily[day].total=Math.max(trends.daily[day].total,stats.total||0);
  trends.daily[day].premium=Math.max(trends.daily[day].premium,stats.premium||0);
  trends.daily[day].free=Math.max(trends.daily[day].free,stats.free||0);
  trends.daily[day].payments=Math.max(trends.daily[day].payments,stats.payments||0);
  trends.daily[day].uniquePaths=Object.keys(stats.byPath||{}).length;
  saveTrends();
  
  // Weekly comparison
  const days=Object.keys(trends.daily).sort();
  if(days.length>=2){
    const today=trends.daily[days[days.length-1]];
    const yesterday=trends.daily[days[days.length-2]];
    log(`Trend: today=${today.total} yesterday=${yesterday.total} change=${((today.total-yesterday.total)/Math.max(yesterday.total,1)*100).toFixed(0)}%`);
  }
}

// Check if we need to ping search engines
function shouldPing(){
  const logContent=F.existsSync(logFile)?F.readFileSync(logFile,'utf8'):'';
  const lastPing=logContent.split('\n').filter(l=>l.includes('INDEXNOW PING')).pop();
  if(!lastPing)return true;
  const match=lastPing.match(/\[([^\]]+)\]/);
  if(!match)return true;
  const lastTime=new Date(match[1]).getTime();
  const hoursAgo=(Date.now()-lastTime)/3600000;
  return hoursAgo>=6;
}

async function run(){
  log('=== MONITOR TICK ===');
  
  // 1. Fetch stats
  let stats={total:0,premium:0,free:0,payments:0,byPath:{}};
  try{
    const r=await fetch('http://localhost:8080/api/stats/overview');
    if(r.ok)stats=await r.json();
  }catch(e){log(`Stats fetch failed: ${e.message}`);}
  
  log(`Stats: ${stats.total} req | ${stats.premium} premium | ${stats.payments} payments | ${Object.keys(stats.byPath||{}).length} paths`);
  
  // 2. Track trends
  trackDay(stats);
  
  // 3. If traffic is growing, log it
  if(stats.total>0){
    log(`Revenue funnel working: ${stats.total} visits → ${stats.premium} premium → ${stats.payments} payments`);
  }
  
  // 4. Ping IndexNow if needed (every 6h)
  if(shouldPing()){
    log('INDEXNOW PING — submitting URLs');
    try{
      const smPath=P.join(CT,'sitemap.xml');
      if(F.existsSync(smPath)){
        const sm=F.readFileSync(smPath,'utf8');
        const urls=[...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]).slice(0,50);
        const res=await fetch('https://api.indexnow.org/indexnow',{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({
            host:'automation.songheng.vip',
            key:'61cd3a4a32564707b40b3a86c671cb14',
            keyLocation:B+'/61cd3a4a32564707b40b3a86c671cb14.txt',
            urlList:urls.slice(0,10)
          })
        });
        log(`IndexNow: ${res.status} (${Math.min(urls.length,10)} URLs)`);
      }
    }catch(e){log(`IndexNow err: ${e.message}`);}
    
    // Also ping Bing + Google
    try{
      const r=await fetch(`https://www.bing.com/ping?sitemap=${B}/sitemap.xml`);
      log(`Bing: ${r.status}`);
    }catch(e){}
    try{
      const r=await fetch(`https://www.google.com/ping?sitemap=${B}/sitemap.xml`);
      log(`Google: ${r.status}`);
    }catch(e){}
  }
  
  // 5. Generate summary report
  const report=[
    `# Traffic Report — ${new Date().toISOString().slice(0,10)}`,
    ``,
    `## Summary`,
    `- Total requests: ${stats.total}`,
    `- Premium calls: ${stats.premium}`,
    `- Free calls: ${stats.free}`,
    `- Payments tracked: ${stats.payments}`,
    `- Unique paths: ${Object.keys(stats.byPath||{}).length}`,
    `- Wallet: ${W}`,
    ``,
    `## Top Paths`,
    ...Object.entries(stats.byPath||{}).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([p,c])=>`- ${p}: ${c}`),
    ``,
    `## Daily Trend`,
    ...Object.entries(trends.daily).slice(-7).map(([d,s])=>`- ${d}: ${s.total} req (${s.premium} premium, ${s.payments} payments)`)
  ].join('\n');
  
  F.writeFileSync(P.join(D,'latest-report.md'),report);
  log('Report saved');
  log('=== MONITOR TICK DONE ===');
}

run().catch(e=>log(`Fatal: ${e.message}`));
