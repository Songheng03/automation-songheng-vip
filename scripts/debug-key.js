#!/usr/bin/env node
// Debug script: test API key reading and DeepSeek API call
const fs = require('fs');
const https = require('https');

// Check file existence
console.log('=== File checks ===');
const paths = [
  '/root/.automaton/automaton.json',
  '/root/automaton/automaton.json',
  '/root/automaton/data/deepseek-key'
];
for (const p of paths) {
  try {
    const exists = fs.existsSync(p);
    const size = exists ? fs.statSync(p).size : 0;
    console.log(`${p}: exists=${exists}, size=${size}`);
  } catch(e) {
    console.log(`${p}: ${e.message}`);
  }
}

// Read the actual key
console.log('\n=== Key reading ===');
try {
  const cfg = JSON.parse(fs.readFileSync('/root/.automaton/automaton.json', 'utf-8'));
  const key = cfg.openaiApiKey;
  console.log('openaiApiKey present:', !!key);
  if (key) console.log('  length:', key.length, '  prefix:', key.slice(0, 8) + '...');
  
  // Check all keys
  const allKeys = Object.keys(cfg);
  const keyLike = allKeys.filter(k => k.toLowerCase().includes('key'));
  console.log('key-like fields:', keyLike);
  for (const k of keyLike) {
    console.log(`  ${k}: ${typeof cfg[k]} len=${String(cfg[k]).length} val=${String(cfg[k]).slice(0,10)}...`);
  }
} catch(e) {
  console.log('ERROR reading:', e.message);
}

// Read the rewrite of automaton JSON 
console.log('\n=== /root/automaton/automaton.json ===');
try {
  const cfg2 = JSON.parse(fs.readFileSync('/root/automaton/automaton.json', 'utf-8'));
  console.log('deepseek keys:', Object.keys(cfg2).filter(k => k.toLowerCase().includes('deep') || k.toLowerCase().includes('key')));
} catch(e) {
  console.log('ERROR:', e.message);
}

// Now try the actual DeepSeek API with the key
console.log('\n=== DeepSeek API test ===');
try {
  const key = JSON.parse(fs.readFileSync('/root/.automaton/automaton.json', 'utf-8')).openaiApiKey;
  if (key) {
    const data = JSON.stringify({ model: 'deepseek-chat', messages: [{role:'user', content:'Say hello in one word'}], max_tokens: 20 });
    const opts = {
      hostname: 'api.deepseek.com', path: '/v1/chat/completions', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key, 'Content-Length': Buffer.byteLength(data) }
    };
    console.log('Sending request to api.deepseek.com...');
    const req = https.request(opts, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        console.log('Status:', res.statusCode);
        console.log('Response:', body.slice(0, 500));
      });
    });
    req.on('error', e => console.log('Error:', e.message));
    req.write(data);
    req.end();
  }
} catch(e) {
  console.log('ERROR in API test:', e.message);
}
