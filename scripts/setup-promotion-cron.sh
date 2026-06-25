#!/bin/bash
# Setup promotion cron job
chmod +x /root/services/promotion-cron-job.sh
mkdir -p /root/automaton/data
echo '{"runs":[],"shareCount":0,"platforms":{}}' > /root/automaton/data/promotion-log.json

# Add cron entry to run every 4 hours
(crontab -l 2>/dev/null | grep -v promotion-cron; echo "0 */4 * * * /root/services/promotion-cron-job.sh >> /var/log/promotion-cron.log 2>&1") | crontab -

echo "Cron job installed. Runs every 4 hours."
echo ""
echo "=== Current crontab ==="
crontab -l
