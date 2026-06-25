#!/usr/bin/env python3
"""
Service Guardian — my-automaton's service health monitor and auto-repair system.
Runs as a daemon. Checks all revenue-critical services every 60 seconds.
Restarts any that fail. Logs everything. Sends heartbeat pings.
"""
import os, sys, time, json, subprocess, logging, signal, threading
from datetime import datetime, timedelta
from pathlib import Path

# ─── Configuration ─────────────────────────────────────────────────
SERVICES = {
    "x402_gateway_8888": {
        "port": 8888, "script": "/root/automaton/gateway_8888.py", "type": "python3",
        "revenue_critical": True, "check_path": "/"
    },
    "promotion_hub_3110": {
        "port": 3110, "script": "/root/automaton/promotion_hub.py", "type": "python3",
        "revenue_critical": True, "check_path": "/"
    },
    "handshake_3120": {
        "port": 3120, "script": "/root/automaton/handshake_server.py", "type": "python3",
        "revenue_critical": False, "check_path": "/api/handshake"
    },
    "referral_3150": {
        "port": 3150, "script": "/root/automaton/referral_server.py", "type": "python3",
        "revenue_critical": True, "check_path": "/api/referral/stats/test"
    },
    "revenue_dashboard_3888": {
        "port": 3888, "script": "/root/automaton/revenue_dashboard.py", "type": "python3",
        "revenue_critical": False, "check_path": "/"
    },
    "compat_layer_4280": {
        "port": 4280, "script": "/root/automaton/compat_layer_4280.py", "type": "python3",
        "revenue_critical": True, "check_path": "/api/catalog"
    },
}

LOG_PATH = "/root/automaton/service_guardian.log"
HEARTBEAT_PATH = "/root/automaton/.guardian_heartbeat"
STATS_PATH = "/root/.automaton/service_stats.json"
CHECK_INTERVAL = 60  # seconds
MAX_FAILURES_BEFORE_ALERT = 3

# ─── Logging ─────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [GUARDIAN] %(levelname)s: %(message)s",
    handlers=[
        logging.FileHandler(LOG_PATH),
        logging.StreamHandler()
    ]
)
log = logging.getLogger("guardian")

# ─── State ────────────────────────────────────────────────────────
class ServiceState:
    def __init__(self):
        self.stats = {}  # service_name -> {uptime, failures, restarts, last_ok, last_fail}
        self.running = True
        self.load_stats()

    def load_stats(self):
        try:
            with open(STATS_PATH) as f:
                self.stats = json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            self.stats = {}

    def save_stats(self):
        os.makedirs(os.path.dirname(STATS_PATH), exist_ok=True)
        with open(STATS_PATH, "w") as f:
            json.dump(self.stats, f, indent=2, default=str)

    def record_check(self, name, ok):
        now = datetime.utcnow().isoformat()
        if name not in self.stats:
            self.stats[name] = {"checks": 0, "failures": 0, "restarts": 0, "last_ok": None, "last_fail": None}
        s = self.stats[name]
        s["checks"] = s.get("checks", 0) + 1
        if ok:
            s["last_ok"] = now
            s["consecutive_failures"] = 0
        else:
            s["failures"] = s.get("failures", 0) + 1
            s["last_fail"] = now
            s["consecutive_failures"] = s.get("consecutive_failures", 0) + 1

    def record_restart(self, name):
        if name not in self.stats:
            self.stats[name] = {"checks": 0, "failures": 0, "restarts": 0}
        self.stats[name]["restarts"] = self.stats[name].get("restarts", 0) + 1

# ─── Health Checks ────────────────────────────────────────────────
def check_port(port):
    """Check if a port is listening."""
    result = subprocess.run(
        ["ss", "-tlnp", f"sport = :{port}"],
        capture_output=True, text=True, timeout=10
    )
    return f"LISTEN" in result.stdout

def check_http(port, path="/"):
    """Check if HTTP service responds."""
    import urllib.request
    try:
        req = urllib.request.Request(f"http://localhost:{port}{path}")
        with urllib.request.urlopen(req, timeout=5) as resp:
            return resp.status == 200
    except Exception:
        return False

def check_process(script):
    """Check if a process for this script is running."""
    result = subprocess.run(
        ["pgrep", "-f", script],
        capture_output=True, text=True, timeout=10
    )
    return result.returncode == 0

