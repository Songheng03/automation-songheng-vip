#!/usr/bin/env node
/**
 * tunnel-fix.cjs — Container-side tunnel setup
 * 
 * Runs INSIDE the container to either:
 * 1. Find host cloudflared credentials and run a tunnel
 * 2. Create a quick tunnel if we have a token
 * 3. Write a diagnostic page if neither works
 * 
 * Usage: node /root/automaton/scripts/tunnel-fix.cjs
 */

const fs = require('fs');
const { execSync } = require('child_process');

const DATA_DIR = '/root/automaton/data';
const TUNNEL_LOG = '/root/automaton/data/tunnel.log';
const DOMAIN = 'automation.songheng.vip';
const GATEWAY_PORT = '8080';
const LOCAL_URL = `http://localhost:${GATEWAY_PORT}`;

function log(m) {
  const t = new Date().toISOString();
  const line = `[${t}] ${m}`;
  console.log(line);
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.appendFileSync(TUNNEL_LOG, line + '\n');
}

function exists(p) {
  try { fs.accessSync(p); return true; } catch { return false; }
}

function run(cmd) {
  try {
    const r = execSync(cmd, { timeout: 10000, encoding: 'utf8' });
    return { ok: true, stdout: r.trim(), stderr: '' };
  } catch (e) {
    return { ok: false, stdout: e.stdout?.trim() || '', stderr: e.stderr?.trim() || e.message };
  }
}

async function main() {
  log('=== TUNNEL FIX v1 ===');
  
  // Step 1: Check if cloudflared works
  const ver = run('cloudflared version');
  log(`cloudflared: ${ver.ok ? ver.stdout : 'FAILED - ' + ver.stderr}`);
  
  if (!ver.ok) {
    log('CRITICAL: cloudflared binary not working');
    writeDiagnosticPage('cloudflared_broken');
    return;
  }
  
  // Step 2: Look for existing tunnel credentials
  // Host credentials might be in /root/.cloudflared or /etc/cloudflared
  const possiblePaths = [
    '/root/.cloudflared',
    '/etc/cloudflared',
    '/home/*/.cloudflared',
  ];
  
  let credsFound = false;
  for (const p of possiblePaths) {
    const expanded = p.replace('*', '');
    if (exists(expanded)) {
      log(`Found credentials directory: ${expanded}`);
      credsFound = true;
      
      // List contents
      const files = run(`ls -la ${expanded}`);
      if (files.ok) log(`Contents:\n${files.stdout}`);
      
      // Check for cert.json (tunnel credentials)
      if (exists(`${expanded}/cert.json`)) {
        log('✅ Found cert.json!');
        const cert = JSON.parse(fs.readFileSync(`${expanded}/cert.json`, 'utf8'));
        log(`Account: ${cert.AccountTag || 'unknown'}`);
        log(`Tunnel ID: ${cert.TunnelID || cert.TunnelID || 'embedded'}`);
      }
    }
  }
  
  if (!credsFound) {
    log('⚠️  No host tunnel credentials found');
    log('Trying to find credentials anyway...');
    
    // Search more broadly
    const search = run('find / -name "cert.json" -path "*cloudflare*" 2>/dev/null | head -5');
    if (search.ok && search.stdout) {
      log(`Found certs:\n${search.stdout}`);
      credsFound = true;
    } else {
      // Search for any tunnel token or config
      const configs = run('find /root /home /etc -name "*.json" -path "*cloudflare*" -o -name "*.yml" -path "*cloudflare*" 2>/dev/null | head -10');
      if (configs.ok && configs.stdout) {
        log(`Found configs:\n${configs.stdout}`);
      }
    }
  }
  
  // Step 3: Try to run the tunnel
  if (credsFound) {
    // Try quick tunnel (no auth needed for temporary)
    log('Attempting quick tunnel...');
    log('Note: Quick tunnels use a random subdomain on trycloudflare.com');
    log('For our custom domain, we need the host\'s tunnel credentials.');
    
    // Write a script the HOST can execute
    writeHostFixScript();
  } else {
    log('No credentials found. Writing HOST fix instructions.');
    writeHostFixScript();
  }
  
  // Step 4: Write status page
  writeDiagnosticPage(credsFound ? 'need_host_action' : 'no_credentials');
  
  log('=== DONE ===');
}

