#!/usr/bin/env node
/**
 * heartbeat-promote.js — Self-promotion heartbeat for my-automaton
 * 
 * Runs periodically to:
 * 1. Ping indexNow for SEO
 * 2. Check revenue stats
 * 3. Log promotion status
 * 
 * Schedule: Every 6 hours via modify_heartbeat
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

const LOG_FILE = '/root/automaton/data/promotion-heartbeat.json';
const SITE = 'https://automation.songheng.vip';
const INDEXNOW_KEY = '41d6d61623ae4115b39f2a3b75f71e98';

function logEvent(type, data) {
  let log = [];
  try { log = JSON.parse(fs.readFileSync(LOG_FILE, 'utf8')); } catch(e) {}
  log.push({ timestamp: new Date().toISOString(), type, ...data });
  // Keep last 100 entries
  if (log.length > 100) log = log.slice(-100);
  fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2));
  console.log(`[${type}] ${JSON.stringify(data)}`);
}

function pingIndexNow() {
  return new Promise((resolve) => {
    const urls = [
      SITE + '/',
      SITE + '/upgrade',
      SITE + '/api-docs',
      SITE + '/tools',
      SITE + '/blog',
    ];
    
    const body = JSON.stringify({
      host: 'automation.songheng.vip',
      key: INDEXNOW_KEY,
      keyLocation: SITE + '/' + INDEXNOW_KEY + '.txt',
      urlList: urls
    });
    
    const req = https.request({
      hostname: 'api.indexnow.org',
      path: '/indexnow',
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        logEvent('indexnow', { status: res.statusCode, message: res.statusMessage });
        resolve();
      });
    });
    req.on('error', e => {
      logEvent('indexnow_error', { error: e.message });
      resolve();
    });
    req.write(body);
    req.end();
  });
}

async function checkRevenue() {
  try {
    // Check API-keys for usage stats
    const keys = JSON.parse(fs.readFileSync('/root/automaton/api-keys.json', 'utf8'));
    const keyCount = Object.keys(keys).length;
    const totalCredits = Object.values(keys).reduce((sum, k) => sum + (k.credits || 0), 0);
    const totalUsed = Object.values(keys).reduce((sum, k) => sum + (k.used || 0), 0);
    const firstKey = Object.entries(keys)[0];
    
    logEvent('revenue_check', { 
      keys: keyCount, 
      totalCredits, 
      totalUsed,
      hasUsers: keyCount > 0,
      revenueGenerated: firstKey ? 'yes (at least one key created)' : 'none yet'
    });
  } catch(e) {
    logEvent('revenue_check_error', { error: e.message });
  }
}

async function checkSiteUp() {
  return new Promise((resolve) => {
    const req = https.get(SITE + '/api/services', (res) => {
      logEvent('site_health', { status: res.statusCode, ok: res.statusCode === 200 });
      resolve();
    });
    req.on('error', e => {
      logEvent('site_down', { error: e.message });
      resolve();
    });
    req.setTimeout(10000, () => { req.destroy(); logEvent('site_timeout', {}); resolve(); });
  });
}

async function main() {
  console.log('=== Promotion Heartbeat ===');
  console.log('Time:', new Date().toISOString());
  console.log('Site:', SITE);
  
  await pingIndexNow();
  await checkRevenue();
  await checkSiteUp();
  
  console.log('=== Heartbeat Complete ===');
}

main().catch(console.error);
