#!/bin/bash
# start-services.sh - Launch gateway and monitoring services
# Auto-starts on boot, restarts on crash

set -e

# Kill any existing gateway
pkill -f "gateway.js" 2>/dev/null || true
sleep 1

# Export environment
if [ -z "$DEEPSEEK_API_KEY" ]; then
  export DEEPSEEK_API_KEY=$(cat /root/.automaton/deepseek-key 2>/dev/null || echo "your-api-key-here")
fi
export PORT=8080

cd /root/automaton

# Ensure data directories exist
mkdir -p /root/automaton/data
mkdir -p /root/automaton/content/blog

# Create SQLite DB if missing
node -e "
const sqlite3 = require('sqlite3');
['seo-meta.db','seo-blog.db','content-marketing.db','audit.db'].forEach(f => {
  const p = '/root/automaton/data/' + f;
  const db = new sqlite3.Database(p);
  db.run('CREATE TABLE IF NOT EXISTS usage (key TEXT PRIMARY KEY, count INTEGER DEFAULT 0)');
  db.close();
  console.log('DB ready:', f);
});
" 2>/dev/null || echo "DB init skipped (sqlite3 may need install)"

# Start gateway with auto-restart loop
while true; do
  echo "[$(date)] Starting gateway on port 8080..."
  node gateway.js 2>&1 | tee -a /root/automaton/data/gateway.log
  echo "[$(date)] Gateway crashed! Restarting in 2s..." | tee -a /root/automaton/data/gateway.log
  sleep 2
done
