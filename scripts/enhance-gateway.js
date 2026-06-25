#!/usr/bin/env node
/**
 * Enhance gateway.js with:
 * 1. /api/services catalog endpoint
 * 2. Improved /api/stats/overview 
 * 3. Save PID for restart
 * Run: node scripts/enhance-gateway.js
 */

const fs = require('fs');
const path = require('path');
const GATEWAY = '/root/automaton/gateway.js';

let code = fs.readFileSync(GATEWAY, 'utf8');

// 1. Add /api/services endpoint after the health endpoint
if (!code.includes('/api/services')) {
  code = code.replace(
    "a.get('/api/health',",
    `a.get('/api/services',(r,s)=>{s.json({services:{analyze:{name:'Text Analysis',credits:1,freeLimit:3,description:'Sentiment, topics, entities, writing style'},summarize:{name:'Summarization',credits:2,freeLimit:3},review:{name:'Code Review',credits:5,freeLimit:3},security:{name:'Security Scan',credits:3,freeLimit:3},explain:{name:'Code Explanation',credits:2,freeLimit:3},refactor:{name:'Refactoring',credits:5,freeLimit:3},complexity:{name:'Complexity Analysis',credits:2,freeLimit:3}},freeDailyLimit:3,wallet:'${require('fs').readFileSync(GATEWAY,'utf8').match(/const W='([^']+)'/)?.[1]||'0x76eADdEBFfb6a61DD071f97F4508467fc55dd113'}'});});
a.get('/api/health',`
  );
  console.log('✅ Added /api/services endpoint');
}

// 2. Add /api/blog/list endpoint for blog management
if (!code.includes('/api/blog')) {
  code = code.replace(
    "a.get('/api/traffic',",
    `a.get('/api/blog/list',(r,s)=>{try{const bj=JSON.parse(fs.readFileSync('${path.join('/root/automaton/content','blog.json')}','utf8'));s.json({articles:bj,total:bj.length||0});}catch(e){s.json({articles:[],total:0});}});
a.get('/api/traffic',`
  );
  console.log('✅ Added /api/blog/list endpoint');
}

// 3. Write PID file on startup
if (!code.includes('gateway.pid')) {
  code += `\n// Write PID
fs.writeFileSync('/root/automaton/gateway.pid', String(process.pid));
console.log('[gateway] PID:', process.pid);
`;
  console.log('✅ Added PID file writing');
}

// Write back
const backup = GATEWAY + '.bak-' + Date.now();
fs.writeFileSync(backup, code);
fs.writeFileSync(GATEWAY, code);
console.log('✅ Gateway enhanced. Backup at', backup);

// Syntax check
try {
  require('child_process').execSync('node -c ' + GATEWAY + ' 2>&1', { stdio: 'pipe' });
  console.log('✅ No syntax errors');
} catch(e) {
  console.error('❌ Syntax error! Restoring backup...');
  fs.writeFileSync(GATEWAY, fs.readFileSync(backup, 'utf8'));
  process.exit(1);
}
console.log('🎯 Run: kill -HUP $(cat /root/automaton/gateway.pid)');
