// seo-monitor.cjs — SEO & Indexing Monitor
// Run: node scripts/seo-monitor.cjs

const fs = require('fs');
const http = require('http');
const path = require('path');

const DATA_DIR = '/root/automaton/data';
const CONTENT_DIR = '/root/automaton/content';
const GATEWAY = 'http://localhost:8080';

function log(m) { const l = '['+new Date().toISOString()+'] '+m; console.log(l); try { fs.mkdirSync(DATA_DIR,{recursive:true}); fs.appendFileSync(path.join(DATA_DIR,'seo-monitor.log'),l+'\n'); } catch {} }

const PAGES = ['/','/playground.html','/api-docs.html','/upgrade.html','/dev-toolbox.html','/gateway-status.html','/security-scanner.html','/readme-badges.html','/comparison.html','/blog.html','/sitemap.xml','/robots.txt','/openapi.json'];

function fetchPath(p) {
  return new Promise(function(resolve) {
    var req = http.request({hostname:'localhost',port:8080,path:p,method:'GET',timeout:5000}, function(res) {
      resolve({page:p,status:res.statusCode,ok:res.statusCode===200});
    });
    req.on('error', function(e) { resolve({page:p,status:0,ok:false,error:e.message}); });
    req.end();
  });
}

async function main() {
  log('=== SEO Monitor ===');
  var results = await Promise.all(PAGES.map(fetchPath));
  var ok = results.filter(function(r){return r.ok}).length;
  log(ok+'/'+PAGES.length+' pages OK');
  results.forEach(function(r){if(!r.ok)log('  '+(r.status===404?'❌':'⚠️')+' '+r.page+' -> '+(r.error||r.status))});
  
  var blogCount = 0;
  try { if(fs.existsSync('/root/automaton/content/blog')) blogCount = fs.readdirSync('/root/automaton/content/blog').filter(function(f){return f.endsWith('.html')}).length; } catch {}
  log('Blog articles: '+blogCount);
  
  var report = {timestamp:new Date().toISOString(),pages:{total:PAGES.length,ok:ok,notFound:results.filter(function(r){return r.status===404}).length,errors:results.filter(function(r){return !r.ok&&r.status!==404}).length},blogCount:blogCount,details:results.map(function(r){return{page:r.page,status:r.status,ok:r.ok}}),publicUrl:'https://automation.songheng.vip'};
  fs.mkdirSync(DATA_DIR,{recursive:true});
  fs.writeFileSync(path.join(DATA_DIR,'seo-report.json'),JSON.stringify(report,null,2));
  log('=== Done ===');
}
main().catch(function(e){log('Error: '+e.message)});
