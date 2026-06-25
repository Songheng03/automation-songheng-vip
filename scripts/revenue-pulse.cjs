// revenue-pulse.cjs — Revenue & Payment Monitor
// Run: node scripts/revenue-pulse.cjs

const fs = require('fs');
const http = require('http');
const path = require('path');

const DATA_DIR = '/root/automaton/data';
const HISTORY_FILE = path.join(DATA_DIR, 'revenue-history.json');
const API_KEYS_FILE = '/root/automaton/api-keys.json';
const LOG_FILE = path.join(DATA_DIR, 'revenue-pulse.log');

function log(m) { const l='['+new Date().toISOString()+'] '+m; console.log(l); try{fs.mkdirSync(DATA_DIR,{recursive:true});fs.appendFileSync(LOG_FILE,l+'\n')}catch{} }

function rj(p,d){try{return JSON.parse(fs.readFileSync(p,'utf-8'))}catch{return d}}

function analyzeKeys() {
  var db = rj(API_KEYS_FILE,{});
  var keys = Object.keys(db);
  var totalRev = 0, totalSold = 0, totalRemain = 0, totalUsed = 0;
  var tiers = {};
  keys.forEach(function(k) {
    var e = db[k];
    var PRICES = {price_starter:{p:5,c:500},price_advanced:{p:10,c:1100},price_pro:{p:25,c:3000},price_ultimate:{p:50,c:6500}};
    var t = PRICES[e.price_id];
    if(t) { totalRev += t.p; totalSold += t.c; tiers[e.price_id] = (tiers[e.price_id]||0)+1; }
    totalRemain += e.credits||0;
    totalUsed += e.used||0;
  });
  return {total_keys:keys.length,revenue:totalRev,credits_remaining:totalRemain,credits_sold:totalSold,used:totalUsed,tiers:tiers};
}

async function checkHealth() {
  return new Promise(function(resolve) {
    var req = http.request({hostname:'localhost',port:8080,path:'/health',method:'GET',timeout:5000}, function(res) {
      var b = ''; res.on('data',function(c){b+=c}); res.on('end',function(){resolve({healthy:true,data:b.substring(0,200)})});
    });
    req.on('error',function(e){resolve({healthy:false,error:e.message})});
    req.end();
  });
}

async function main() {
  log('=== Revenue Pulse ===');
  var health = await checkHealth();
  log('Gateway: '+(health.healthy?'✅':'❌'));
  var kd = analyzeKeys();
  log('API Keys: '+kd.total_keys+' | Revenue: $'+kd.revenue.toFixed(2)+' | Credits: '+kd.credits_remaining+' remaining');
  if(kd.revenue===0) log('⚠️ ZERO REVENUE — No paying users yet.');
  
  var history = rj(HISTORY_FILE,[]);
  history.push({timestamp:new Date().toISOString(),healthy:health.healthy,...kd});
  if(history.length>1000) history.splice(0,history.length-1000);
  fs.mkdirSync(DATA_DIR,{recursive:true});
  fs.writeFileSync(HISTORY_FILE,JSON.stringify(history,null,2));
  
  if(history.length>=2) {
    var first=history[0], last=history[history.length-1];
    var dRev=(last.revenue||0)-(first.revenue||0);
    var span=(new Date(last.timestamp)-new Date(first.timestamp))/(86400000)||1;
    log('Trend: $'+dRev.toFixed(2)+' change ($'+(dRev/span).toFixed(2)+'/day)');
  }
  log('=== Done ===');
}
main().catch(function(e){log('Error: '+e.message)});
