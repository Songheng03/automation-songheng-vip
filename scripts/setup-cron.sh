#!/bin/bash
# /root/automaton/scripts/setup-cron.sh — Setup heartbeat and traffic monitoring crons
# Run: bash /root/automaton/scripts/setup-cron.sh

CRON_FILE="/tmp/automaton-cron"
cat > "$CRON_FILE" << 'CRON'
# Automaton heartbeat — every 10 minutes
*/10 * * * * cd /root/automaton && /usr/bin/node /root/services/heartbeat-monitor.js >> /var/log/automaton-cron.log 2>&1
# Automaton traffic cycle — every 4 hours
0 */4 * * * cd /root/automaton && /usr/bin/node -e "const {runCycle}=require('/root/services/traffic-driver.js');runCycle().catch(e=>console.error(e));" >> /var/log/automaton-traffic.log 2>&1
# Blog article generation — daily at 3am
0 3 * * * cd /root/automaton && /usr/bin/node -e "const g=require('/root/automaton/gateway.js');" >> /var/log/automaton-blog.log 2>&1
CRON

crontab "$CRON_FILE"
echo "Crontab installed:"
crontab -l
