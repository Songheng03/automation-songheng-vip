#!/usr/bin/env node
// Diagnose what's actually serving port 8080
const http = require('http');

// Check what process is on port 8080
require('child_process').exec('ss -tlnp | grep 8080', (err, stdout) => {
  console.log('=== Port 8080 Process ===');
  console.log(stdout || 'No process found');
  
  // Test the health endpoint
  http.get('http://localhost:8080/health', (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
      console.log('=== Health Response ===');
      console.log(data);
    });
  }).on('error', (e) => {
    console.log('Health check error:', e.message);
  });
});
