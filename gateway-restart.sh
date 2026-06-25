#!/bin/bash
# gateway-restart.sh — Kill old process and start fresh
PID_FILE=/tmp/gateway.pid
OLD_PID=$(cat $PID_FILE 2>/dev/null)
if [ -n "$OLD_PID" ] && kill -0 $OLD_PID 2>/dev/null; then
  echo "Killing old gateway PID $OLD_PID"
  kill $OLD_PID 2>/dev/null
  sleep 2
fi
# Also kill any node process on 8080
for pid in $(ss -tlnp 2>/dev/null | grep ':8080' | grep -oP 'pid=\K[0-9]+'); do
  echo "Killing process $pid on port 8080"
  kill $pid 2>/dev/null
  sleep 1
done
sleep 1
cd /root/automaton
node gateway.cjs &
NEW_PID=$!
echo $NEW_PID > $PID_FILE
sleep 2
echo "Gateway started with PID $NEW_PID"
curl -s http://localhost:8080/health
