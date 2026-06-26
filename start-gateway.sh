#!/bin/bash
# Start gateway — kill old process first, then start directly
PORT=8080
fuser -k ${PORT}/tcp 2>/dev/null
sleep 1
cd /root/automaton
export NODE_PATH="/usr/lib/node_modules"
exec /usr/bin/node gateway.cjs