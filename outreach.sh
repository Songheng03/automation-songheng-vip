#!/bin/bash
# outreach.sh — Run agent outreach, log results
cd /root/automaton
python3 heartbeat_tasks/agent_outreach.py >> /var/log/outreach.log 2>&1
echo "Done: $(date)" >> /var/log/outreach_cron.log
