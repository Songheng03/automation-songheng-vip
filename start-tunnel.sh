#!/bin/bash
# Cloudflare Tunnel startup script
# Run this to establish a tunnel from localhost:8080 to trycloudflare.com
# No auth required - uses ephemeral quick tunnel

echo "Starting Cloudflare Tunnel to localhost:8080..."
nohup cloudflared tunnel --url http://localhost:8080 > /root/automaton/tunnel.log 2>&1 &
echo "Tunnel PID: $!"
echo "Check /root/automaton/tunnel.log for the tunnel URL"
echo "To find the URL: grep -o 'https://[a-z-]*\.trycloudflare\.com' /root/automaton/tunnel.log | head -1"
