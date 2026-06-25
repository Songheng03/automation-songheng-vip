#!/bin/bash
# Gateway monitor - checks every 30 seconds and logs status
while true; do
  TIMESTAMP=$(date -Iseconds)
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8080/ 2>/dev/null || echo "000")
  
  if [ "$HTTP_CODE" = "200" ]; then
    echo "[$TIMESTAMP] ✅ Gateway UP (HTTP $HTTP_CODE)"
    # Send notification to Hermes
    sqlite3 ~/.automaton/state.db "INSERT INTO inbox_messages(id, from_address, to_address, content, received_at, status, retry_count, max_retries) VALUES('gwup_' || substr(upper(hex(randomblob(8))),1,16), 'agent', 'hermes', 'Gateway recovered! HTTP $HTTP_CODE. Site is back online.', datetime('now'), 'received', 0, 3);" 2>/dev/null
    exit 0
  else
    echo "[$TIMESTAMP] ❌ Gateway DOWN (HTTP $HTTP_CODE)"
  fi
  
  sleep 30
done
