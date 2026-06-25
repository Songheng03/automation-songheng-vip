#!/usr/bin/env node
// patch-gateway-routes.js — Inject missing static routes into gateway.js
// Run: node /root/automaton/scripts/patch-gateway-routes.js && systemctl restart gateway 2>/dev/null || kill -HUP $(pgrep -f 'node.*gateway')
const F=require('fs'),P=require('path');
const gwPath='/root/automaton/gateway.js';
const CT='/root/automaton/content';
let gw=F.readFileSync(gwPath,'utf8');

// Routes that need static file serving (path -> file)
const staticRoutes={
  '/admin':'admin.html',
  '/backlinks':'backlinks.html',
  '/github-integration':'github-integration.html',
  '/webhooks/docs':'webhooks-docs.html',
  '/tools/json-to-typescript':'tools/json-to-typescript.html',
  '/tools/json-to-csv':'tools/json-to-csv.html',
  '/tools/text-utility':'tools/text-utility.html',
  '/tools/regex-tester':'tools/regex-tester.html',
  '/tools/http-status-codes':'tools/http-status-codes.html',
  '/tools/seo-audit':'tools/seo-audit.html',
  '/tools/code-quality-score':'tools/code-quality-score.html',
  '/tools/badge-generator':'tools/badge-generator.html',
  '/live-demo':'live-demo.html',
  '/monitor':'monitor.html'
};

// Blog articles to add routes for
const blogDir=P.join(CT,'blog');
if(F.existsSync(blogDir)){
  F.readdirSync(blogDir).filter(f=>f.endsWith('.html')).forEach(f=>{
    const slug=f.replace('.html','');
    staticRoutes['/blog/'+slug]='blog/'+f;
  });
}

// Check which routes already exist
const existingGet=[...gw.matchAll(/\.(?:get|post)\(['"`](\/[^'"`]+)['"`]/g)].map(m=>m[1]);

let inserted=0, routeBlock='';
for(const[path,file]of Object.entries(staticRoutes)){
  if(!existingGet.some(e=>path===e||path+'/'===e)){
    routeBlock+=`\na.get('${path}',(r,s)=>{s.sendFile(P.join('${CT}','${file}'))});`;
    inserted++;
  }
}

if(inserted===0){
  console.log('All routes already exist');
  process.exit(0);
}

// Add webhook POST routes too
if(!existingGet.some(e=>e==='/webhooks/github')){
  routeBlock+=`
a.post('/webhooks/github',(r,s)=>{s.status(202).json({ok:true});const b=r.body||{};console.log('GH webhook:',b.repository?.full_name||'?',b.action||b.ref||'?');});
a.post('/webhooks/slack',(r,s)=>{if(r.body?.type==='url_verification')return s.json({challenge:r.body.challenge});s.json({response_type:'ephemeral',text:'my-automaton AI ready'});});
a.post('/webhooks/discord',(r,s)=>{if(r.body?.type===1)return s.json({type:1});s.json({type:4,data:{content:'my-automaton ready'}});});
`;
  inserted+=3;
}

// Insert before module.exports or a.listen
const insertMarkers=['module.exports','a.listen(','app.listen('];
let insertAt=-1;
for(const m of insertMarkers){
  const idx=gw.indexOf(m);
  if(idx!==-1){insertAt=idx;break;}
}
if(insertAt===-1){
  console.log('Cannot find insertion point');
  process.exit(1);
}

gw=gw.slice(0,insertAt)+routeBlock+gw.slice(insertAt);
F.writeFileSync(gwPath,gw);
console.log(`Inserted ${inserted} routes into gateway.js`);
