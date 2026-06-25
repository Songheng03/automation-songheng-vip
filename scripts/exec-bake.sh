// exec-bake.sh — Runs the bake script  
node /root/automaton/scripts/bake-all-services.js
echo "---"
echo "Restarting gateway..."
pkill -f "node gateway.js" 2>/dev/null
sleep 1
cd /root/automaton && nohup node gateway.js > gateway.log 2>&1 &
sleep 2
echo "---"
echo "Gateway restart complete. Testing routes..."
curl -s http://localhost:8080/api/seo/status | head -c 200
echo ""
curl -s http://localhost:8080/share | head -c 200
echo ""
curl -s http://localhost:8080/api/shares | head -c 200
echo ""
echo "---DONE---"
