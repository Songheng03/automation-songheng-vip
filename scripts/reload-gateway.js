#!/usr/bin/env node
// reload-gateway.js — Reload gateway without starting new process
// Uses the running gateway's hot-reload endpoint if available, or sends SIGHUP

const F=require('fs');
const H='/root/automaton';
const RJ=H+'/gateway.js';
const runningPort=8080;

async function reload(){
  // Try 1: Call internal reload endpoint
  try{
    const r=await fetch('http://localhost:'+runningPort+'/api/refresh',{method:'POST',timeout:3000});
    if(r.ok){
      const d=await r.json();
      console.log('Hot reload via /api/refresh:',d);
      return;
    }
  }catch(e){}

  // Try 2: Send SIGHUP to gateway process
  try{
    const proc=require('child_process');
    const pgrep=proc.execSync('pgrep -f "node.*gateway.js" 2>/dev/null').toString().trim();
    if(pgrep){
      const pids=pgrep.split('\n').filter(p=>p);
      for(const pid of pids){
        try{
          process.kill(parseInt(pid),'SIGHUP');
          console.log('SIGHUP sent to PID',pid);
        }catch(e){console.log('SIGHUP to',pid,'failed:',e.message);}
      }
    }
  }catch(e){console.log('SIGHUP approach failed:',e.message);}
  
  // Try 3: Reload via the running gateway's Express app
  // Can't do this externally, but we can try fetching the health endpoint
  try{
    const r=await fetch('http://localhost:'+runningPort+'/api/health');
    const d=await r.text();
    console.log('Gateway still alive at :'+runningPort, d.slice(0,100));
    console.log('Routes not live — gateway needs restart with new code');
  }catch(e){
    console.log('Gateway unreachable:',e.message);
  }
}

reload().then(()=>console.log('Reload attempt complete'));
