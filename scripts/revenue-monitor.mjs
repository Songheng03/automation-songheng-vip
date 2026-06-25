import fs from 'fs';

const DATA_DIR = '/root/automaton/data';
const API_KEYS_FILE = '/root/automaton/data/api-keys.json';

function loadApiKeys() {
  try { return JSON.parse(fs.readFileSync(API_KEYS_FILE, 'utf-8')); }
  catch { return {}; }
}

function main() {
  const keys = loadApiKeys();
  const keyCount = Object.keys(keys).length;
  const totalCredits = Object.values(keys).reduce((sum, k) => sum + (k.credits || 0), 0);
  const totalUsed = Object.values(keys).reduce((sum, k) => sum + (k.used || 0), 0);
  const rev = Object.values(keys).reduce((sum, k) => sum + (k.revenue_hkd || 0), 0);
  
  // Check if we have any stats log
  const logFile = '/root/automaton/content/data/revenue-log.jsonl';
  let log = [];
  try { log = fs.readFileSync(logFile, 'utf-8').trim().split('\n').filter(Boolean).map(l => JSON.parse(l)); } catch {}
  
  log.push({ ts: new Date().toISOString(), keys: keyCount, credits: totalCredits, used: totalUsed, revUSD: rev, revUSD: rev * 0.128 });
  
  // Keep last 1000 entries
  if (log.length > 1000) log = log.slice(-1000);
  fs.writeFileSync(logFile, log.map(l => JSON.stringify(l)).join('\n') + '\n');
  
  console.log(`[${new Date().toISOString().slice(11,19)}] $ rev=${rev} keys=${keyCount} cr=${totalCredits} used=${totalUsed}`);
}

main();
