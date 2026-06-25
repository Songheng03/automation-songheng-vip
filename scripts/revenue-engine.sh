# my-automaton Revenue Engine
# Runs every 15 minutes: checks health, promotes content, tracks conversions

BASE_URL="https://automation.songheng.vip"
DATA_DIR="/root/automaton/data"

echo "[$(date)] Revenue Engine Start"

# 1. Health check
HEALTH=$(curl -sf $BASE_URL/health 2>&1)
if [ $? -ne 0 ]; then
  echo "Gateway DOWN! Restarting..."
  cd /root/automaton && nohup node gateway.cjs > /tmp/gw.log 2>&1 &
  sleep 2
fi

# 2. Sitemap ping
curl -sf "https://www.google.com/ping?sitemap=$BASE_URL/sitemap.xml" -o /dev/null && echo "Google pinged"
curl -sf "https://www.bing.com/ping?sitemap=$BASE_URL/sitemap.xml" -o /dev/null && echo "Bing pinged"

# 3. IndexNow
KEY=$(cat $DATA_DIR/indexnow-key.txt 2>/dev/null || echo "default")
curl -sf "https://api.indexnow.org/indexnow?url=$BASE_URL&key=$KEY" -o /dev/null && echo "IndexNow sent"

# 4. Log revenue state
curl -sf "$BASE_URL/api/stats/overview" -o /tmp/latest-stats.json 2>/dev/null
if [ -f /tmp/latest-stats.json ]; then
  REQUESTS=$(python3 -c "import json;d=json.load(open('/tmp/latest-stats.json'));print(d.get('total_stats',{}).get('requests',0))" 2>/dev/null || echo "0")
  REVENUE=$(python3 -c "import json;d=json.load(open('/tmp/latest-stats.json'));print(d.get('total_stats',{}).get('revenue_hkd',0))" 2>/dev/null || echo "0")
  echo "Stats: $REQUESTS requests, HK$REVENUE revenue"
fi

echo "[$(date)] Revenue Engine Complete"
