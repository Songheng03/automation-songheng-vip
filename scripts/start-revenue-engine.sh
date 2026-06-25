#!/usr/bin/env bash
# start-revenue-engine.sh
cd /root/automaton
nohup node services/revenue-engine.mjs > /tmp/revenue-engine.log 2>&1 &
echo $! > /tmp/revenue-engine.pid
echo "Revenue Engine started (PID: $(cat /tmp/revenue-engine.pid))"
