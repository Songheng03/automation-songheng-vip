# 🚀 Cloudflare Tunnel Fix — 5-Minute Guide

> **Problem**: `https://automation.songheng.vip` returns **530 error** (Cloudflare can't reach origin)
> **Root cause**: Cloudflare Tunnel (Argo) endpoint is disconnected — DNS points to a tunnel that doesn't exist
> **Fix**: Start cloudflared on the HOST (NOT inside Docker) with the correct tunnel config

## ⚡ Quick Fix (try this first)

Run on the **HOST** (not inside the container):

```bash
# 1. Check if cloudflared exists
which cloudflared || (curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o /usr/local/bin/cloudflared && chmod +x /usr/local/bin/cloudflared)

# 2. Start a quick tunnel (test if it works)
cloudflared tunnel --url http://localhost:8080

# 3. If that works, you'll see a trycloudflare.com URL.
#    Verify the gateway is reachable locally first:
curl -s http://localhost:8080/health
```

## 🏗️ Permanent Fix (systemd service)

### Option A: Quick Tunnel (no config)

```bash
# Create a systemd service for quick tunnel
cat > /etc/systemd/system/cloudflared.service << 'SERVICEEOF'
[Unit]
Description=Cloudflare Tunnel (quick)
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/cloudflared tunnel --url http://localhost:8080
Restart=always
RestartSec=5
User=root

[Install]
WantedBy=multi-user.target
SERVICEEOF

systemctl daemon-reload
systemctl enable cloudflared
systemctl start cloudflared
journalctl -u cloudflared -n 20 --no-pager
```

Then update your DNS:
1. Go to https://dash.cloudflare.com
2. Find `automation.songheng.vip`
3. Click **DNS** → Add Record
4. Type: `CNAME`, Name: `automation`, Target: `<your-trycloudflare-url>` (or set up Argo tunnel)
5. Save — wait 1-2 minutes

### Option B: Named Tunnel (recommended)

```bash
# Login to Cloudflare
cloudflared tunnel login

# Create a named tunnel
cloudflared tunnel create automaton-tunnel

# Create config
cat > ~/.cloudflared/config.yml << 'CONFEOF'
tunnel: automaton-tunnel
credentials-file: /root/.cloudflared/automaton-tunnel.json
ingress:
  - hostname: automation.songheng.vip
    service: http://localhost:8080
  - service: http_status:404
CONFEOF

# Route DNS
cloudflared tunnel route dns automaton-tunnel automation.songheng.vip

# Install as service
cloudflared service install

# Start
systemctl start cloudflared
```

## 🔍 Verification

```bash
# Check the tunnel is running
curl -s -o /dev/null -w "%{http_code}" https://automation.songheng.vip/

# Check local gateway
curl -s http://localhost:8080/health

# Full status check
curl -s https://automation.songheng.vip/health
```

## 🆘 If still 530

1. Check Cloudflare Dashboard → DNS → `automation.songheng.vip` record exists
2. Check Cloudflare Dashboard → Zero Trust → Tunnels → tunnel is connected
3. Try `curl -v https://automation.songheng.vip/` for detailed error
4. Make sure no firewall is blocking cloudflared egress (UDP 7844, TCP 443)

## ✅ Success looks like

```
$ curl -s https://automation.songheng.vip/ | head -5
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>my-automaton</title>
```

---

**Speed tip**: Option A (Quick Tunnel) takes < 60 seconds and is enough to verify. Do that first.
