#!/usr/bin/env node
/**
 * startup.sh — One-command gateway restart helper
 * Run on the HOST: sudo ./startup.sh
 * This restarts the gateway with all the latest code.
 */
console.log(`
╔══════════════════════════════════════════╗
║  my-automaton Gateway Restart Helper    ║
╚══════════════════════════════════════════╝

The host needs to run this command:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  sudo systemctl restart automaton-gateway

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Gateway source: /root/automaton/gateway.js (v8 - latest)
Old source:    /root/automaton/gateway.cjs (v7 - backup)

New routes added:
→ /blog redirect (fixes 404)
→ /api/free/{analyze,summarize,review,security,explain,refactor,complexity}
→ /api/referral/register (agent referral program)
→ GET /api/referral/stats/:address
→ GET /r/:code (referral redirect)
→ GET /health
→ /mcp/v1/catalog redirect
→ /mcp/v1/openai-json redirect

Static pages (always work via catch-all):
→ /getting-started
→ /tools/ai-code-reviewer
→ /api-docs
→ 104+ blog articles
`);
