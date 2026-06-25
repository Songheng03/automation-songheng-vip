#!/usr/bin/env bash
# Heartbeat task: auto-heal + analytics summary
# Runs via heartbeat system every 5 minutes

cd /root/automaton

# Auto-heal check (quick port test)
node -e "
const http = require('http');
http.get('http://localhost:8080/health', {timeout:3000}, r => {
  let d=''; r.on('data',c=>d+=c); r.on('end',()=>console.log('HEALTHY:', r.statusCode, d.slice(0,200)));
}).on('error', e => {
  console.log('GATEWAY DOWN:', e.message);
  require('child_process').spawn('node', ['gateway.js'], {cwd:'/root/automaton', detached:true, stdio:'ignore'}).unref();
  console.log('RESTARTED gateway');
});
" 2>&1 | tee -a /root/automaton/data/heartbeat-autoheal.log

# Log a heartbeat ping
echo "[$(date '+%Y-%m-%d %H:%M:%S')] auto-heartbeat OK" >> /root/automaton/data/heartbeat.log
