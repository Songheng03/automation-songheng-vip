#!/bin/bash
# Persistence setup for my-automaton
# Uses systemd user service or at/schroot as fallback

# Try systemd user service
mkdir -p ~/.config/systemd/user/
cat > ~/.config/systemd/user/ai-gateway.service << 'SERVICEEOF'
[Unit]
Description=my-automaton AI Gateway
After=network.target

[Service]
Type=forking
ExecStart=/root/automaton/scripts/start-revenue.sh
WorkingDirectory=/root/automaton
Restart=on-failure
RestartSec=30

[Install]
WantedBy=default.target
SERVICEEOF

systemctl --user enable ai-gateway.service 2>/dev/null && systemctl --user start ai-gateway.service 2>/dev/null
echo "systemd user service installed (if available)"

# Also write a simple at-job for next boot as fallback
if command -v at &>/dev/null; then
  echo "sleep 30 && /root/automaton/scripts/start-revenue.sh" | at now + 1 minute 2>/dev/null
  echo "at job scheduled"
fi

echo "Persist done"