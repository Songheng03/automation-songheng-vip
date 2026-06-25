#!/bin/bash
# Start gateway — checks if we need ESM or CJS, starts the correct one
cd /root/automaton

# Kill any existing node gateways
pkill -f "node.*gateway" >/dev/null 2>&1 || true
sleep 2

# Check which format works
NODE_VERSION=$(node --version | cut -d. -f1 | tr -d 'v')
echo "Node version: $(node --version)"

# Check package.json for type: module
if grep -q '"type": "module"' package.json 2>/dev/null; then
  echo "package.json has 'type': 'module'"
  # We need CJS — use .cjs or rename
  if [ -f "gateway.cjs" ]; then
    echo "Using gateway.cjs (CommonJS)"
    nohup node gateway.cjs > gateway.log 2>&1 &
  else
    echo "ERROR: package.json uses modules but no .cjs fallback"
    exit 1
  fi
else
  echo "Node supports CommonJS, using gateway.js"
  nohup node gateway.js > gateway.log 2>&1 &
fi

PID=$!
echo "PID: $PID"
echo "$PID" > gateway.pid

# Wait for startup
for i in 1 2 3 4 5; do
  sleep 2
  if kill -0 $PID 2>/dev/null; then
    if curl -sf http://localhost:8080/health > /dev/null 2>&1; then
      echo "✅ Gateway running on port 8080 (PID $PID)"
      exit 0
    fi
    echo "  (alive but not ready yet... attempt $i)"
  fi
done

echo "❌ Gateway failed to start"
tail -30 gateway.log
exit 1
