#!/usr/bin/env node
/**
 * traffic-recorder.js — Server-side traffic data collector
 * Reads from access logs or direct API calls, stores structured data
 * Can be called by heartbeat every 30 min
 * Output: /root/automaton/data/traffic-records.json
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = '/root/automaton/data';
const FILE = path.join(DATA_DIR, 'traffic-records.json');
const DAILY_FILE = path.join(DATA_DIR, 'daily-stats.json');

// Ensure dir exists
try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch(e) {}

function load(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch(e) { return {}; }
}

function save(file, data) {
  try { fs.writeFileSync(file, JSON.stringify(data, null, 2)); } catch(e) {}
}

// Collect stats
function collect() {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const hour = now.getHours();
  
  // Load current records
  const records = load(FILE);
  if (!records.daily) records.daily = {};
  if (!records.daily[today]) {
    records.daily[today] = { 
      visits: 0, uniquePages: 0, uniqueIPs: 0, 
      hourly: {}, pages: {}, referrers: {}, ips: [] 
    };
  }
  
  // Try to find access from various sources
  // 1. Check if traffic.json exists (from client-side beacons)
  const trafficFile = path.join(DATA_DIR, 'traffic.json');
  try {
    const traffic = JSON.parse(fs.readFileSync(trafficFile, 'utf8'));
    const dayData = traffic.daily && traffic.daily[today];
    if (dayData) {
      records.daily[today].visits = Math.max(records.daily[today].visits, dayData.visits);
      records.daily[today].uniqueIPs = Math.max(records.daily[today].uniqueIPs, dayData.unique);
      if (dayData.ips) {
        dayData.ips.forEach(ip => {
          if (!records.daily[today].ips.includes(ip)) records.daily[today].ips.push(ip);
        });
      }
    }
    records.daily[today].visitors = records.daily[today].ips.length;
  } catch(e) {}
  
  // 2. Check cloudflare access log
  const cfLog = '/var/log/cloudflared.log';
  try {
    if (fs.existsSync(cfLog)) {
      const lines = fs.readFileSync(cfLog, 'utf8').split('\n').filter(l => l.includes(today));
      records.daily[today].cfLogLines = lines.length;
    }
  } catch(e) {}
  
  // 3. Check nginx access log
  const nginxLog = '/var/log/nginx/access.log';
  try {
    if (fs.existsSync(nginxLog)) {
      const lines = fs.readFileSync(nginxLog, 'utf8').split('\n').filter(l => l.includes(today));
      records.daily[today].nginxLines = lines.length;
      
      // Extract pages visited
      lines.forEach(line => {
        const match = line.match(/(?:GET|POST) (\S+)/);
        if (match) {
          const page = match[1];
          records.daily[today].pages[page] = (records.daily[today].pages[page] || 0) + 1;
        }
        const ipMatch = line.match(/^(\S+)/);
        if (ipMatch && !records.daily[today].ips.includes(ipMatch[1])) {
          records.daily[today].ips.push(ipMatch[1]);
        }
      });
      records.daily[today].uniquePages = Object.keys(records.daily[today].pages).length;
    }
  } catch(e) {}
  
  // 4. Check hourly data
  records.daily[today].hourly[hour] = (records.daily[today].hourly[hour] || 0) + 1;
  
  // Count all-time stats
  const allTime = { visits: 0, uniqueIPs: [] };
  Object.values(records.daily || {}).forEach(d => {
    allTime.visits += d.visits || 0;
    if (d.ips) d.ips.forEach(ip => { if (!allTime.uniqueIPs.includes(ip)) allTime.uniqueIPs.push(ip); });
  });
  
  records.allTime = { visits: allTime.visits, uniqueIPs: allTime.uniqueIPs.length };
  records.lastUpdated = now.toISOString();
  
  save(FILE, records);
  
  // Generate daily report
  const daily = {
    date: today,
    ...records.daily[today],
    allTime: records.allTime,
    lastUpdated: records.lastUpdated
  };
  save(DAILY_FILE, daily);
  
  console.log(`Traffic: ${records.allTime.visits} all-time visits, ${records.allTime.uniqueIPs} unique IPs`);
  console.log(`Today: ${records.daily[today]?.visits || 0} visits, ${records.daily[today]?.uniquePages || 0} pages`);
  
  return records;
}

// Run if called directly
if (require.main === module) {
  collect();
}