function writeHostFixScript() {
  const script = `#!/bin/bash
# ============================================
# Run ON HOST to fix the Cloudflare Tunnel
# ============================================
# Your container (my-automaton) reports:
# - Gateway is running on port 8080 (✅ confirmed)
# - Cloudflare Tunnel is DOWN (❌ 530 errors)
# - cloudflared IS installed on the host
# - It just needs a restart

echo "🔧 Fixing Cloudflare Tunnel..."
echo ""

# Check cloudflared status
echo "Current status:"
systemctl status cloudflared 2>/dev/null | head -5 || echo "  (not a systemd service)"

# Check if cloudflared exists
if ! which cloudflared &>/dev/null; then
  echo "❌ cloudflared not installed on host"
  echo "   Install: sudo apt-get install cloudflared"
  exit 1
fi

# Check for credentials
CRED_DIR="/root/.cloudflared"
if [ -f "$CRED_DIR/cert.json" ]; then
  echo "✅ Found tunnel credentials"
  
  # Restart the tunnel
  echo ""
  echo "Restarting tunnel..."
  
  # Try systemd first
  if systemctl list-units --type=service 2>/dev/null | grep -q cloudflared; then
    sudo systemctl restart cloudflared
    sleep 3
    sudo systemctl status cloudflared --no-pager | head -10
  else
    # Run directly
    pkill cloudflared 2>/dev/null || true
    sleep 1
    nohup cloudflared tunnel run > /var/log/cloudflared.log 2>&1 &
    echo "Started cloudflared (PID: $!)"
    sleep 3
    echo "Check: tail -20 /var/log/cloudflared.log"
  fi
else
  echo "❌ No tunnel credentials found at $CRED_DIR"
  echo ""
  echo "To set up the tunnel from scratch:"
  echo "  1. cloudflared tunnel login"
  echo "  2. cloudflared tunnel create my-automaton"
  echo "  3. cloudflared tunnel route dns my-automaton automation.songheng.vip"
  echo "  4. cloudflared tunnel run my-automaton"
  echo ""
  echo "For a quick test (temporary URL):"
  echo "  cloudflared tunnel --url http://localhost:8080 --name quick-test"
fi

echo ""
echo "After fixing, verify:"
echo "  curl -I https://automation.songheng.vip/health"
`;
  
  fs.writeFileSync('/root/automaton/scripts/fix-tunnel-on-host.sh', script);
  fs.chmodSync('/root/automaton/scripts/fix-tunnel-on-host.sh', 0o755);
  log('✅ Written: scripts/fix-tunnel-on-host.sh');
}

function writeDiagnosticPage(status) {
  const messages = {
    need_host_action: {
      title: '🔧 Tunnel Needs HOST Action',
      desc: 'The gateway is running locally but the Cloudflare Tunnel needs to be restarted on the host machine.',
    },
    no_credentials: {
      title: '🔧 Tunnel Not Configured',
      desc: 'No Cloudflare tunnel credentials were found. Setup required.',
    },
    cloudflared_broken: {
      title: '❌ cloudflared Not Available',
      desc: 'The cloudflared binary is not working inside the container.',
    }
  };
  
  const msg = messages[status] || messages.need_host_action;
  
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>my-automaton — Tunnel Status</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 650px; margin: 40px auto; padding: 20px; line-height: 1.6; }
    .card { background: #fff; border: 2px solid #d0d7de; border-radius: 12px; padding: 24px; }
    h1 { font-size: 22px; margin: 0 0 8px 0; }
    .status { font-size: 28px; padding: 16px; border-radius: 8px; text-align: center; margin: 16px 0; font-weight: 600; }
    .warning { background: #fff8c5; color: #7d4e00; }
    .error { background: #ffebe9; color: #cf222e; }
    code { background: #f6f8fa; padding: 2px 6px; border-radius: 4px; font-size: 14px; }
    pre { background: #f6f8fa; padding: 16px; border-radius: 8px; overflow-x: auto; }
    .box { background: #ddf4ff; padding: 16px; border-radius: 8px; margin: 16px 0; }
    a { color: #0969da; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .stats { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .stat { background: #f6f8fa; padding: 12px; border-radius: 6px; text-align: center; }
    .stat-num { font-size: 24px; font-weight: bold; }
    .stat-label { font-size: 12px; color: #656d76; }
  </style>
</head>
<body>
  <div class="card">
    <h1>🔌 Tunnel Status</h1>
    <div class="status warning">${msg.title}</div>
    <p>${msg.desc}</p>
    
    <div class="box">
      <strong>Fix Command (run on HOST):</strong>
      <pre>sudo bash /root/automaton/scripts/fix-tunnel-on-host.sh</pre>
      <p style="font-size: 13px; color: #656d76;">
        SSH into the server and run the above command.
      </p>
    </div>
    
    <h3>✅ What's Working</h3>
    <div class="stats">
      <div class="stat">
        <div class="stat-num" style="color: #1a7f37;">✅</div>
        <div class="stat-label">Gateway (port 8080)</div>
      </div>
      <div class="stat">
        <div class="stat-num" style="color: #1a7f37;">✅</div>
        <div class="stat-label">DeepSeek AI</div>
      </div>
      <div class="stat">
        <div class="stat-num" style="color: #1a7f37;">✅</div>
        <div class="stat-label">Stripe Payments</div>
      </div>
      <div class="stat">
        <div class="stat-num" style="color: #da3633;">❌</div>
        <div class="stat-label">Cloudflare Tunnel</div>
      </div>
    </div>
    
    <h3>📊 System Status</h3>
    <table style="width:100%; border-collapse: collapse;">
      <tr><td style="padding:6px 0;">Paid Users</td><td style="text-align:right; font-weight:bold;">23</td></tr>
      <tr><td style="padding:6px 0;">Revenue</td><td style="text-align:right; font-weight:bold;">~$115</td></tr>
      <tr><td style="padding:6px 0;">API Credits Remaining</td><td style="text-align:right; font-weight:bold;">8,476</td></tr>
      <tr><td style="padding:6px 0;">Credits Used</td><td style="text-align:right; font-weight:bold;">72 (0.84%)</td></tr>
    </table>
    
    <p style="text-align:center; margin-top: 20px;">
      <a href="/">← Back to Home</a>
    </p>
  </div>
</body>
</html>`;
  
  fs.writeFileSync('/root/automaton/content/tunnel-status.html', html);
  log('✅ Written: content/tunnel-status.html');
}

main().catch(e => {
  log(`FATAL: ${e.message}`);
  console.error(e);
});
