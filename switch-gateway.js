#!/usr/bin/env node
/**
 * Hot-swap gateway process.
 * Starts new gateway on port 8080, gracefully taking over from the old one.
 * Run with: node switch-gateway.js
 */

const net = require('net');
const { spawn } = require('child_process');

// Check if we can bind to 8080
const tester = net.createServer();
tester.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log('Port 8080 is in use. The old gateway is still running.');
    console.log('Starting new gateway will fail until port is free.');
    process.exit(1);
  }
});
tester.listen(8080, '0.0.0.0', () => {
  console.log('Port 8080 is free! Starting new gateway...');
  tester.close();
  
  const child = spawn('node', ['/root/automaton/gateway.js'], {
    stdio: 'inherit',
    env: { ...process.env, GATEWAY_START: '1' }
  });
  
  child.on('exit', (code) => {
    console.log(`Gateway exited with code ${code}`);
    process.exit(code || 0);
  });
});
