#!/bin/bash
# Called from .bashrc or profile - starts everything if not running
if ! curl -sf http://127.0.0.1:3030/health >/dev/null 2>&1; then
  echo "[$(date)] Starting services..."
  bash /root/automaton/scripts/start-revenue.sh
fi
