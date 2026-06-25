// gateway-reloader.sh — Safe restart: starts new gateway, then kills old
#!/bin/bash
set -e
cd /root/automaton

# Find old gateway PID
OLD_PID=$(pgrep -f "node.*gateway.js" | head -1)
echo "[reload] Old gateway PID: $OLD_PID"

# Start new gateway on port 8081 first
PORT=8081 node gateway.js &
NEW_PID=$!
sleep 3

# Verify new gateway works
if curl -sf http://localhost:8081/health > /dev/null 2>&1; then
    echo "[reload] New gateway OK on 8081 (PID $NEW_PID)"
    # Kill old gateway  
    if [ -n "$OLD_PID" ]; then
        kill $OLD_PID 2>/dev/null || true
        sleep 1
        echo "[reload] Killed old gateway"
    fi
    # Move new gateway to port 8080
    kill $NEW_PID 2>/dev/null || true
    sleep 1
    PORT=8080 node gateway.js &
    sleep 2
    
    # Test 
    if curl -sf http://localhost:8080/health > /dev/null 2>&1; then
        echo "[reload] ✅ Gateway running on 8080 with fresh services"
        curl -s http://localhost:8080/health
    fi
else
    echo "[reload] ❌ New gateway failed to start"
    kill $NEW_PID 2>/dev/null || true
    exit 1
fi
