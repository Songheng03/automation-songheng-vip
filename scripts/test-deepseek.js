#!/usr/bin/env node
// DIAGNOSTIC: Test that the API key works with DeepSeek
const https = require('https');
const fs = require('fs');

// Read key exactly as the service does
const cfg = JSON.parse(fs.readFileSync('/root/.automaton/automaton.json', 'utf-8'));
const key = cfg.openaiApiKey || '';

console.log('Key found:', key ? 'YES (' + key.length + ' chars)' : 'NO');
console.log('Key starts with:', key.slice(0, 12));

const data = JSON.stringify({
  model: 'deepseek-chat',
  messages: [{ role: 'user', content: 'Say hello in one word.' }],
  max_tokens: 50,
  temperature: 0.3
});

const opts = {
  hostname: 'api.deepseek.com',
  path: '/v1/chat/completions',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + key,
    'Content-Length': Buffer.byteLength(data)
  }
};

const req = https.request(opts, res => {
  let body = '';
  res.on('data', c => body += c);
  res.on('end', () => {
    try {
      const j = JSON.parse(body);
      console.log('Response:', j.choices?.[0]?.message?.content || JSON.stringify(j).slice(0, 200));
    } catch(e) {
      console.log('Raw response:', body.slice(0, 300));
    }
  });
});
req.on('error', e => console.log('FAILED:', e.message));
req.write(data);
req.end();
