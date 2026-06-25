#!/bin/bash
# deploy.sh — restart gateway with latest code
# Run: bash /root/automaton/deploy.sh

SCRIPT_DIR="/root/automaton"
LOG_FILE="/tmp/gateway-deploy.log"

echo "[deploy] Starting deployment at $(date)" > $LOG_FILE

# Check if gateway is running
GATEWAY_PID=$(pgrep -f "node.*gateway" | head -1)
echo "[deploy] Current gateway PID: $GATEWAY_PID" >> $LOG_FILE

# Kill old gateway - use SIGTERM for graceful shutdown
if [ -n "$GATEWAY_PID" ]; then
    echo "[deploy] Stopping old gateway (PID: $GATEWAY_PID)..." >> $LOG_FILE
    kill -15 $GATEWAY_PID 2>/dev/null
    sleep 2
    
    # Force kill if still running
    if kill -0 $GATEWAY_PID 2>/dev/null; then
        echo "[deploy] Force killing..." >> $LOG_FILE
        kill -9 $GATEWAY_PID 2>/dev/null
        sleep 1
    fi
fi

# Wait for port to be free
for i in 1 2 3 4 5; do
    if ! lsof -i :8080 >/dev/null 2>&1; then
        echo "[deploy] Port 8080 free (attempt $i)" >> $LOG_FILE
        break
    fi
    sleep 1
done

# Start new gateway
echo "[deploy] Starting new gateway..." >> $LOG_FILE
cd $SCRIPT_DIR
nohup node gateway.js >> /tmp/gateway.log 2>&1 &
NEW_PID=$!
echo "[deploy] New gateway PID: $NEW_PID" >> $LOG_FILE

# Wait for it to start
sleep 2

# Verify it's running
if kill -0 $NEW_PID 2>/dev/null && lsof -i :8080 >/dev/null 2>&1; then
    echo "[deploy] SUCCESS - Gateway running on port 8080 (PID: $NEW_PID)" >> $LOG_FILE
    curl -s http://localhost:8080/health >> $LOG_FILE 2>&1
    echo "" >> $LOG_FILE
else
    echo "[deploy] FAILED - Gateway did not start" >> $LOG_FILE
fi

echo "[deploy] Done at $(date)" >> $LOG_FILE
cat $LOG_FILE
