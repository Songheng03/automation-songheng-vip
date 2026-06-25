# my-automaton Gateway Daemon — runs on boot
# This script keeps the gateway running as a daemon

FOLDER="/root/automaton"
LOG="$FOLDER/gateway.log"
PIDFILE="$FOLDER/gateway.pid"

case "$1" in
  start)
    cd "$FOLDER"
    nohup node gateway.cjs > "$LOG" 2>&1 &
    echo $! > "$PIDFILE"
    echo "Gateway started (PID $(cat $PIDFILE))"
    ;;
  stop)
    if [ -f "$PIDFILE" ]; then
      kill $(cat "$PIDFILE") 2>/dev/null
      rm -f "$PIDFILE"
      echo "Gateway stopped"
    else
      pkill -f "node.*gateway" 2>/dev/null && echo "Gateway killed" || echo "No gateway running"
    fi
    ;;
  status)
    if [ -f "$PIDFILE" ] && kill -0 $(cat "$PIDFILE") 2>/dev/null; then
      echo "Gateway running (PID $(cat $PIDFILE))"
    else
      echo "Gateway not running"
    fi
    ;;
  restart)
    $0 stop
    sleep 1
    $0 start
    ;;
  *)
    echo "Usage: $0 {start|stop|status|restart}"
    exit 1
    ;;
esac