def check_service(name, config):
    """Full health check for a service. Returns (ok, detail)."""
    port_ok = check_port(config["port"])
    http_ok = check_http(config["port"], config.get("check_path", "/"))
    proc_ok = check_process(config["script"])

    all_ok = port_ok and http_ok and proc_ok
    detail = f"port={'OK' if port_ok else 'DOWN'} http={'OK' if http_ok else 'DOWN'} proc={'OK' if proc_ok else 'DOWN'}"
    return all_ok, detail

# ─── Restart ──────────────────────────────────────────────────────
def restart_service(name, config):
    """Kill and restart a service."""
    log.warning(f"Restarting {name} on port {config['port']}...")
    
    # Kill existing
    subprocess.run(
        ["pkill", "-f", config["script"]],
        capture_output=True, timeout=10
    )
    time.sleep(2)
    
    # Start new
    log_path = f"/root/automaton/logs/{name}.log"
    os.makedirs("/root/automaton/logs", exist_ok=True)
    
    cmd = ["nohup", "python3", config["script"]]
    with open(log_path, "a") as logfile:
        proc = subprocess.Popen(
            cmd,
            stdout=logfile, stderr=logfile,
            start_new_session=True
        )
    
    time.sleep(3)
    
    # Verify
    if check_port(config["port"]):
        log.info(f"✓ {name} restarted successfully (PID {proc.pid})")
        return True
    else:
        log.error(f"✗ {name} FAILED to restart")
        return False

# ─── Alert ────────────────────────────────────────────────────────
def send_alert(message):
    """Log a critical alert that needs human attention."""
    log.critical(f"⚠️  ALERT: {message}")
    # Write to a well-known alert file
    alert_path = "/root/automaton/.guardian_alert"
    with open(alert_path, "a") as f:
        f.write(f"{datetime.utcnow().isoformat()} - {message}\n")

# ─── Main Loop ────────────────────────────────────────────────────
def guardian_loop():
    """Main guardian loop."""
    state = ServiceState()
    consecutive_global_failures = {}
    
    log.info("=" * 60)
    log.info("Service Guardian starting up")
    log.info(f"Monitoring {len(SERVICES)} services every {CHECK_INTERVAL}s")
    log.info("=" * 60)
    
    cycle = 0
    while state.running:
        cycle += 1
        log.info(f"── Cycle {cycle} ──")
        
        all_ok = True
        for name, config in sorted(SERVICES.items()):
            try:
                ok, detail = check_service(name, config)
                state.record_check(name, ok)
                
                if ok:
                    log.info(f"  ✓ {name} on :{config['port']} — {detail}")
                else:
                    all_ok = False
                    log.warning(f"  ✗ {name} on :{config['port']} — {detail}")
                    
                    # Track consecutive failures
                    prev = consecutive_global_failures.get(name, 0)
                    consecutive_global_failures[name] = prev + 1
                    
                    if consecutive_global_failures[name] >= 2:
                        # Attempt restart
                        result = restart_service(name, config)
                        state.record_restart(name)
                        consecutive_global_failures[name] = 0
                        
                        if not result and config.get("revenue_critical", False):
                            send_alert(f"CRITICAL: {name} failed to restart after {consecutive_global_failures.get(name, 0)} attempts!")
                else:
                    # Reset failure counter on success
                    consecutive_global_failures[name] = 0
                    
            except Exception as e:
                log.error(f"Error checking {name}: {e}")
        
        # Write heartbeat
        heartbeat = {
            "timestamp": datetime.utcnow().isoformat(),
            "cycle": cycle,
            "services_ok": sum(1 for n in SERVICES if consecutive_global_failures.get(n, 0) == 0),
            "services_total": len(SERVICES),
            "all_healthy": all_ok
        }
        with open(HEARTBEAT_PATH, "w") as f:
            json.dump(heartbeat, f)
        
        # Save stats every 5 cycles
        if cycle % 5 == 0:
            state.save_stats()
        
        # Sleep
        time.sleep(CHECK_INTERVAL)

def signal_handler(sig, frame):
    log.info("Shutting down...")
    sys.exit(0)

if __name__ == "__main__":
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    if "--daemon" in sys.argv:
        # Fork into background
        pid = os.fork()
        if pid > 0:
            print(f"Guardian started (PID {pid})")
            sys.exit(0)
    
    guardian_loop()
