#!/bin/bash
# kill-gateway.sh — Definitively kill ALL old gateway processes and start v6
# This is a standalone script that does not depend on pm2 or systemd

echo "=== Phase 1: Kill all Node.js processes ==="
# Kill ALL node processes
killall -9 node 2>/dev/null
killall -9 npm 2>/dev/null
sleep 2

echo "=== Phase 2: Free port 8080 ==="
fuser -k 8080/tcp 2>/dev/null
sleep 1

echo "=== Phase 3: Remove old gateway files ==="
# Rename old gateway so it can't be restarted
mv /root/automaton/gateway.cjs /root/automaton/gateway.cjs.bak 2>/dev/null
mv /root/automaton/gateway.js /root/automaton/gateway.js.bak 2>/dev/null
mv /root/services/gateway.cjs /root/services/gateway.cjs.bak 2>/dev/null

# Remove any autostart mechanisms
rm -f /root/.pm2/dump.pm2 2>/dev/null
rm -f /etc/systemd/system/pm2-* 2>/dev/null
rm -f /etc/systemd/system/gateway* 2>/dev/null
rm -f /root/automaton/node_modules/.package-lock.json 2>/dev/null

echo "=== Phase 4: Start v6 gateway ==="
cd /root/services
nohup node gateway-v6.js > /tmp/gateway-v6.log 2>&1 &
V6PID=$!
echo "Gateway v6 PID: $V6PID"
echo $V6PID > /var/run/gateway-v6.pid

sleep 3

echo "=== Phase 5: Verify ==="
echo "--- Homepage: $(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8080/ 2>/dev/null || echo 'FAIL')"
echo "--- Tools: $(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8080/tools 2>/dev/null || echo 'FAIL')"
echo "--- Blog: $(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8080/blog 2>/dev/null || echo 'FAIL')"
echo "--- Sitemap: $(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8080/sitemap.xml 2>/dev/null || echo 'FAIL')"
echo "--- Upgrade: $(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8080/upgrade 2>/dev/null || echo 'FAIL')"
echo "--- Text Utility: $(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8080/tools/text-utility 2>/dev/null || echo 'FAIL')"
echo "--- Health: $(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8080/health 2>/dev/null || echo 'FAIL')"
echo "=== Done ==="
