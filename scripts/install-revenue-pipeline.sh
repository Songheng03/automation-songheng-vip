#!/bin/bash
# ==============================================================
# Install Revenue Pipeline
# Configures gateway to proxy /v1/* to AI service on port 3030
# Sets up PM2 to keep everything running
# ==============================================================

set -e
cd /root/automaton

echo "=== Installing Revenue Pipeline ==="

# 1. Kill any existing AI service
pkill -f "gateway-integration" 2>/dev/null || true

# 2. Extract DeepSeek key
KEY=""
if [ -f automaton.json ]; then
  KEY=$(python3 -c "import json; print(json.load(open('automaton.json')).get('DEEPSEEK_API_KEY',''))" 2>/dev/null || echo "")
fi
if [ -z "$KEY" ]; then
  KEY=$(node -e "try{const j=require('./automaton.json');console.log(j.DEEPSEEK_API_KEY||j.deepseek_key||'')}catch(e){}" 2>/dev/null || echo "")
fi

echo "DeepSeek key: ${KEY:0:8}... (${#KEY} chars)"
mkdir -p /root/automaton/data
echo -n "$KEY" > /root/automaton/data/deepseek-key

# 3. Write environment file for node services
cat > /root/automaton/data/ai-config.json << 'JSONEOF'
{
  "DEEPSEEK_API_KEY": "__KEY__",
  "wallet": "0x76eADdEBFfb6A61DD071f97F4508467fc55dd113",
  "freeLimit": 3,
  "prices": {
    "analyze": 1,
    "summarize": 2,
    "review": 5,
    "security": 3,
    "explain": 2,
    "refactor": 5,
    "complexity": 2,
    "render": 3
  }
}
JSONEOF
sed -i "s/__KEY__/$KEY/g" /root/automaton/data/ai-config.json

# Make sure payment data dir exists
mkdir -p /root/automaton/data/payments

# 4. Install PM2 if needed
if ! command -v pm2 &>/dev/null; then
  echo "Installing PM2..."
  npm install -g pm2 --silent 2>/dev/null || true
fi

# 5. Start the AI service
echo "Starting AI service on port 3030..."
nohup node /root/services/gateway-integration.js > /root/automaton/data/ai-service.log 2>&1 &
echo $! > /root/automaton/data/ai-service.pid
sleep 2

# 6. Test the service
echo "Testing AI service..."
curl -s http://127.0.0.1:3030/health
echo ""

# Make a test AI call
echo "Testing AI inference..."
curl -s http://127.0.0.1:3030/v1/analyze \
  -H "Content-Type: application/json" \
  -d '{"text":"What is 2+2? Answer briefly."}' 2>&1
echo ""

# 7. Ensure gateway runs the proxy
if ! grep -q "3030" /root/automaton/gateway.js 2>/dev/null; then
  echo "WARNING: Gateway does not proxy to port 3030."
  echo "Add this to gateway.js before the 402 handler:"
  echo '  // Proxy to AI service'
  echo '  if (p.startsWith("/v1/") && req.method === "POST") {'
  echo '    const proxy = require("http").request({host:"127.0.0.1",port:3030,path:p,method:"POST",headers:req.headers}, pr => { pr.pipe(res); });'
  echo '    req.pipe(proxy);'
  echo '    return;'
  echo '  }'
fi

echo ""
echo "=== Installation Complete ==="
echo "AI Service: http://127.0.0.1:3030"
echo "Health:     curl http://127.0.0.1:3030/health"
echo "Stats:      curl http://127.0.0.1:3030/stats"
echo "Catalog:    curl http://127.0.0.1:3030/catalog"
echo ""
echo "Test an endpoint:"
echo "  curl -X POST http://127.0.0.1:3030/v1/analyze -H 'Content-Type: application/json' -d '{\"text\":\"Your text here\"}'"
