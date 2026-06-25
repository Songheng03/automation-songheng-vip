#!/bin/bash
# Check what's blocking
echo "=== Checking gateway state ==="
PID=$(pgrep -f "node.*gateway" | head -1)
echo "Current PID: $PID"
echo "Port 8080 in use:"
ss -tlnp | grep 8080 || echo "Port 8080 NOT in use"

# Check if gateway.js has our reload endpoint
grep -q "app.post('/api/reload'" /root/automaton/gateway.js && echo "Reload endpoint: YES" || echo "Reload endpoint: NO"

# Try to hit the reload endpoint on the running gateway
echo "=== Trying reload ==="
curl -s -X POST http://localhost:8080/api/reload 2>/dev/null || echo "No reload endpoint available"

# Check if PORT GUARDIAN is a file or script
which port-guardian 2>/dev/null && echo "PORT GUARDIAN: binary" || echo "PORT GUARDIAN: not a binary"
ls -la /usr/local/bin/port* 2>/dev/null || echo "No port guardian binary found"
