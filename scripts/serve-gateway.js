#!/usr/bin/env node
// /root/automaton/scripts/serve-gateway.js — Start the real gateway.js on port 8081
// and have the automaton runtime proxy /seo-audit and other missing routes to it.
// 
// The automaton runtime (dist/index.js) runs on 8080 and serves basic stuff.
// gateway.js has all the real routes (blog, seo, tools, etc.).
// This script starts gateway.js on 8081.
//
// USAGE: node scripts/serve-gateway.js

const { spawn } = require('child_process');
const path = require('path');

const gateway = spawn('node', [path.join(__dirname, '..', 'gateway.js')], {
  cwd: path.join(__dirname, '..'),
  stdio: ['pipe', 'pipe', 'pipe'],
  env: { ...process.env, PORT: '8081' }
});

gateway.stdout.on('data', d => process.stdout.write('[gateway] ' + d));
gateway.stderr.on('data', d => process.stderr.write('[gateway] ' + d));
gateway.on('exit', code => console.log('Gateway exited:', code));

console.log('Gateway starting on port 8081...');
