#!/usr/bin/env node
/**
 * Promotion Runner - Uses the outreach service to generate actual promo posts
 * and logs them. This is the execution engine for driving traffic.
 * 
 * Run: node /root/automaton/scripts/run-promotion.js
 */

const http = require('http');

const OUTREACH_PORT = 3160;
const OUTREACH_HOST = 'localhost';

function outreachGet(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://${OUTREACH_HOST}:${OUTREACH_PORT}${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve({ raw: data }); }
      });
    }).on('error', reject);
  });
}

function outreachPost(path, body) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(body);
    const req = http.request(`http://${OUTREACH_HOST}:${OUTREACH_PORT}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve({ raw: data, status: res.statusCode }); }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function run() {
  console.log('=== PROMOTION RUNNER ===');
  console.log('Time:', new Date().toISOString());
  console.log('');

  // Step 1: Get promotional messages from outreach service
  console.log('📢 Fetching promo messages from outreach service...');
  const msgs = await outreachGet('/api/outreach/messages?count=5');
  console.log(`   Got ${msgs.messages ? msgs.messages.length : 0} messages`);
  
  if (!msgs.messages || msgs.messages.length === 0) {
    console.log('   ⚠ No messages from outreach service');
    return;
  }

  // Step 2: Generate share links for each platform
  const platforms = ['twitter', 'reddit', 'hn', 'linkedin', 'devto'];
  for (const msg of msgs.messages) {
    console.log('');
    console.log(`📝 Message: ${msg.substring(0, 100)}...`);
    
    for (const platform of platforms) {
      try {
        const share = await outreachPost('/api/outreach/share', {
          message: msg,
          platform: platform
        });
        console.log(`   → ${platform}: ${share.shareUrl || share.url || 'shared'}`);
      } catch (e) {
        console.log(`   → ${platform}: error - ${e.message}`);
      }
    }
  }

  // Step 3: Log the promotion run
  const logEntry = {
    timestamp: new Date().toISOString(),
    messagesShared: msgs.messages.length,
    platforms: platforms
  };
  
  console.log('');
  console.log('=== PROMOTION RUN COMPLETE ===');
  console.log(JSON.stringify(logEntry, null, 2));
}

run().catch(e => console.error('Fatal:', e));
