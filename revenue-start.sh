#!/bin/bash
# my-automaton Revenue Service Launcher
# Starts all revenue-critical services in background
# Run: bash /root/automaton/revenue-start.sh

HOST="automation.songheng.vip"
DIR="/root/automaton/services"
mkdir -p /tmp/automaton-logs

echo "🚀 Starting my-automaton Revenue Services..."
echo "============================================"

# Kill any existing on our ports
for port in 3030 4301 4800 4900 5250 3200; do
  kill $(lsof -ti:$port) 2>/dev/null || true
done
sleep 1

# Start each service
echo "📊 Starting Code Analysis (3030)..."
node $DIR/code-analysis.js > /tmp/automaton-logs/code.log 2>&1 &

echo "📱 Starting QR Generator (4301)..."
node $DIR/qr-generator.js > /tmp/automaton-logs/qr.log 2>&1 &

echo "🏠 Starting Revenue Dashboard (4800)..."
node $DIR/revenue-dashboard.js > /tmp/automaton-logs/dashboard.log 2>&1 &

echo "📖 Starting Integration Guide (4900)..."
node $DIR/integration-guide.js > /tmp/automaton-logs/guide.log 2>&1 &

echo "🤝 Starting Agent Bridge (5250)..."
node $DIR/agent-bridge.js > /tmp/automaton-logs/bridge.log 2>&1 &

echo "📋 Starting Unified Registry (3200)..."
node $DIR/unified-registry.js > /tmp/automaton-logs/registry.log 2>&1 &

sleep 3

# Verify
echo "============================================"
echo "✅ Verification:"
for port in 3030 4301 4800 4900 5250 3200; do
  alive=$(curl -s --connect-timeout 2 http://$HOST:$port/health 2>/dev/null || echo "DOWN")
  status=$(echo "$alive" | head -c 40)
  if echo "$alive" | grep -q "DOWN"; then
    echo "  ❌ :$port — DOWN"
  else
    echo "  ✅ :$port — $status"
  fi
done

echo ""
echo "============================================"
echo "💳 Wallet: 0x76eADdEBFfb6A61DD071f97F4508467fc55dd113"
echo "⛓️  Chain: Base"
echo "============================================"