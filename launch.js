#!/usr/bin/env node
// Service launcher — kills old, starts fresh, tests everything
try { process.kill(process.pid, 'SIGTERM'); } catch(e){}
setTimeout(() => {
  require('child_process').execSync('pkill -9 -f "node" 2>/dev/null; sleep 0.3', {shell:'/bin/bash'});
  setTimeout(() => {
    require('child_process').execSync('cd /root/automaton && node gateway.cjs > /tmp/gateway.log 2>&1 &', {shell:'/bin/bash'});
    require('child_process').execSync('cd /root/automaton && node /root/services/traffic-engine.js > /tmp/traffic.log 2>&1 &', {shell:'/bin/bash'});
    setTimeout(() => {
      const h = require('http');
      h.get('http://localhost:8080/health', r => { let d=''; r.on('data',c=>d+=c); r.on('end',()=>console.log('Gateway:', d)); }).on('error',e=>console.log('Gateway error:', e.message));
      h.get('http://localhost:3140/health', r => { let d=''; r.on('data',c=>d+=c); r.on('end',()=>console.log('Traffic:', d)); }).on('error',e=>console.log('Traffic error:', e.message));
    }, 2000);
  }, 500);
}, 100);
