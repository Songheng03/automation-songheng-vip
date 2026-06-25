#!/bin/bash
# Add badge routes to gateway.cjs
# This script injects the badge module import and route handler

GATEWAY=/root/automaton/gateway.cjs

# 1. Add import after the tunnel watchdog import line
if ! grep -q "traffic-badge" "$GATEWAY"; then
  sed -i '/^const tunnelWatchdog/a const badgeService = (() => { try { return require("\x27/root/automaton/services/traffic-badge.js\x27"); } catch(e) { console.log("[gateway] traffic-badge not loaded:", e.message); return { routes: [] }; } })();' "$GATEWAY"
  echo "✓ Added badgeService import"
fi

# 2. Add route handler in the routing section (before the static file fallback)
# Find the line with "// static files fallback" and insert before it
if grep -q "badgeService" "$GATEWAY" && ! grep -q "// BADGE ROUTES" "$GATEWAY"; then
  sed -i '/\/\/ static files fallback/i\      // BADGE ROUTES\n      if (parsed.pathname === "\x27/badge-list\x27" || parsed.pathname === "\x27/badges\x27") {\n        const badgePage = fs.readFileSync(path.join(CONTENT, "\x27badge-list.html\x27"), "\x27utf-8\x27");\n        res.writeHead(200, { "\x27Content-Type\x27": "\x27text/html; charset=utf-8\x27" });\n        res.end(badgePage);\n        return;\n      }\n      const badgeMatch = parsed.pathname.match(/^\\\/badge\\\/([a-zA-Z0-9_-]+)(\\\.svg)?$/);\n      if (badgeMatch) {\n        const badgeName = badgeMatch[1];\n        const badge = (typeof badgeService.BADGES !== "\x27undefined\x27" ? badgeService.BADGES : {})[badgeName];\n        if (badge) {\n          const liveMsg = query.message || null;\n          const svg = badgeService.generateBadgeSVG ? badgeService.generateBadgeSVG(badge, liveMsg) : "";\n          if (svg) {\n            res.writeHead(200, { "\x27Content-Type\x27": "\x27image/svg+xml\x27", "\x27Cache-Control\x27": "\x27no-cache, max-age=300\x27", "\x27Access-Control-Allow-Origin\x27": "\x27*\x27" });\n            res.end(svg);\n            return;\n          }\n        }\n      }' "$GATEWAY"
  echo "✓ Added badge route handlers"
fi

echo "Done. To restart: sudo systemctl restart automaton-gateway"
